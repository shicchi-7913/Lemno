use lemno_application::{ConversationService, VocabularyService};
use lemno_domain::{DEFAULT_PROFILE_ID, Error, StudyKind, Vocabulary, VocabularyInput};
use lemno_infrastructure::SqliteVocabularyRepository;
use serde::Serialize;
use tauri::{Manager, State};

mod conversation;

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
fn list_vocabulary(
    service: State<'_, Service>,
    kind: Option<StudyKind>,
) -> Result<Vec<Vocabulary>, CommandError> {
    service
        .list(DEFAULT_PROFILE_ID, kind.unwrap_or_default())
        .map_err(Into::into)
}

#[tauri::command]
fn create_vocabulary(
    service: State<'_, Service>,
    input: VocabularyInput,
) -> Result<Vocabulary, CommandError> {
    service
        .create(DEFAULT_PROFILE_ID, input)
        .map_err(Into::into)
}

#[tauri::command]
fn update_vocabulary(
    service: State<'_, Service>,
    id: String,
    input: VocabularyInput,
) -> Result<Vocabulary, CommandError> {
    service
        .update(DEFAULT_PROFILE_ID, &id, input)
        .map_err(Into::into)
}

#[tauri::command]
fn delete_vocabulary(
    service: State<'_, Service>,
    id: String,
    kind: Option<StudyKind>,
) -> Result<(), CommandError> {
    service
        .delete(DEFAULT_PROFILE_ID, &id, kind.unwrap_or_default())
        .map_err(Into::into)
}

#[tauri::command]
fn review_vocabulary(
    service: State<'_, Service>,
    id: String,
    kind: StudyKind,
    remembered: bool,
) -> Result<Vocabulary, CommandError> {
    service
        .review(DEFAULT_PROFILE_ID, &id, kind, remembered)
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
            conversation::record_conversation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
