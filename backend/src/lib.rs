use lemno_application::VocabularyService;
use lemno_domain::{DEFAULT_PROFILE_ID, Error, Vocabulary, VocabularyInput};
use lemno_infrastructure::SqliteVocabularyRepository;
use serde::Serialize;
use tauri::{Manager, State};

type Service = VocabularyService<SqliteVocabularyRepository>;

#[derive(Serialize)]
struct CommandError {
    code: &'static str,
}

impl From<Error> for CommandError {
    fn from(error: Error) -> Self {
        let code = match error {
            Error::Validation(_) => "validation",
            Error::NotFound => "notFound",
            Error::Storage(message) => {
                eprintln!("Vocabulary storage error: {message}");
                "storage"
            }
        };
        Self { code }
    }
}

#[tauri::command]
fn list_vocabulary(service: State<'_, Service>) -> Result<Vec<Vocabulary>, CommandError> {
    service.list(DEFAULT_PROFILE_ID).map_err(Into::into)
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
fn delete_vocabulary(service: State<'_, Service>, id: String) -> Result<(), CommandError> {
    service.delete(DEFAULT_PROFILE_ID, &id).map_err(Into::into)
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_vocabulary,
            create_vocabulary,
            update_vocabulary,
            delete_vocabulary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
