use std::path::PathBuf;

use lemno_application::VocabularyService;
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

#[test]
fn protocol_round_trip_follows_selected_language_without_reconnecting() {
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        let database = Database::new();
        let (client, task) = connect(&database).await;
        let tools = client.list_all_tools().await.unwrap();
        assert_eq!(tools.len(), 6);
        assert!(
            tools
                .iter()
                .all(|tool| tool.annotations.as_ref().unwrap().open_world_hint == Some(false))
        );
        let topics = call(&client, "list_topics", json!({})).await;
        assert!(
            !topics.structured_content.unwrap()["topics"]
                .as_array()
                .unwrap()
                .is_empty()
        );
        let created = call(
            &client,
            "create_vocabulary",
            json!({
                "input": { "kind": "phrase", "text": "  It depends  ", "explanation": "場合による" }
            }),
        )
        .await;
        let created = created.structured_content.unwrap();
        assert_eq!(created["text"], "It depends");
        let used_id = created["id"].as_str().unwrap();
        let record = json!({"input": {
            "id": "mcp-session-1", "topicId": null, "ai": "ChatGPT", "durationMinutes": 10,
            "notes": "  Practiced hobbies.  ", "usedItemIds": [used_id, used_id],
            "learnedItems": [{"kind": "word", "text": "perspective", "explanation": "視点"}]
        }});
        for _ in 0..2 {
            let saved = call(&client, "record_conversation", record.clone()).await;
            assert_eq!(saved.is_error, Some(false));
            let saved = saved.structured_content.unwrap();
            assert_eq!(saved["notes"], "Practiced hobbies.");
            assert_eq!(saved["usedItems"].as_array().unwrap().len(), 1);
            assert_eq!(saved["learnedItems"].as_array().unwrap().len(), 1);
        }
        let phrases = call(&client, "list_vocabulary", json!({"kind": "phrase"})).await;
        assert_eq!(
            phrases.structured_content.unwrap()["items"][0]["usageCount"],
            1
        );
        let words = call(&client, "list_vocabulary", json!({})).await;
        assert_eq!(
            words.structured_content.unwrap()["items"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        let history = call(&client, "list_conversations", json!({})).await;
        assert_eq!(
            history.structured_content.unwrap()["conversations"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        let detail = call(&client, "get_conversation", json!({"id": "mcp-session-1"})).await;
        assert_eq!(detail.is_error, Some(false));
        database.select_language("ja");
        let foreign = call(&client, "get_conversation", json!({"id": "mcp-session-1"})).await;
        assert_eq!(foreign.is_error, Some(true));
        let foreign = call(&client, "record_conversation", record).await;
        assert_eq!(foreign.is_error, Some(true));
        let empty = call(&client, "list_vocabulary", json!({})).await;
        assert_eq!(empty.structured_content.unwrap()["items"], json!([]));
        let created = call(
            &client,
            "create_vocabulary",
            json!({"input": {"text": "こんにちは", "explanation": "hello"}}),
        )
        .await;
        assert_eq!(
            created.structured_content.unwrap()["profileId"],
            "default-ja"
        );
        database.select_language("en");
        let detail = call(&client, "get_conversation", json!({"id": "mcp-session-1"})).await;
        assert_eq!(detail.is_error, Some(false));
        let words = call(&client, "list_vocabulary", json!({})).await;
        assert_eq!(
            words.structured_content.unwrap()["items"][0]["text"],
            "perspective"
        );
        let repo = VocabularyService(SqliteVocabularyRepository::open(&database.0).unwrap());
        assert_eq!(repo.list("default-en", StudyKind::Word).unwrap().len(), 1);
        assert_eq!(repo.list("default-ja", StudyKind::Word).unwrap().len(), 1);
        client.cancel().await.unwrap();
        task.await.unwrap();
    });
}

#[test]
fn invalid_calls_do_not_write_and_client_can_recover() {
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        let database = Database::new();
        let (client, task) = connect(&database).await;
        for input in [
            json!({"text":" ", "explanation":"meaning"}),
            json!({"text":"hello", "explanation":" "}),
            json!({"text":"hello", "explanation":"meaning", "extra": true}),
        ] {
            assert_eq!(
                call(&client, "create_vocabulary", json!({"input":input}))
                    .await
                    .is_error,
                Some(true)
            );
        }
        assert_eq!(
            call(
                &client,
                "list_vocabulary",
                json!({"profileId":"default-ja"})
            )
            .await
            .is_error,
            Some(true)
        );
        assert_eq!(
            call(&client, "list_vocabulary", json!({"kind":"invalid"}))
                .await
                .is_error,
            Some(true)
        );
        assert!(
            client
                .call_tool(CallToolRequestParams::new("unknown_tool"))
                .await
                .is_err()
        );
        let invalid = json!({"input":{
            "id":"bad-session", "ai":"ChatGPT", "durationMinutes":0, "notes":"practice",
            "usedItemIds":[], "learnedItems":[{"text":"hello", "explanation":"こんにちは"}]
        }});
        assert_eq!(
            call(&client, "record_conversation", invalid).await.is_error,
            Some(true)
        );
        let words = call(&client, "list_vocabulary", json!({})).await;
        assert_eq!(words.structured_content.unwrap()["items"], json!([]));
        let history = call(&client, "list_conversations", json!({})).await;
        assert_eq!(
            history.structured_content.unwrap()["conversations"],
            json!([])
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
            "create_vocabulary",
            json!({"input": {"text": "こんにちは", "explanation": "hello"}}),
        )
        .await;
        assert_eq!(result.is_error, Some(true));
        let repo = VocabularyService(SqliteVocabularyRepository::open(&database.0).unwrap());
        for profile in ["default-en", "default-ja"] {
            assert!(repo.list(profile, StudyKind::Word).unwrap().is_empty());
        }
        database.select_language("ja");
        assert_eq!(
            call(&client, "list_vocabulary", json!({})).await.is_error,
            Some(false)
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
