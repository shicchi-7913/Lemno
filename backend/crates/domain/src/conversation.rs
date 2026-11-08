use serde::{Deserialize, Serialize};

use crate::{Error, VocabularyInput};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicInput {
    pub category: String,
    pub title: String,
    pub scenario: String,
    pub learner_role: String,
    pub ai_role: String,
    pub objective: String,
    pub difficulty: String,
}

impl TopicInput {
    pub fn normalized(self) -> Result<Self, Error> {
        let input = Self {
            category: self.category,
            title: self.title.trim().into(),
            scenario: self.scenario.trim().into(),
            learner_role: self.learner_role.trim().into(),
            ai_role: self.ai_role.trim().into(),
            objective: self.objective.trim().into(),
            difficulty: self.difficulty,
        };
        if !["daily", "work", "travel", "hobby"].contains(&input.category.as_str())
            || !["beginner", "intermediate", "advanced"].contains(&input.difficulty.as_str())
        {
            return Err(Error::Validation("topic"));
        }
        for (value, limit) in [
            (&input.title, 200),
            (&input.scenario, 2000),
            (&input.learner_role, 200),
            (&input.ai_role, 200),
            (&input.objective, 2000),
        ] {
            if value.is_empty() || value.chars().count() > limit {
                return Err(Error::Validation("topic"));
            }
        }
        Ok(input)
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Topic {
    pub id: String,
    #[serde(flatten)]
    pub input: TopicInput,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConversationInput {
    pub id: String,
    pub topic_id: Option<String>,
    pub ai: String,
    pub duration_minutes: i64,
    pub notes: String,
    pub used_item_ids: Vec<String>,
    pub learned_items: Vec<VocabularyInput>,
}

impl ConversationInput {
    pub fn normalized(self) -> Result<Self, Error> {
        let mut input = Self {
            notes: self.notes.trim().into(),
            ..self
        };
        if input.id.is_empty()
            || input.id.len() > 100
            || !(1..=1440).contains(&input.duration_minutes)
            || !["ChatGPT", "Claude Desktop"].contains(&input.ai.as_str())
            || input.notes.is_empty()
            || input.notes.chars().count() > 20000
            || input.used_item_ids.len() > 100
            || input.learned_items.len() > 100
        {
            return Err(Error::Validation("conversation"));
        }
        input.used_item_ids.sort();
        input.used_item_ids.dedup();
        input.learned_items = input
            .learned_items
            .into_iter()
            .map(VocabularyInput::normalized)
            .collect::<Result<_, _>>()?;
        Ok(input)
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub ai: String,
    pub duration_minutes: i64,
    pub notes: String,
    pub occurred_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Expression {
    pub id: String,
    pub text: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationDetail {
    #[serde(flatten)]
    pub conversation: Conversation,
    pub used_items: Vec<Expression>,
    pub learned_items: Vec<Expression>,
}

pub trait ConversationRepository {
    fn topics(&self, profile_id: &str) -> Result<Vec<Topic>, Error>;
    fn save_topic(
        &self,
        profile_id: &str,
        id: Option<&str>,
        input: &TopicInput,
    ) -> Result<Topic, Error>;
    fn delete_topic(&self, profile_id: &str, id: &str) -> Result<(), Error>;
    fn conversations(&self, profile_id: &str) -> Result<Vec<Conversation>, Error>;
    fn conversation(&self, profile_id: &str, id: &str) -> Result<ConversationDetail, Error>;
    fn record(
        &self,
        profile_id: &str,
        input: &ConversationInput,
    ) -> Result<ConversationDetail, Error>;
}
