ALTER TABLE topics ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'beginner'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE conversation_sessions ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE conversation_sessions ADD COLUMN ai TEXT NOT NULL DEFAULT 'ChatGPT';
ALTER TABLE conversation_sessions ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (duration_minutes BETWEEN 0 AND 1440);
ALTER TABLE conversation_sessions ADD COLUMN notes TEXT NOT NULL DEFAULT '';

CREATE TABLE session_learning_items (
    session_id TEXT NOT NULL,
    learning_item_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    PRIMARY KEY (session_id, learning_item_id),
    FOREIGN KEY (session_id, profile_id) REFERENCES conversation_sessions(id, profile_id) ON DELETE CASCADE,
    FOREIGN KEY (learning_item_id, profile_id) REFERENCES learning_items(id, profile_id) ON DELETE CASCADE
);

INSERT INTO topics
    (id, master_id, profile_id, category, title, scenario, learner_role, ai_role, objective, difficulty, created_at, updated_at)
VALUES
    ('seed-weekend', 'weekend', 'default-en', 'daily', '週末の過ごし方', '最近の休日にしたことや、次の週末の予定について話してみよう。', '休日の予定を話す友人', '会話相手の友人', '過去の出来事とこれからの予定を伝える', 'beginner', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('seed-remote', 'remote', 'default-en', 'work', 'リモートワークの働き方', '仕事のスタイルや、集中するためにしている工夫を紹介する。', 'リモートで働く同僚', '仕事の工夫を聞く同僚', '働き方について理由を添えて意見を交換する', 'intermediate', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('seed-travel', 'travel', 'default-en', 'travel', '旅先でのちょっとしたトラブル', 'ホテルや駅で困ったとき、状況を説明して助けを求める。', '旅行者', 'ホテルのスタッフ', '困っている状況を説明し、解決策を相談する', 'intermediate', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('seed-hobbies', 'hobbies', 'default-en', 'hobby', '最近ハマっていること', '好きな音楽・映画・趣味について、理由と一緒に話す。', '趣味を紹介する友人', '興味を持って質問する友人', '好きなことを理由や感想と一緒に伝える', 'beginner', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('seed-restaurant', 'restaurant', 'default-en', 'daily', 'レストランでの注文', 'おすすめを聞いたり、苦手な食材を伝えてみる。', 'レストランの客', 'レストランの店員', '希望を伝えて食事を注文する', 'beginner', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('seed-ideas', 'ideas', 'default-en', 'work', '新しいアイデアの提案', 'チームにアイデアを説明して、質問に答えてみる。', '新しい企画の提案者', '提案を検討するチームメンバー', '提案の利点を説明し、質問に具体的に答える', 'advanced', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
