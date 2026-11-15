use lemno_application::{ConversationService, VocabularyService};
use lemno_domain::{DEFAULT_PROFILE_ID, Error, StudyKind, Vocabulary, VocabularyInput};
use lemno_infrastructure::SqliteVocabularyRepository;
use serde::Serialize;
use tauri::{Manager, State};

mod conversation;
mod mcp;

type Service = VocabularyService<SqliteVocabularyRepository>;

#[derive(Serialize)]
pub(crate) struct CommandError {
    code: &'static str,
}

impl From<Error> for CommandError {
    fn from(error: Error) -> Self {
        let code = match error {
            Error::Validation(_) => "validation",
            Error::NotFound => "notFound",
            Error::Storage(message) => {
                eprintln!("Lemno storage error: {message}");
                "storage"
            }
        };
        Self { code }
    }
}

#[tauri::command]
async fn open_chatgpt_app(prompt: String) -> Result<(), &'static str> {
    tauri::async_runtime::spawn_blocking(move || {
        #[cfg(target_os = "macos")]
        {
            let mut url = tauri::Url::parse("codex://new").map_err(|_| "chatgptLaunchFailed")?;
            url.query_pairs_mut().append_pair("prompt", &prompt);
            let status = std::process::Command::new("/usr/bin/open")
                .args(["-a", "ChatGPT", url.as_str()])
                .status()
                .map_err(|_| "chatgptLaunchFailed")?;
            if status.success() {
                Ok(())
            } else {
                Err("chatgptLaunchFailed")
            }
        }
        #[cfg(not(target_os = "macos"))]
        {
            Err("chatgptLaunchUnsupported")
        }
    })
    .await
    .map_err(|_| "chatgptLaunchFailed")?
}

#[tauri::command]
fn list_vocabulary(
    service: State<'_, Service>,
    profile_id: Option<String>,
    kind: Option<StudyKind>,
) -> Result<Vec<Vocabulary>, CommandError> {
    service
        .list(
            profile_id.as_deref().unwrap_or(DEFAULT_PROFILE_ID),
            kind.unwrap_or_default(),
        )
        .map_err(Into::into)
}

#[tauri::command]
fn create_vocabulary(
    service: State<'_, Service>,
    profile_id: Option<String>,
    input: VocabularyInput,
) -> Result<Vocabulary, CommandError> {
    service
        .create(profile_id.as_deref().unwrap_or(DEFAULT_PROFILE_ID), input)
        .map_err(Into::into)
}

#[tauri::command]
fn update_vocabulary(
    service: State<'_, Service>,
    profile_id: Option<String>,
    id: String,
    input: VocabularyInput,
) -> Result<Vocabulary, CommandError> {
    service
        .update(
            profile_id.as_deref().unwrap_or(DEFAULT_PROFILE_ID),
            &id,
            input,
        )
        .map_err(Into::into)
}

#[tauri::command]
fn delete_vocabulary(
    service: State<'_, Service>,
    profile_id: Option<String>,
    id: String,
    kind: Option<StudyKind>,
) -> Result<(), CommandError> {
    service
        .delete(
            profile_id.as_deref().unwrap_or(DEFAULT_PROFILE_ID),
            &id,
            kind.unwrap_or_default(),
        )
        .map_err(Into::into)
}

#[tauri::command]
fn review_vocabulary(
    service: State<'_, Service>,
    profile_id: Option<String>,
    id: String,
    kind: StudyKind,
    remembered: bool,
) -> Result<Vocabulary, CommandError> {
    service
        .review(
            profile_id.as_deref().unwrap_or(DEFAULT_PROFILE_ID),
            &id,
            kind,
            remembered,
        )
        .map_err(Into::into)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let repository = SqliteVocabularyRepository::open(data_dir.join("lemno.sqlite3"))?;
            app.manage(VocabularyService(repository));
            app.manage(ConversationService(SqliteVocabularyRepository::open(
                data_dir.join("lemno.sqlite3"),
            )?));
            app.manage(mcp::McpConnection {
                executable: std::env::current_exe()?,
                database: data_dir.join("lemno.sqlite3"),
                codex_config:
                    match std::env::var_os("CODEX_HOME").filter(|path| !path.is_empty()) {
                        Some(path) => std::path::PathBuf::from(path),
                        None => app.path().home_dir()?.join(".codex"),
                    }
                    .join("config.toml"),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_chatgpt_app,
            list_vocabulary,
            create_vocabulary,
            update_vocabulary,
            delete_vocabulary,
            review_vocabulary,
            conversation::list_topics,
            conversation::save_topic,
            conversation::delete_topic,
            conversation::list_conversations,
            conversation::get_conversation,
            conversation::record_conversation,
            conversation::save_conversation_review,
            mcp::get_codex_status,
            mcp::connect_codex
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
