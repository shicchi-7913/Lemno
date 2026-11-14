use lemno_application::{ConversationService, VocabularyService};
use lemno_domain::{ConversationInput, DEFAULT_PROFILE_ID, Error, StudyKind, VocabularyInput};
use lemno_infrastructure::SqliteVocabularyRepository;
use rusqlite::Connection;
use uuid::Uuid;

struct Database(std::path::PathBuf);

impl Database {
    fn new() -> Self {
        Self(std::env::temp_dir().join(format!("lemno-conversation-{}.sqlite3", Uuid::new_v4())))
    }
    fn service(&self) -> ConversationService<SqliteVocabularyRepository> {
        ConversationService(SqliteVocabularyRepository::open(&self.0).unwrap())
    }
    fn vocabulary(&self) -> VocabularyService<SqliteVocabularyRepository> {
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

fn record() -> ConversationInput {
    ConversationInput {
        id: Uuid::new_v4().to_string(),
        topic_id: Some("seed-hobbies".into()),
        ai: "ChatGPT".into(),
        duration_minutes: 18,
        notes: "  映画の感想を話した。  ".into(),
        used_item_ids: vec![],
        learned_items: vec![VocabularyInput {
            kind: StudyKind::Word,
            text: "appreciate".into(),
            explanation: "感謝する".into(),
            example_text: String::new(),
        }],
    }
}

#[test]
fn recording_persists_and_retries_do_not_duplicate_learning_or_usage() {
    let db = Database::new();
    let vocab = db.vocabulary();
    let mut phrase = record().learned_items.remove(0);
    phrase.kind = StudyKind::Phrase;
    phrase.text = "It depends on...".into();
    let used = vocab.create(DEFAULT_PROFILE_ID, phrase).unwrap();
    let mut input = record();
    input.used_item_ids = vec![used.id.clone(), used.id.clone()];
    let service = db.service();
    let first = service.record(DEFAULT_PROFILE_ID, input.clone()).unwrap();
    let retry = service.record(DEFAULT_PROFILE_ID, input).unwrap();
    assert_eq!(first.conversation.id, retry.conversation.id);
    assert_eq!(first.conversation.notes, "映画の感想を話した。");
    assert!(first.conversation.occurred_at.ends_with('Z'));
    assert_eq!((first.used_items.len(), first.pending_items.len()), (1, 1));
    assert_eq!(first.pending_items[0].id, retry.pending_items[0].id);
    assert!(first.learned_items.is_empty());
    assert_eq!(first.conversation.pending_candidate_count, 1);
    let words = vocab.list(DEFAULT_PROFILE_ID, StudyKind::Word).unwrap();
    assert!(words.is_empty());
    assert_eq!(
        vocab.list(DEFAULT_PROFILE_ID, StudyKind::Phrase).unwrap()[0].usage_count,
        1
    );
    drop(service);
    assert_eq!(
        db.service()
            .conversations(DEFAULT_PROFILE_ID)
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        db.service()
            .conversation(DEFAULT_PROFILE_ID, &first.conversation.id)
            .unwrap()
            .pending_items[0]
            .id,
        first.pending_items[0].id
    );
}

#[test]
fn failed_candidate_write_rolls_back_session_and_candidates() {
    let db = Database::new();
    let service = db.service();
    let connection = Connection::open(&db.0).unwrap();
    connection.execute_batch("CREATE TRIGGER fail_candidate BEFORE INSERT ON conversation_learning_candidates BEGIN SELECT RAISE(ABORT, 'write failed'); END;").unwrap();
    let input = record();
    assert!(service.record(DEFAULT_PROFILE_ID, input.clone()).is_err());
    assert!(
        service
            .conversations(DEFAULT_PROFILE_ID)
            .unwrap()
            .is_empty()
    );
    assert!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .is_empty()
    );
    let states: i64 = connection
        .query_row("SELECT COUNT(*) FROM review_states", [], |r| r.get(0))
        .unwrap();
    assert_eq!(states, 0);
    connection
        .execute_batch("DROP TRIGGER fail_candidate;")
        .unwrap();
    assert!(service.record(DEFAULT_PROFILE_ID, input).is_ok());
}

#[test]
fn invalid_input_and_foreign_profiles_cannot_write_records() {
    let db = Database::new();
    let service = db.service();
    let mut invalid = record();
    invalid.duration_minutes = 0;
    assert!(matches!(
        service.record(DEFAULT_PROFILE_ID, invalid),
        Err(Error::Validation(_))
    ));
    let mut invalid = record();
    invalid.notes = " \n ".into();
    assert!(matches!(
        service.record(DEFAULT_PROFILE_ID, invalid),
        Err(Error::Validation(_))
    ));
    let mut invalid = record();
    invalid.used_item_ids = vec!["missing-item".into()];
    assert!(service.record(DEFAULT_PROFILE_ID, invalid).is_err());
    assert!(
        service
            .conversations(DEFAULT_PROFILE_ID)
            .unwrap()
            .is_empty()
    );
    let connection = Connection::open(&db.0).unwrap();
    connection
        .execute(
            "INSERT INTO learning_profiles (id, target_language_tag) VALUES ('other', 'fr')",
            [],
        )
        .unwrap();
    assert!(matches!(
        service.record("other", record()),
        Err(Error::NotFound)
    ));
    let input = record();
    let detail = service.record(DEFAULT_PROFILE_ID, input.clone()).unwrap();
    assert!(matches!(
        service.conversation("other", &detail.conversation.id),
        Err(Error::NotFound)
    ));
    assert!(matches!(
        service.record("other", input),
        Err(Error::NotFound)
    ));
    let mut foreign = record();
    foreign.topic_id = None;
    let used = db
        .vocabulary()
        .create(DEFAULT_PROFILE_ID, record().learned_items.remove(0))
        .unwrap();
    foreign.used_item_ids = vec![used.id];
    assert!(service.record("other", foreign).is_err());
}

#[test]
fn topic_edits_preserve_record_title_and_deletion_cascades_history_only() {
    let db = Database::new();
    let service = db.service();
    let recorded = service.record(DEFAULT_PROFILE_ID, record()).unwrap();
    service
        .resolve_candidate(
            DEFAULT_PROFILE_ID,
            &recorded.conversation.id,
            &recorded.pending_items[0].id,
            true,
        )
        .unwrap();
    let topic = service
        .topics(DEFAULT_PROFILE_ID)
        .unwrap()
        .into_iter()
        .find(|t| t.id == "seed-hobbies")
        .unwrap();
    let mut edited = topic.input;
    edited.title = "  新しいタイトル  ".into();
    assert_eq!(
        service
            .save_topic(DEFAULT_PROFILE_ID, Some(&topic.id), edited)
            .unwrap()
            .input
            .title,
        "新しいタイトル"
    );
    assert_eq!(
        service
            .conversation(DEFAULT_PROFILE_ID, &recorded.conversation.id)
            .unwrap()
            .conversation
            .title,
        "最近ハマっていること"
    );
    assert!(matches!(
        service.delete_topic("other", &topic.id),
        Err(Error::NotFound)
    ));
    service.delete_topic(DEFAULT_PROFILE_ID, &topic.id).unwrap();
    assert!(
        service
            .conversations(DEFAULT_PROFILE_ID)
            .unwrap()
            .is_empty()
    );
    assert_eq!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .len(),
        1
    );
    assert_eq!(db.service().topics(DEFAULT_PROFILE_ID).unwrap().len(), 5);
}

#[test]
fn upgrade_from_version_one_preserves_existing_items_and_seeds_only_once() {
    let db = Database::new();
    let connection = Connection::open(&db.0).unwrap();
    connection
        .execute_batch(include_str!("../migrations/0001_initial.sql"))
        .unwrap();
    connection.pragma_update(None, "user_version", 1).unwrap();
    connection.execute("INSERT INTO learning_items (id, profile_id, kind, text, explanation) VALUES ('existing', 'default-en', 'word', 'hello', 'こんにちは')", []).unwrap();
    drop(connection);
    assert_eq!(db.service().topics(DEFAULT_PROFILE_ID).unwrap().len(), 6);
    assert_eq!(db.service().topics(DEFAULT_PROFILE_ID).unwrap().len(), 6);
    assert_eq!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()[0]
            .id,
        "existing"
    );
}

#[test]
fn candidate_decisions_persist_and_retries_never_register_twice_or_restore_skipped_items() {
    let db = Database::new();
    let mut input = record();
    let mut phrase = input.learned_items[0].clone();
    phrase.kind = StudyKind::Phrase;
    phrase.text = "It depends".into();
    phrase.example_text = "It depends on the weather.".into();
    let mut skipped = input.learned_items[0].clone();
    skipped.text = "skip me".into();
    input.learned_items.extend([phrase, skipped]);
    let detail = db
        .service()
        .record(DEFAULT_PROFILE_ID, input.clone())
        .unwrap();
    let session = &detail.conversation.id;
    let candidates = &detail.pending_items;
    let service = db.service();
    assert_eq!(
        service.conversations(DEFAULT_PROFILE_ID).unwrap()[0].pending_candidate_count,
        3
    );
    for _ in 0..2 {
        let saved = service
            .resolve_candidate(DEFAULT_PROFILE_ID, session, &candidates[0].id, true)
            .unwrap();
        assert_eq!(saved.conversation.pending_candidate_count, 2);
        assert_eq!(saved.learned_items.len(), 1);
    }
    service
        .resolve_candidate(DEFAULT_PROFILE_ID, session, &candidates[2].id, false)
        .unwrap();
    // Retrying a reviewed candidate must keep the original decision.
    service
        .resolve_candidate(DEFAULT_PROFILE_ID, session, &candidates[2].id, true)
        .unwrap();
    let saved = service
        .resolve_candidate(DEFAULT_PROFILE_ID, session, &candidates[1].id, true)
        .unwrap();
    assert_eq!(saved.conversation.pending_candidate_count, 0);
    assert!(saved.pending_items.is_empty());
    assert_eq!(saved.learned_items.len(), 2);
    let words = db
        .vocabulary()
        .list(DEFAULT_PROFILE_ID, StudyKind::Word)
        .unwrap();
    assert_eq!(words.len(), 1);
    assert_eq!(words[0].text, "appreciate");
    assert_eq!((words[0].usage_count, words[0].memory_level), (0, 0));
    let phrases = db
        .vocabulary()
        .list(DEFAULT_PROFILE_ID, StudyKind::Phrase)
        .unwrap();
    assert_eq!(phrases.len(), 1);
    assert_eq!(phrases[0].example_text, "It depends on the weather.");
    let retried = db.service().record(DEFAULT_PROFILE_ID, input).unwrap();
    assert!(retried.pending_items.is_empty());
    assert_eq!(retried.learned_items.len(), 2);
    assert_eq!(
        db.service().conversations(DEFAULT_PROFILE_ID).unwrap()[0].pending_candidate_count,
        0
    );
}

#[test]
fn failed_registration_preserves_candidate_and_rolls_back_vocabulary_and_review_state() {
    let db = Database::new();
    let service = db.service();
    let detail = service.record(DEFAULT_PROFILE_ID, record()).unwrap();
    let session = &detail.conversation.id;
    let candidate = &detail.pending_items[0].id;
    let connection = Connection::open(&db.0).unwrap();
    connection.execute_batch("CREATE TRIGGER fail_link BEFORE INSERT ON session_learning_items BEGIN SELECT RAISE(ABORT, 'write failed'); END;").unwrap();
    assert!(
        service
            .resolve_candidate(DEFAULT_PROFILE_ID, session, candidate, true)
            .is_err()
    );
    let unchanged = service.conversation(DEFAULT_PROFILE_ID, session).unwrap();
    assert_eq!(unchanged.pending_items[0].id, *candidate);
    assert_eq!(unchanged.conversation.pending_candidate_count, 1);
    assert!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .is_empty()
    );
    let states: i64 = connection
        .query_row("SELECT COUNT(*) FROM review_states", [], |r| r.get(0))
        .unwrap();
    assert_eq!(states, 0);
    connection.execute_batch("DROP TRIGGER fail_link;").unwrap();
    assert!(
        service
            .resolve_candidate(DEFAULT_PROFILE_ID, session, candidate, true)
            .is_ok()
    );
}

#[test]
fn candidate_decisions_are_scoped_to_the_conversation_and_learning_language() {
    let db = Database::new();
    let service = db.service();
    let detail = service.record(DEFAULT_PROFILE_ID, record()).unwrap();
    let candidate = &detail.pending_items[0].id;
    let mut empty = record();
    empty.learned_items.clear();
    let empty = service.record(DEFAULT_PROFILE_ID, empty).unwrap();
    assert_eq!(empty.conversation.pending_candidate_count, 0);
    for register in [false, true] {
        assert!(matches!(
            service.resolve_candidate("default-ja", &detail.conversation.id, candidate, register),
            Err(Error::NotFound)
        ));
        assert!(matches!(
            service.resolve_candidate(
                DEFAULT_PROFILE_ID,
                &empty.conversation.id,
                candidate,
                register
            ),
            Err(Error::NotFound)
        ));
    }
    assert_eq!(
        service
            .conversation(DEFAULT_PROFILE_ID, &detail.conversation.id)
            .unwrap()
            .pending_items
            .len(),
        1
    );
    assert!(
        db.vocabulary()
            .list("default-ja", StudyKind::Word)
            .unwrap()
            .is_empty()
    );
    service
        .resolve_candidate(
            DEFAULT_PROFILE_ID,
            &detail.conversation.id,
            candidate,
            false,
        )
        .unwrap();
    assert!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn upgrading_existing_conversations_does_not_turn_registered_items_into_pending_candidates() {
    let db = Database::new();
    let connection = Connection::open(&db.0).unwrap();
    for migration in [
        include_str!("../migrations/0001_initial.sql"),
        include_str!("../migrations/0002_conversations.sql"),
        include_str!("../migrations/0003_learning_languages.sql"),
    ] {
        connection.execute_batch(migration).unwrap();
    }
    connection
        .execute_batch(
            "INSERT INTO learning_items (id, profile_id, kind, text, explanation)
         VALUES ('existing', 'default-en', 'word', 'hello', 'こんにちは');
         INSERT INTO conversation_sessions (id, profile_id, status, occurred_at)
         VALUES ('legacy', 'default-en', 'recorded', '2026-11-01T12:00:00Z');
         INSERT INTO session_learning_items (session_id, learning_item_id, profile_id)
         VALUES ('legacy', 'existing', 'default-en');",
        )
        .unwrap();
    connection.pragma_update(None, "user_version", 3).unwrap();
    drop(connection);
    let detail = db
        .service()
        .conversation(DEFAULT_PROFILE_ID, "legacy")
        .unwrap();
    assert_eq!(detail.learned_items[0].id, "existing");
    assert!(detail.pending_items.is_empty());
    assert_eq!(detail.conversation.pending_candidate_count, 0);
    assert_eq!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .len(),
        1
    );
}
