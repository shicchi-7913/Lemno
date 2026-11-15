ALTER TABLE conversation_sessions ADD COLUMN feedback TEXT NOT NULL DEFAULT '';
ALTER TABLE conversation_sessions ADD COLUMN reviewed_at TEXT;
ALTER TABLE conversation_learning_candidates ADD COLUMN learning_item_id TEXT
    REFERENCES learning_items(id) ON DELETE SET NULL;

-- Retain registrations made before reviews were saved as a single action.
UPDATE conversation_learning_candidates AS c
SET learning_item_id = (
    SELECT i.id FROM learning_items i
    JOIN session_learning_items s ON s.learning_item_id = i.id AND s.profile_id = i.profile_id
    WHERE s.session_id = c.session_id AND s.profile_id = c.profile_id
      AND i.kind = c.kind AND i.text = c.text AND i.explanation = c.explanation
      AND i.example_text = c.example_text
    ORDER BY i.rowid LIMIT 1
)
WHERE c.reviewed = 1;

-- Existing completed sessions remain completed. Partially reviewed sessions stay open.
UPDATE conversation_sessions SET reviewed_at = occurred_at
WHERE status = 'recorded' AND NOT EXISTS (
    SELECT 1 FROM conversation_learning_candidates c
    WHERE c.session_id = conversation_sessions.id AND c.reviewed = 0
);
