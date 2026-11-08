use lemno_application::ConversationService;
use lemno_domain::{
    Conversation, ConversationDetail, ConversationInput, DEFAULT_PROFILE_ID, Topic, TopicInput,
};
use lemno_infrastructure::SqliteVocabularyRepository;
use tauri::State;

use crate::CommandError;

type Service = ConversationService<SqliteVocabularyRepository>;

#[tauri::command]
pub fn list_topics(service: State<'_, Service>) -> Result<Vec<Topic>, CommandError> {
    service.topics(DEFAULT_PROFILE_ID).map_err(Into::into)
}

#[tauri::command]
pub fn save_topic(
    service: State<'_, Service>,
    id: Option<String>,
    input: TopicInput,
) -> Result<Topic, CommandError> {
    service
        .save_topic(DEFAULT_PROFILE_ID, id.as_deref(), input)
        .map_err(Into::into)
}

#[tauri::command]
pub fn delete_topic(service: State<'_, Service>, id: String) -> Result<(), CommandError> {
    service
        .delete_topic(DEFAULT_PROFILE_ID, &id)
        .map_err(Into::into)
}

#[tauri::command]
pub fn list_conversations(service: State<'_, Service>) -> Result<Vec<Conversation>, CommandError> {
    service
        .conversations(DEFAULT_PROFILE_ID)
        .map_err(Into::into)
}

#[tauri::command]
pub fn get_conversation(
    service: State<'_, Service>,
    id: String,
) -> Result<ConversationDetail, CommandError> {
    service
        .conversation(DEFAULT_PROFILE_ID, &id)
        .map_err(Into::into)
}

#[tauri::command]
pub fn record_conversation(
    service: State<'_, Service>,
    input: ConversationInput,
) -> Result<ConversationDetail, CommandError> {
    service
        .record(DEFAULT_PROFILE_ID, input)
        .map_err(Into::into)
}
