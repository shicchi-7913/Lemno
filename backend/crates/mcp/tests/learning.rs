use std::path::PathBuf;

use lemno_application::{ConversationService, VocabularyService};
use lemno_domain::StudyKind;
use lemno_infrastructure::SqliteVocabularyRepository;
use lemno_mcp::{ConnectionConfig, LearningServer, run_cli};
use rmcp::{
    RoleClient, ServiceExt,
    model::{CallToolRequestParams, CallToolResult},
    service::RunningService,
};
use serde_json::{Value, json};
use uuid::Uuid;

struct Database(PathBuf);

impl Database {
    fn new() -> Self {
        let directory = std::env::temp_dir().join(format!("lemno-mcp-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        Self(directory.join("lemno.sqlite3"))
    }

    fn select_language(&self, language: &str) {
        std::fs::write(
            self.0.with_file_name("learning-language.json"),
            json!({ "language": language }).to_string(),
        )
        .unwrap();
    }

    fn vocabulary(&self) -> VocabularyService<SqliteVocabularyRepository> {
        VocabularyService(SqliteVocabularyRepository::open(&self.0).unwrap())
    }

    fn conversations(&self) -> ConversationService<SqliteVocabularyRepository> {
        ConversationService(SqliteVocabularyRepository::open(&self.0).unwrap())
    }
}

impl Drop for Database {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(self.0.parent().unwrap());
    }
}

async fn connect(
    database: &Database,
) -> (RunningService<RoleClient, ()>, tokio::task::JoinHandle<()>) {
    let server = LearningServer::open(&database.0).unwrap();
    let (server_io, client_io) = tokio::io::duplex(65536);
    let task = tokio::spawn(async move {
        server
            .serve(server_io)
            .await
            .unwrap()
            .waiting()
            .await
            .unwrap();
    });
    (().serve(client_io).await.unwrap(), task)
}

async fn call(client: &RunningService<RoleClient, ()>, name: &str, args: Value) -> CallToolResult {
    client
        .call_tool(
            CallToolRequestParams::new(name.to_owned())
                .with_arguments(args.as_object().unwrap().clone()),
        )
        .await
        .unwrap()
}

fn record_args(id: &str) -> Value {
    json!({"input": {
        "id": id, "topicId": null, "ai": "ChatGPT", "durationMinutes": 10,
        "notes": "  Practiced hobbies.  ", "usedItemIds": [],
        "learnedItems": [{"kind": "word", "text": "perspective", "explanation": "視点"}]
    }})
}

#[test]
fn protocol_round_trip_follows_selected_language_without_reconnecting() {
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        let database = Database::new();
        let vocabulary = database.vocabulary();
        let created = vocabulary
            .create(
                "default-en",
                serde_json::from_value(json!({
                    "kind": "phrase", "text": "It depends", "explanation": "場合による"
                }))
                .unwrap(),
            )
            .unwrap();
        let (client, task) = connect(&database).await;
        let tools = client.list_all_tools().await.unwrap();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].name, "record_conversation");
        assert_eq!(
            tools[0].annotations.as_ref().unwrap().open_world_hint,
            Some(false)
        );
        let mut record = record_args("mcp-session-1");
        record["input"]["usedItemIds"] = json!([created.id, created.id]);
        for _ in 0..2 {
            let saved = call(&client, "record_conversation", record.clone()).await;
            assert_eq!(saved.is_error, Some(false));
            let saved = saved.structured_content.unwrap();
            assert_eq!(saved["notes"], "Practiced hobbies.");
            assert_eq!(saved["usedItems"].as_array().unwrap().len(), 1);
            assert_eq!(saved["learnedItems"].as_array().unwrap().len(), 1);
        }
        assert_eq!(
            vocabulary.list("default-en", StudyKind::Phrase).unwrap()[0].usage_count,
            1
        );
        let conversations = database.conversations();
        assert_eq!(conversations.conversations("default-en").unwrap().len(), 1);
        database.select_language("ja");
        let foreign = call(&client, "record_conversation", record.clone()).await;
        assert_eq!(foreign.is_error, Some(true));
        let mut japanese = record_args("mcp-session-ja");
        japanese["input"]["learnedItems"] = json!([{"text": "こんにちは", "explanation": "hello"}]);
        assert_eq!(
            call(&client, "record_conversation", japanese)
                .await
                .is_error,
            Some(false)
        );
        database.select_language("en");
        assert_eq!(
            call(&client, "record_conversation", record).await.is_error,
            Some(false)
        );
        assert_eq!(
            vocabulary.list("default-en", StudyKind::Word).unwrap()[0].text,
            "perspective"
        );
        assert_eq!(
            vocabulary.list("default-ja", StudyKind::Word).unwrap()[0].text,
            "こんにちは"
        );
        assert_eq!(conversations.conversations("default-en").unwrap().len(), 1);
        assert_eq!(conversations.conversations("default-ja").unwrap().len(), 1);
        client.cancel().await.unwrap();
        task.await.unwrap();
    });
}

#[test]
fn removed_tools_and_invalid_calls_do_not_write_and_client_can_recover() {
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        let database = Database::new();
        let (client, task) = connect(&database).await;
        for name in [
            "list_vocabulary",
            "create_vocabulary",
            "list_topics",
            "list_conversations",
            "get_conversation",
            "unknown_tool",
        ] {
            assert!(
                client
                    .call_tool(CallToolRequestParams::new(name))
                    .await
                    .is_err(),
                "{name} is still callable"
            );
        }
        for (field, value) in [
            ("durationMinutes", json!(0)),
            ("notes", json!(" ")),
            ("extra", json!(true)),
            ("profileId", json!("default-ja")),
            (
                "learnedItems",
                json!([{"text":" ", "explanation":"meaning"}]),
            ),
            ("learnedItems", json!([{"text":"hello", "explanation":" "}])),
            (
                "learnedItems",
                json!([{"text":"hello", "explanation":"meaning", "extra":true}]),
            ),
        ] {
            let mut invalid = record_args("bad-session");
            invalid["input"][field] = value;
            assert_eq!(
                call(&client, "record_conversation", invalid).await.is_error,
                Some(true)
            );
        }
        let mut invalid = record_args("bad-session");
        invalid["profileId"] = json!("default-ja");
        assert_eq!(
            call(&client, "record_conversation", invalid).await.is_error,
            Some(true)
        );
        assert!(
            database
                .vocabulary()
                .list("default-en", StudyKind::Word)
                .unwrap()
                .is_empty()
        );
        assert!(
            database
                .conversations()
                .conversations("default-en")
                .unwrap()
                .is_empty()
        );
        assert_eq!(
            call(
                &client,
                "record_conversation",
                record_args("recovered-session")
            )
            .await
            .is_error,
            Some(false)
        );
        assert_eq!(
            database
                .conversations()
                .conversations("default-en")
                .unwrap()
                .len(),
            1
        );
        client.cancel().await.unwrap();
        task.await.unwrap();
    });
}

#[test]
fn unreadable_language_settings_do_not_write_to_a_fallback_language() {
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        let database = Database::new();
        database.select_language("ja");
        let (client, task) = connect(&database).await;
        std::fs::write(
            database.0.with_file_name("learning-language.json"),
            "{broken",
        )
        .unwrap();
        let result = call(
            &client,
            "record_conversation",
            record_args("language-session"),
        )
        .await;
        assert_eq!(result.is_error, Some(true));
        for profile in ["default-en", "default-ja"] {
            assert!(
                database
                    .vocabulary()
                    .list(profile, StudyKind::Word)
                    .unwrap()
                    .is_empty()
            );
            assert!(
                database
                    .conversations()
                    .conversations(profile)
                    .unwrap()
                    .is_empty()
            );
        }
        database.select_language("ja");
        assert_eq!(
            call(
                &client,
                "record_conversation",
                record_args("language-session")
            )
            .await
            .is_error,
            Some(false)
        );
        assert!(
            database
                .conversations()
                .conversations("default-en")
                .unwrap()
                .is_empty()
        );
        assert_eq!(
            database
                .conversations()
                .conversations("default-ja")
                .unwrap()
                .len(),
            1
        );
        client.cancel().await.unwrap();
        task.await.unwrap();
    });
}

#[test]
fn configuration_preserves_paths_without_binding_a_language_and_rejects_invalid_arguments() {
    let config = ConnectionConfig::new(
        std::path::Path::new("/Applications/Lemno App/lemno"),
        std::path::Path::new("/tmp/日本語 data/lemno.sqlite3"),
    )
    .unwrap();
    assert_eq!(config.command, "/Applications/Lemno App/lemno");
    assert_eq!(config.args[2], "/tmp/日本語 data/lemno.sqlite3");
    assert_eq!(config.args.len(), 3);
    for args in [
        vec![],
        vec!["--database"],
        vec!["--unknown"],
        vec!["--database", "x", "--profile", "other"],
    ] {
        assert!(run_cli(args.into_iter().map(Into::into)).is_err());
    }
}
