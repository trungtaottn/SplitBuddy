-- Spin History: Track wheel spins in sessions
CREATE TABLE IF NOT EXISTS spin_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    winner_participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    spin_type VARCHAR(50) NOT NULL DEFAULT 'random',
    custom_task TEXT,
    spun_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spin_history_session ON spin_history(session_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_winner ON spin_history(winner_participant_id);
