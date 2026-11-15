use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
    sync::Arc,
};

use lemno_application::{ConversationService, VocabularyService};
use lemno_domain::{ConversationInput, DEFAULT_PROFILE_ID, Error, StudyKind, VocabularyInput};
use lemno_infrastructure::SqliteVocabularyRepository;
use rmcp::{
    ErrorData, RoleServer, ServerHandler,
    model::{
        CallToolRequestParams, CallToolResponse, CallToolResult, ContentBlock, Implementation,
        ListToolsResult, PaginatedRequestParams, ServerCapabilities, ServerConfig, Tool,
    },
    service::RequestContext,
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Value, json};

use crate::McpResult;

#[derive(Clone)]
pub struct LearningServer {
    vocabulary: Arc<VocabularyService<SqliteVocabularyRepository>>,
    conversations: Arc<ConversationService<SqliteVocabularyRepository>>,
    language_settings: PathBuf,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Empty {}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ListVocabulary {
    #[serde(default)]
    kind: StudyKind,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Input<T> {
    input: T,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Id {
    id: String,
}

fn arguments<T: DeserializeOwned>(value: Value) -> Result<T, Error> {
    serde_json::from_value(value).map_err(|_| Error::Validation("arguments"))
}

fn result(value: impl Serialize) -> Result<Value, Error> {
    serde_json::to_value(value).map_err(|e| Error::Storage(e.to_string()))
}

impl LearningServer {
    pub fn open(database: &Path) -> McpResult<Self> {
        Ok(Self {
            vocabulary: Arc::new(VocabularyService(SqliteVocabularyRepository::open(
                database,
            )?)),
            conversations: Arc::new(ConversationService(SqliteVocabularyRepository::open(
                database,
            )?)),
            language_settings: database.with_file_name("learning-language.json"),
        })
    }

    fn current_profile(&self) -> Result<&'static str, Error> {
        let source = match fs::read(&self.language_settings) {
            Ok(source) => source,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(DEFAULT_PROFILE_ID),
            Err(error) => return Err(Error::Storage(error.to_string())),
        };
        let settings: serde_json::Map<String, Value> =
            serde_json::from_slice(&source).map_err(|error| Error::Storage(error.to_string()))?;
        // Match the desktop's saved-language handling, including its English default.
        Ok(
            if settings.get("language").and_then(Value::as_str) == Some("ja") {
                "default-ja"
            } else {
                DEFAULT_PROFILE_ID
            },
        )
    }

    fn execute(&self, name: &str, args: Value) -> Result<Value, Error> {
        let profile = self.current_profile()?;
        match name {
            "list_vocabulary" => {
                let args: ListVocabulary = arguments(args)?;
                result(json!({ "items": self.vocabulary.list(profile, args.kind)? }))
            }
            "create_vocabulary" => {
                let args: Input<VocabularyInput> = arguments(args)?;
                result(self.vocabulary.create(profile, args.input)?)
            }
            "list_topics" => {
                let _: Empty = arguments(args)?;
                result(json!({ "topics": self.conversations.topics(profile)? }))
            }
            "list_conversations" => {
                let _: Empty = arguments(args)?;
                result(json!({ "conversations": self.conversations.conversations(profile)? }))
            }
            "get_conversation" => {
                let args: Id = arguments(args)?;
                result(self.conversations.conversation(profile, &args.id)?)
            }
            "record_conversation" => {
                let args: Input<ConversationInput> = arguments(args)?;
                result(self.conversations.record(profile, args.input)?)
            }
            _ => unreachable!("Tool names are checked before dispatch"),
        }
    }

    pub fn tools() -> Vec<Tool> {
        // Static schemas keep the MCP adapter independent of the domain's data format libraries.
        serde_json::from_str(include_str!("tools.json")).expect("Valid built-in MCP tool schemas")
    }
}

impl ServerHandler for LearningServer {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("lemno", env!("CARGO_PKG_VERSION")))
            .with_instructions(
                "Lemno uses the learning language currently selected in the desktop app. \
                 The language is read on every tool call, so switching languages needs no reconnection. \
                 List topics and vocabulary before practice. \
                 Only record expressions the learner actually used. When the learner asks to save \
                 after practice, use record_conversation to save the summary in notes, AI feedback in \
                 feedback (strengths, concrete corrections and next steps), and new word/phrase \
                 candidates in learnedItems. Candidates are not added to vocabulary: \
                 the learner reviews the feedback, checks new expressions and saves the review in Lemno. Do not use create_vocabulary \
                 for these candidates. Reuse the same conversation input.id on retries to avoid \
                 duplicates. Use ai=ChatGPT."
                    .to_owned(),
            )
    }

    async fn list_tools(
        &self,
        _: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, ErrorData> {
        Ok(ListToolsResult {
            tools: Self::tools(),
            ..Default::default()
        })
    }

    fn get_tool(&self, name: &str) -> Option<Tool> {
        Self::tools().into_iter().find(|tool| tool.name == name)
    }

    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        _: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, ErrorData> {
        if self.get_tool(&request.name).is_none() {
            return Err(ErrorData::invalid_params("Unknown tool", None));
        }
        let server = self.clone();
        // SQLite waits and transactions must not block the MCP runtime's IO tasks.
        let output = tokio::task::spawn_blocking(move || {
            server.execute(
                &request.name,
                Value::Object(request.arguments.unwrap_or_default()),
            )
        })
        .await
        .map_err(|_| ErrorData::internal_error("Learning task failed", None))?;
        let output = match output {
            Ok(value) => CallToolResult::structured(value),
            Err(error) => {
                let message = match error {
                    Error::Validation(field) => format!("Invalid {field}. Check the tool input."),
                    Error::NotFound => "Item not found in this learning language.".into(),
                    Error::Storage(message) => {
                        eprintln!("Lemno MCP storage error: {message}");
                        "Could not access learning data. Try again.".into()
                    }
                };
                CallToolResult::error(vec![ContentBlock::text(message)])
            }
        };
        Ok(output.into())
    }
}
