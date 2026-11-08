use lemno_application::VocabularyService;
use lemno_domain::{DEFAULT_PROFILE_ID, Error, StudyKind, VocabularyInput};
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
        kind: StudyKind::Word,
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
    let items = db
        .service()
        .list(DEFAULT_PROFILE_ID, StudyKind::Word)
        .unwrap();
    assert_eq!(items.len(), 2);
    assert_eq!(items[0].explanation, "土手");
}

#[test]
fn upgrading_adds_japanese_without_changing_english_learning_data() {
    let db = Database::new();
    let connection = Connection::open(&db.0).unwrap();
    connection
        .execute_batch(include_str!("../migrations/0001_initial.sql"))
        .unwrap();
    connection
        .execute_batch(include_str!("../migrations/0002_conversations.sql"))
        .unwrap();
    connection.pragma_update(None, "user_version", 2).unwrap();
    connection.execute("INSERT INTO learning_items (id, profile_id, kind, text, explanation) VALUES ('existing', 'default-en', 'word', 'hello', 'こんにちは')", []).unwrap();
    drop(connection);

    let service = db.service();
    assert_eq!(
        service.list(DEFAULT_PROFILE_ID, StudyKind::Word).unwrap()[0].id,
        "existing"
    );
    assert!(
        service
            .list("default-ja", StudyKind::Word)
            .unwrap()
            .is_empty()
    );
    let japanese = service
        .create("default-ja", input("こんにちは", "hello"))
        .unwrap();
    assert!(matches!(
        service.delete(DEFAULT_PROFILE_ID, &japanese.id, StudyKind::Word),
        Err(Error::NotFound)
    ));
    drop(service);

    let reopened = db.service();
    assert_eq!(
        reopened.list("default-ja", StudyKind::Word).unwrap()[0].id,
        japanese.id
    );
    assert_eq!(
        reopened.list(DEFAULT_PROFILE_ID, StudyKind::Word).unwrap()[0].id,
        "existing"
    );
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
    assert!(
        service
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .is_empty()
    );
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
    service
        .delete(DEFAULT_PROFILE_ID, &item.id, StudyKind::Word)
        .unwrap();
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
    assert!(service.list("other", StudyKind::Word).unwrap().is_empty());
    assert!(matches!(
        service.update("other", &item.id, input("test", "意味")),
        Err(Error::NotFound)
    ));
    assert!(matches!(
        service.delete("other", &item.id, StudyKind::Word),
        Err(Error::NotFound)
    ));
    connection.execute("INSERT INTO learning_items (id, profile_id, kind, text, explanation) VALUES ('phrase', 'default-en', 'phrase', 'thank you', 'ありがとう')", []).unwrap();
    assert_eq!(
        service
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .len(),
        1
    );
    assert!(matches!(
        service.delete(DEFAULT_PROFILE_ID, "phrase", StudyKind::Word),
        Err(Error::NotFound)
    ));
    assert!(matches!(
        service.update(DEFAULT_PROFILE_ID, "phrase", input("test", "意味")),
        Err(Error::NotFound)
    ));
    assert_eq!(
        service.list(DEFAULT_PROFILE_ID, StudyKind::Word).unwrap()[0].text,
        item.text
    );
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .unwrap();
    connection.execute("INSERT INTO conversation_sessions (id, profile_id, status) VALUES ('foreign-session', 'other', 'preparing')", []).unwrap();
    assert!(connection.execute("INSERT INTO usage_records (session_id, learning_item_id, profile_id, ai_usage_count, recorded_at) VALUES ('foreign-session', ?1, 'default-en', 1, '2026-11-07T00:00:00Z')", [&item.id]).is_err());
}

#[test]
fn phrases_have_separate_lists_and_persist_review_results_without_changing_usage() {
    let db = Database::new();
    let service = db.service();
    let word = service
        .create(DEFAULT_PROFILE_ID, input("routine", "習慣"))
        .unwrap();
    let mut phrase_input = input("get used to", "〜に慣れる");
    phrase_input.kind = StudyKind::Phrase;
    let phrase = service
        .create(DEFAULT_PROFILE_ID, phrase_input.clone())
        .unwrap();
    assert_eq!(
        service.list(DEFAULT_PROFILE_ID, StudyKind::Word).unwrap()[0].id,
        word.id
    );
    assert_eq!(
        service.list(DEFAULT_PROFILE_ID, StudyKind::Phrase).unwrap()[0].id,
        phrase.id
    );
    assert!(matches!(
        service.review("other", &phrase.id, StudyKind::Phrase, true),
        Err(Error::NotFound)
    ));
    assert!(matches!(
        service.review(DEFAULT_PROFILE_ID, &phrase.id, StudyKind::Word, true),
        Err(Error::NotFound)
    ));
    for (remembered, level, count) in [(true, 1, 1), (true, 2, 2), (true, 2, 3), (false, 0, 4)] {
        let reviewed = service
            .review(
                DEFAULT_PROFILE_ID,
                &phrase.id,
                StudyKind::Phrase,
                remembered,
            )
            .unwrap();
        assert_eq!(
            (
                reviewed.memory_level,
                reviewed.review_count,
                reviewed.reviewed_today,
                reviewed.usage_count
            ),
            (level, count, count, 0)
        );
    }
    phrase_input.explanation = "新しい環境などに慣れる".into();
    let edited = service
        .update(DEFAULT_PROFILE_ID, &phrase.id, phrase_input)
        .unwrap();
    assert_eq!(edited.review_count, 4);
    drop(service);
    let reopened = db.service();
    let saved = reopened
        .list(DEFAULT_PROFILE_ID, StudyKind::Phrase)
        .unwrap();
    assert_eq!((saved[0].memory_level, saved[0].review_count), (0, 4));
    assert_eq!(
        reopened.list(DEFAULT_PROFILE_ID, StudyKind::Word).unwrap()[0].review_count,
        0
    );
    reopened
        .delete(DEFAULT_PROFILE_ID, &phrase.id, StudyKind::Phrase)
        .unwrap();
    assert!(
        reopened
            .list(DEFAULT_PROFILE_ID, StudyKind::Phrase)
            .unwrap()
            .is_empty()
    );
    let connection = Connection::open(&db.0).unwrap();
    let records: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM review_records WHERE learning_item_id = ?1",
            [&phrase.id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(records, 0);
}

#[test]
fn failed_review_rolls_back_memory_state() {
    let db = Database::new();
    let service = db.service();
    let item = service
        .create(DEFAULT_PROFILE_ID, input("hello", "こんにちは"))
        .unwrap();
    let connection = Connection::open(&db.0).unwrap();
    connection.execute_batch("CREATE TRIGGER fail_review BEFORE INSERT ON review_records BEGIN SELECT RAISE(ABORT, 'write failed'); END;").unwrap();
    assert!(
        service
            .review(DEFAULT_PROFILE_ID, &item.id, StudyKind::Word, true)
            .is_err()
    );
    let saved = service.list(DEFAULT_PROFILE_ID, StudyKind::Word).unwrap();
    assert_eq!((saved[0].memory_level, saved[0].review_count), (0, 0));
}
