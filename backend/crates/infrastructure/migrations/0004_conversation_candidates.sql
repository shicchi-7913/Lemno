CREATE TABLE conversation_learning_candidates (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('word', 'phrase')),
    text TEXT NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 200),
    explanation TEXT NOT NULL CHECK (length(trim(explanation)) BETWEEN 1 AND 2000),
    example_text TEXT NOT NULL DEFAULT '' CHECK (length(example_text) <= 2000),
    reviewed INTEGER NOT NULL DEFAULT 0 CHECK (reviewed IN (0, 1)),
    FOREIGN KEY (session_id, profile_id) REFERENCES conversation_sessions(id, profile_id) ON DELETE CASCADE
);
CREATE INDEX conversation_candidates_pending ON conversation_learning_candidates(session_id, profile_id, reviewed);
