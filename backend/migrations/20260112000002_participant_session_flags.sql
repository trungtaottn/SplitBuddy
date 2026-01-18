-- Add participant weights and active flags, session debt strategy, and archiving

ALTER TABLE session_participants
    ADD COLUMN IF NOT EXISTS default_weight INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'check_participant_weight'
    ) THEN
        ALTER TABLE session_participants
            ADD CONSTRAINT check_participant_weight CHECK (default_weight > 0);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_session_participants_active
    ON session_participants(session_id, is_active);

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS minimize_debts BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_archived_at ON sessions(archived_at);
CREATE INDEX IF NOT EXISTS idx_groups_archived_at ON groups(archived_at);
