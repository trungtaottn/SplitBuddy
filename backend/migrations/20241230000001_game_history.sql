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
