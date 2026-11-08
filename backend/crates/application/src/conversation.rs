use lemno_domain::{
    Conversation, ConversationDetail, ConversationInput, ConversationRepository, Error, Topic,
    TopicInput,
};

pub struct ConversationService<R>(pub R);

impl<R: ConversationRepository> ConversationService<R> {
    pub fn topics(&self, profile_id: &str) -> Result<Vec<Topic>, Error> {
        self.0.topics(profile_id)
    }

    pub fn save_topic(
        &self,
        profile_id: &str,
        id: Option<&str>,
        input: TopicInput,
    ) -> Result<Topic, Error> {
        self.0.save_topic(profile_id, id, &input.normalized()?)
    }

    pub fn delete_topic(&self, profile_id: &str, id: &str) -> Result<(), Error> {
        self.0.delete_topic(profile_id, id)
    }

    pub fn conversations(&self, profile_id: &str) -> Result<Vec<Conversation>, Error> {
        self.0.conversations(profile_id)
    }

    pub fn conversation(&self, profile_id: &str, id: &str) -> Result<ConversationDetail, Error> {
        self.0.conversation(profile_id, id)
    }

    pub fn record(
        &self,
        profile_id: &str,
        input: ConversationInput,
    ) -> Result<ConversationDetail, Error> {
        self.0.record(profile_id, &input.normalized()?)
    }
}
