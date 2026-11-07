use lemno_application::VocabularyService;
use lemno_domain::{DEFAULT_PROFILE_ID, Error, VocabularyInput};
use lemno_infrastructure::SqliteVocabularyRepository;
use rusqlite::{Connection, params};
use uuid::Uuid;

struct Database(std::path::PathBuf);

impl Database {
    fn new() -> Self {
        Self(std::env::temp_dir().join(format!("lemno-{}.sqlite3", Uuid::new_v4())))
    }
    fn service(&self) -> VocabularyService<SqliteVocabularyRepository> {
        VocabularyService(SqliteVocabularyRepository::open(&self.0).unwrap())
    }
}

impl Drop for Database {
    fn drop(&mut self) {
        for suffix in ["", "-wal", "-shm"] {
            let _ = std::fs::remove_file(format!("{}{suffix}", self.0.display()));
        }
    }
}

fn input(text: &str, explanation: &str) -> VocabularyInput {
    VocabularyInput {
        text: text.to_owned(),
        explanation: explanation.to_owned(),
        example_text: "  I really appreciate your help.  ".to_owned(),
    }
}

#[test]
fn persists_across_reopens_and_keeps_same_spelling_with_different_meanings() {
    let db = Database::new();
    {
        let service = db.service();
        let first = service
            .create(DEFAULT_PROFILE_ID, input("  bank  ", "銀行"))
            .unwrap();
        assert_eq!(first.text, "bank");
        assert_eq!(first.example_text, "I really appreciate your help.");
        assert_eq!(
            (first.memory_level, first.review_count, first.usage_count),
            (0, 0, 0)
        );
        let second = service
            .create(DEFAULT_PROFILE_ID, input("bank", "土手"))
            .unwrap();
        assert_ne!(first.id, second.id);
        assert!(first.created_at.ends_with('Z'));
    }
    let items = db.service().list(DEFAULT_PROFILE_ID).unwrap();
    assert_eq!(items.len(), 2);
    assert_eq!(items[0].explanation, "土手");
}

#[test]
fn validation_rejects_blank_and_oversized_input_without_writing() {
    let db = Database::new();
    let service = db.service();
    for value in [
        input("\u{3000}\n ", "意味"),
        input("word", " \t"),
        input(&"a".repeat(201), "意味"),
        input("word", &"語".repeat(2001)),
    ] {
        assert!(matches!(
            service.create(DEFAULT_PROFILE_ID, value),
            Err(Error::Validation(_))
        ));
    }
    let mut long_example = input("word", "意味");
    long_example.example_text = "x".repeat(2001);
    assert!(matches!(
        service.create(DEFAULT_PROFILE_ID, long_example),
        Err(Error::Validation(_))
    ));
    assert!(service.list(DEFAULT_PROFILE_ID).unwrap().is_empty());
    assert!(
        service
            .create("missing-profile", input("word", "意味"))
            .is_err()
    );
    let connection = Connection::open(&db.0).unwrap();
    let states: i64 = connection
        .query_row("SELECT COUNT(*) FROM review_states", [], |r| r.get(0))
        .unwrap();
    assert_eq!(states, 0);
}

#[test]
fn updates_preserve_history_and_deletes_cascade_without_deleting_sessions() {
    let db = Database::new();
    let service = db.service();
    let item = service
        .create(DEFAULT_PROFILE_ID, input("appreciate", "感謝する"))
        .unwrap();
    let connection = Connection::open(&db.0).unwrap();
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .unwrap();
    connection
        .execute(
            "UPDATE review_states SET memory_level = 2 WHERE learning_item_id = ?1",
            [&item.id],
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO review_records VALUES ('review', ?1, 3, 2, NULL, '2026-11-07T00:00:00Z')",
            [&item.id],
        )
        .unwrap();
    for session in ["one", "two", "pending"] {
        connection.execute("INSERT INTO conversation_sessions (id, profile_id, status, occurred_at) VALUES (?1, 'default-en', ?2, ?3)", params![session, if session == "pending" { "preparing" } else { "recorded" }, if session == "pending" { None } else { Some("2026-11-07T00:00:00Z") }]).unwrap();
        connection.execute("INSERT INTO usage_records (session_id, learning_item_id, profile_id, ai_usage_count, manual_usage_count, recorded_at) VALUES (?1, ?2, 'default-en', 3, ?3, '2026-11-07T00:00:00Z')", params![session, item.id, if session == "one" { Some(0) } else { None }]).unwrap();
    }
    let updated = service
        .update(
            DEFAULT_PROFILE_ID,
            &item.id,
            input("appreciated", "ありがたく思った"),
        )
        .unwrap();
    assert_eq!(updated.created_at, item.created_at);
    assert_eq!(
        (
            updated.memory_level,
            updated.review_count,
            updated.usage_count
        ),
        (2, 1, 3)
    );
    service.delete(DEFAULT_PROFILE_ID, &item.id).unwrap();
    for table in [
        "learning_items",
        "review_states",
        "review_records",
        "usage_records",
    ] {
        let count: i64 = connection
            .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0, "{table}");
    }
    let sessions: i64 = connection
        .query_row("SELECT COUNT(*) FROM conversation_sessions", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(sessions, 3);
}

#[test]
fn scopes_mutations_to_profile_and_word_kind_and_handles_sql_as_text() {
    let db = Database::new();
    let service = db.service();
    let item = service
        .create(
            DEFAULT_PROFILE_ID,
            input("'; DROP TABLE learning_items; --", "<script> & 日本語"),
        )
        .unwrap();
    let connection = Connection::open(&db.0).unwrap();
    connection
        .execute(
            "INSERT INTO learning_profiles (id, target_language_tag) VALUES ('other', 'fr')",
            [],
        )
        .unwrap();
    assert!(service.list("other").unwrap().is_empty());
    assert!(matches!(
        service.update("other", &item.id, input("test", "意味")),
        Err(Error::NotFound)
    ));
    assert!(matches!(
        service.delete("other", &item.id),
        Err(Error::NotFound)
    ));
    connection.execute("INSERT INTO learning_items (id, profile_id, kind, text, explanation) VALUES ('phrase', 'default-en', 'phrase', 'thank you', 'ありがとう')", []).unwrap();
    assert_eq!(service.list(DEFAULT_PROFILE_ID).unwrap().len(), 1);
    assert!(matches!(
        service.delete(DEFAULT_PROFILE_ID, "phrase"),
        Err(Error::NotFound)
    ));
    assert!(matches!(
        service.update(DEFAULT_PROFILE_ID, "phrase", input("test", "意味")),
        Err(Error::NotFound)
    ));
    assert_eq!(service.list(DEFAULT_PROFILE_ID).unwrap()[0].text, item.text);
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .unwrap();
    connection.execute("INSERT INTO conversation_sessions (id, profile_id, status) VALUES ('foreign-session', 'other', 'preparing')", []).unwrap();
    assert!(connection.execute("INSERT INTO usage_records (session_id, learning_item_id, profile_id, ai_usage_count, recorded_at) VALUES ('foreign-session', ?1, 'default-en', 1, '2026-11-07T00:00:00Z')", [&item.id]).is_err());
}
