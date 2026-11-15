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
        feedback: "  理由を添えて話せました。次は過去形を練習しましょう。  ".into(),
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
    assert_eq!((first.used_items.len(), first.candidates.len()), (1, 1));
    assert_eq!(first.candidates[0].id, retry.candidates[0].id);
    assert!(first.learned_items.is_empty());
    assert!(first.conversation.reviewed_at.is_none());
    assert_eq!(
        first.feedback,
        "理由を添えて話せました。次は過去形を練習しましょう。"
    );
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
            .candidates[0]
            .id,
        first.candidates[0].id
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
        .save_review(
            DEFAULT_PROFILE_ID,
            &recorded.conversation.id,
            vec![recorded.candidates[0].id.clone()],
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
fn saving_review_registers_checked_words_and_phrases_together_and_is_idempotent() {
    let db = Database::new();
    let mut input = record();
    let mut phrase = input.learned_items[0].clone();
    phrase.kind = StudyKind::Phrase;
    phrase.text = "It depends".into();
    phrase.example_text = "It depends on the weather.".into();
    let mut unchecked = input.learned_items[0].clone();
    unchecked.text = "not selected".into();
    input.learned_items.extend([phrase, unchecked]);
    let detail = db
        .service()
        .record(DEFAULT_PROFILE_ID, input.clone())
        .unwrap();
    let ids = vec![
        detail.candidates[0].id.clone(),
        detail.candidates[1].id.clone(),
    ];
    assert!(
        db.service().conversations(DEFAULT_PROFILE_ID).unwrap()[0]
            .reviewed_at
            .is_none()
    );
    assert!(detail.candidates.iter().all(|item| !item.registered));
    for _ in 0..2 {
        let saved = db
            .service()
            .save_review(DEFAULT_PROFILE_ID, &input.id, ids.clone())
            .unwrap();
        assert!(saved.conversation.reviewed_at.is_some());
        assert_eq!(saved.learned_items.len(), 2);
        assert_eq!(saved.candidates.len(), 3);
        assert!(saved.candidates[0].registered);
        assert!(saved.candidates[1].registered);
        assert!(!saved.candidates[2].registered);
    }
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
    assert!(retried.conversation.reviewed_at.is_some());
    assert_eq!(retried.learned_items.len(), 2);
}

#[test]
fn failed_batch_save_preserves_all_choices_and_rolls_back_review_vocabulary_and_states() {
    let db = Database::new();
    let service = db.service();
    let mut input = record();
    let mut phrase = input.learned_items[0].clone();
    phrase.kind = StudyKind::Phrase;
    phrase.text = "It depends".into();
    input.learned_items.push(phrase);
    let detail = service.record(DEFAULT_PROFILE_ID, input).unwrap();
    let ids: Vec<_> = detail
        .candidates
        .iter()
        .map(|item| item.id.clone())
        .collect();
    let connection = Connection::open(&db.0).unwrap();
    connection.execute_batch("CREATE TRIGGER fail_second_link BEFORE INSERT ON session_learning_items WHEN (SELECT COUNT(*) FROM session_learning_items WHERE session_id = NEW.session_id) > 0 BEGIN SELECT RAISE(ABORT, 'write failed'); END;").unwrap();
    assert!(
        service
            .save_review(DEFAULT_PROFILE_ID, &detail.conversation.id, ids.clone())
            .is_err()
    );
    let unchanged = service
        .conversation(DEFAULT_PROFILE_ID, &detail.conversation.id)
        .unwrap();
    assert!(unchanged.conversation.reviewed_at.is_none());
    assert!(unchanged.candidates.iter().all(|item| !item.registered));
    assert!(unchanged.learned_items.is_empty());
    for kind in [StudyKind::Word, StudyKind::Phrase] {
        assert!(
            db.vocabulary()
                .list(DEFAULT_PROFILE_ID, kind)
                .unwrap()
                .is_empty()
        );
    }
    let states: i64 = connection
        .query_row("SELECT COUNT(*) FROM review_states", [], |r| r.get(0))
        .unwrap();
    assert_eq!(states, 0);
    connection
        .execute_batch("DROP TRIGGER fail_second_link;")
        .unwrap();
    assert!(
        service
            .save_review(DEFAULT_PROFILE_ID, &detail.conversation.id, ids)
            .is_ok()
    );
}

#[test]
fn review_completion_is_independent_of_new_expression_candidates() {
    let db = Database::new();
    let service = db.service();
    for empty in [false, true] {
        let mut input = record();
        if empty {
            input.learned_items.clear();
        }
        let detail = service.record(DEFAULT_PROFILE_ID, input).unwrap();
        assert!(detail.conversation.reviewed_at.is_none());
        let saved = service
            .save_review(DEFAULT_PROFILE_ID, &detail.conversation.id, vec![])
            .unwrap();
        assert!(saved.conversation.reviewed_at.is_some());
        assert!(saved.learned_items.is_empty());
        assert!(
            saved
                .candidates
                .iter()
                .all(|candidate| !candidate.registered)
        );
    }
    assert!(
        service
            .conversations(DEFAULT_PROFILE_ID)
            .unwrap()
            .iter()
            .all(|session| session.reviewed_at.is_some())
    );
    assert!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn review_save_rejects_foreign_and_invalid_candidate_ids_without_partial_writes() {
    let db = Database::new();
    let service = db.service();
    let first = service.record(DEFAULT_PROFILE_ID, record()).unwrap();
    let second = service.record(DEFAULT_PROFILE_ID, record()).unwrap();
    let own = first.candidates[0].id.clone();
    let foreign = second.candidates[0].id.clone();
    assert!(matches!(
        service.save_review("default-ja", &first.conversation.id, vec![own.clone()]),
        Err(Error::NotFound)
    ));
    assert!(matches!(
        service.save_review(
            DEFAULT_PROFILE_ID,
            &first.conversation.id,
            vec![own.clone(), foreign]
        ),
        Err(Error::NotFound)
    ));
    assert!(matches!(
        service.save_review(DEFAULT_PROFILE_ID, &first.conversation.id, vec![own; 101]),
        Err(Error::Validation(_))
    ));
    let unchanged = service
        .conversation(DEFAULT_PROFILE_ID, &first.conversation.id)
        .unwrap();
    assert!(unchanged.conversation.reviewed_at.is_none());
    assert!(!unchanged.candidates[0].registered);
    assert!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn blank_or_oversized_ai_feedback_is_rejected() {
    let db = Database::new();
    let service = db.service();
    for feedback in [" \n ".to_owned(), "a".repeat(20001)] {
        let mut input = record();
        input.feedback = feedback;
        assert!(matches!(
            service.record(DEFAULT_PROFILE_ID, input),
            Err(Error::Validation(_))
        ));
    }
    assert!(
        service
            .conversations(DEFAULT_PROFILE_ID)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn upgrading_existing_sessions_preserves_registered_items_and_completed_history() {
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
    assert!(detail.candidates.is_empty());
    assert!(detail.conversation.reviewed_at.is_some());
    assert_eq!(detail.feedback, "");
    assert_eq!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .len(),
        1
    );
}

#[test]
fn upgrading_partial_candidate_reviews_retains_existing_registrations() {
    let db = Database::new();
    let connection = Connection::open(&db.0).unwrap();
    for migration in [
        include_str!("../migrations/0001_initial.sql"),
        include_str!("../migrations/0002_conversations.sql"),
        include_str!("../migrations/0003_learning_languages.sql"),
        include_str!("../migrations/0004_conversation_candidates.sql"),
    ] {
        connection.execute_batch(migration).unwrap();
    }
    connection.execute_batch(
        "INSERT INTO conversation_sessions (id, profile_id, status, occurred_at)
         VALUES ('partial', 'default-en', 'recorded', '2026-11-01T12:00:00Z');
         INSERT INTO learning_items (id, profile_id, kind, text, explanation)
         VALUES ('existing', 'default-en', 'word', 'hello', 'こんにちは');
         INSERT INTO session_learning_items (session_id, learning_item_id, profile_id)
         VALUES ('partial', 'existing', 'default-en');
         INSERT INTO conversation_learning_candidates (id, session_id, profile_id, kind, text, explanation, reviewed)
         VALUES ('accepted', 'partial', 'default-en', 'word', 'hello', 'こんにちは', 1),
                ('pending', 'partial', 'default-en', 'phrase', 'It depends', '場合による', 0);"
    ).unwrap();
    connection.pragma_update(None, "user_version", 4).unwrap();
    drop(connection);
    let service = db.service();
    let detail = service.conversation(DEFAULT_PROFILE_ID, "partial").unwrap();
    assert!(detail.conversation.reviewed_at.is_none());
    assert!(detail.candidates[0].registered);
    assert!(!detail.candidates[1].registered);
    let saved = service
        .save_review(
            DEFAULT_PROFILE_ID,
            "partial",
            vec!["accepted".into(), "pending".into()],
        )
        .unwrap();
    assert!(saved.conversation.reviewed_at.is_some());
    assert!(saved.candidates.iter().all(|item| item.registered));
    assert_eq!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Word)
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        db.vocabulary()
            .list(DEFAULT_PROFILE_ID, StudyKind::Phrase)
            .unwrap()
            .len(),
        1
    );
}
