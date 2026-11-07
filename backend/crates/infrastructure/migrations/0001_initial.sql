CREATE TABLE learning_profiles (
    id TEXT PRIMARY KEY,
    target_language_tag TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO learning_profiles (id, target_language_tag) VALUES ('default-en', 'en');

CREATE TABLE learning_items (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('word', 'phrase')),
    text TEXT NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 200),
    explanation TEXT NOT NULL CHECK (length(trim(explanation)) BETWEEN 1 AND 2000),
    example_text TEXT NOT NULL DEFAULT '' CHECK (length(example_text) <= 2000),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (id, profile_id)
);
CREATE INDEX learning_items_profile ON learning_items(profile_id, kind);

-- No scheduling algorithm is chosen yet. New items start at memory level zero.
CREATE TABLE review_states (
    learning_item_id TEXT PRIMARY KEY REFERENCES learning_items(id) ON DELETE CASCADE,
    memory_level INTEGER NOT NULL DEFAULT 0 CHECK (memory_level >= 0),
    next_review_at TEXT,
    last_reviewed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX review_states_due ON review_states(next_review_at);
CREATE TABLE review_records (
    id TEXT PRIMARY KEY,
    learning_item_id TEXT NOT NULL REFERENCES learning_items(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    memory_level_after INTEGER NOT NULL CHECK (memory_level_after >= 0),
    next_review_at_after TEXT,
    reviewed_at TEXT NOT NULL
);
CREATE INDEX review_records_item ON review_records(learning_item_id, reviewed_at);

CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    master_id TEXT UNIQUE,
    profile_id TEXT NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    scenario TEXT NOT NULL,
    learner_role TEXT NOT NULL,
    ai_role TEXT NOT NULL,
    objective TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX topics_profile ON topics(profile_id, category);
CREATE TABLE conversation_sessions (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('preparing', 'recorded')),
    occurred_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (status != 'recorded' OR occurred_at IS NOT NULL),
    UNIQUE (id, profile_id)
);
CREATE INDEX sessions_profile ON conversation_sessions(profile_id, status, occurred_at);
CREATE TABLE usage_records (
    session_id TEXT NOT NULL,
    learning_item_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    ai_usage_count INTEGER CHECK (ai_usage_count >= 0),
    manual_usage_count INTEGER CHECK (manual_usage_count >= 0),
    evidence TEXT,
    recorded_at TEXT NOT NULL,
    manual_updated_at TEXT,
    PRIMARY KEY (session_id, learning_item_id),
    FOREIGN KEY (session_id, profile_id) REFERENCES conversation_sessions(id, profile_id) ON DELETE CASCADE,
    FOREIGN KEY (learning_item_id, profile_id) REFERENCES learning_items(id, profile_id) ON DELETE CASCADE,
    CHECK (ai_usage_count IS NOT NULL OR manual_usage_count IS NOT NULL)
);
CREATE INDEX usage_records_item ON usage_records(learning_item_id, session_id);
