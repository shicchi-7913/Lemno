use lemno_domain::{Error, StudyKind, Vocabulary, VocabularyInput, VocabularyRepository};

mod conversation;
pub use conversation::ConversationService;

/// Shared entry point for desktop commands and a future MCP adapter.
pub struct VocabularyService<R>(pub R);

impl<R: VocabularyRepository> VocabularyService<R> {
    pub fn list(&self, profile_id: &str, kind: StudyKind) -> Result<Vec<Vocabulary>, Error> {
        self.0.list(profile_id, kind)
    }

    pub fn create(&self, profile_id: &str, input: VocabularyInput) -> Result<Vocabulary, Error> {
        self.0.create(profile_id, &input.normalized()?)
    }

    pub fn update(
        &self,
        profile_id: &str,
        id: &str,
        input: VocabularyInput,
    ) -> Result<Vocabulary, Error> {
        self.0.update(profile_id, id, &input.normalized()?)
    }

    pub fn delete(&self, profile_id: &str, id: &str, kind: StudyKind) -> Result<(), Error> {
        self.0.delete(profile_id, id, kind)
    }

    pub fn review(
        &self,
        profile_id: &str,
        id: &str,
        kind: StudyKind,
        remembered: bool,
    ) -> Result<Vocabulary, Error> {
        self.0.review(profile_id, id, kind, remembered)
    }
}
