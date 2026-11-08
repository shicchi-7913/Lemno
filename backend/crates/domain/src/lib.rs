use serde::{Deserialize, Serialize};

mod conversation;
pub use conversation::*;

pub const DEFAULT_PROFILE_ID: &str = "default-en";

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum StudyKind {
    #[default]
    Word,
    Phrase,
}

impl StudyKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Word => "word",
            Self::Phrase => "phrase",
        }
    }
}

#[derive(Debug)]
pub enum Error {
    Validation(&'static str),
    NotFound,
    Storage(String),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Validation(field) => write!(f, "Invalid {field}"),
            Self::NotFound => write!(f, "Vocabulary not found"),
            Self::Storage(message) => write!(f, "Storage error: {message}"),
        }
    }
}

impl std::error::Error for Error {}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Vocabulary {
    pub id: String,
    pub profile_id: String,
    pub text: String,
    pub explanation: String,
    pub example_text: String,
    pub memory_level: i64,
    pub review_count: i64,
    pub reviewed_today: i64,
    pub usage_count: i64,
    pub created_at: String,
    pub updated_at: String,
    pub kind: StudyKind,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VocabularyInput {
    #[serde(default)]
    pub kind: StudyKind,
    pub text: String,
    pub explanation: String,
    #[serde(default)]
    pub example_text: String,
}

impl VocabularyInput {
    pub fn normalized(self) -> Result<Self, Error> {
        let input = Self {
            kind: self.kind,
            text: self.text.trim().to_owned(),
            explanation: self.explanation.trim().to_owned(),
            example_text: self.example_text.trim().to_owned(),
        };
        if input.text.is_empty() || input.text.chars().count() > 200 {
            return Err(Error::Validation("text"));
        }
        if input.explanation.is_empty() || input.explanation.chars().count() > 2000 {
            return Err(Error::Validation("explanation"));
        }
        if input.example_text.chars().count() > 2000 {
            return Err(Error::Validation("exampleText"));
        }
        Ok(input)
    }
}

pub trait VocabularyRepository {
    fn list(&self, profile_id: &str, kind: StudyKind) -> Result<Vec<Vocabulary>, Error>;
    fn create(&self, profile_id: &str, input: &VocabularyInput) -> Result<Vocabulary, Error>;
    fn update(
        &self,
        profile_id: &str,
        id: &str,
        input: &VocabularyInput,
    ) -> Result<Vocabulary, Error>;
    fn delete(&self, profile_id: &str, id: &str, kind: StudyKind) -> Result<(), Error>;
    fn review(
        &self,
        profile_id: &str,
        id: &str,
        kind: StudyKind,
        remembered: bool,
    ) -> Result<Vocabulary, Error>;
}
