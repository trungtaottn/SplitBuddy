-- Game Content: Store game questions/challenges
CREATE TABLE IF NOT EXISTS game_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'question',
    content TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_content_type ON game_content(game_type);
CREATE INDEX IF NOT EXISTS idx_game_content_difficulty ON game_content(difficulty);

-- Seed some default game content
INSERT INTO game_content (game_type, content_type, content, difficulty) VALUES
-- Truth or Dare
('truth_or_dare', 'truth', 'Bạn đã bao giờ nói dối người yêu chưa?', 'easy'),
('truth_or_dare', 'truth', 'Điều gì khiến bạn xấu hổ nhất?', 'medium'),
('truth_or_dare', 'truth', 'Bạn đã làm điều gì mà không ai biết?', 'hard'),
('truth_or_dare', 'dare', 'Nhảy một điệu ngẫu nhiên trong 30 giây', 'easy'),
('truth_or_dare', 'dare', 'Gọi điện cho người cuối cùng trong danh bạ', 'medium'),
('truth_or_dare', 'dare', 'Uống 2 shot liên tiếp', 'hard'),
-- Never Have I Ever
('never_have_i_ever', 'question', 'Tôi chưa bao giờ say đến mất trí nhớ', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ nhắn tin nhầm người', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ bị bắt quả tang nói xấu', 'hard'),
-- Challenge
('challenge', 'action', 'Uống hết ly trong 10 giây', 'easy'),
('challenge', 'action', 'Làm 10 cái hít đất', 'medium'),
('challenge', 'action', 'Hát một bài hát do người bên cạnh chọn', 'hard')
ON CONFLICT DO NOTHING;

-- Game History: Track game plays in sessions
CREATE TABLE game_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    content_id UUID REFERENCES game_content(id) ON DELETE SET NULL,
    content_text TEXT NOT NULL,
    difficulty VARCHAR(20),
    player_id UUID REFERENCES session_participants(id) ON DELETE SET NULL,
    result VARCHAR(50),
    drink_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_history_session ON game_history(session_id);
CREATE INDEX idx_game_history_player ON game_history(player_id);

-- Custom Questions: User-created game content
CREATE TABLE custom_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'question',
    content TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium',
    is_public BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_questions_user ON custom_questions(user_id);
CREATE INDEX idx_custom_questions_game_type ON custom_questions(game_type);

-- Drinking Stats: Track drinking per participant per session
CREATE TABLE drinking_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    total_drinks INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    last_drink_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_session_participant_stats UNIQUE (session_id, participant_id)
);

CREATE INDEX idx_drinking_stats_session ON drinking_stats(session_id);
CREATE INDEX idx_drinking_stats_participant ON drinking_stats(participant_id);
