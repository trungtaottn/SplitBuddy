-- Additional performance indexes for Session and Bill queries

-- 1. Optimize fetching bills for a session (ordered by creation date)
-- Used in: GET /sessions/{id}/bills
CREATE INDEX IF NOT EXISTS idx_bills_session_created 
    ON bills(session_id, created_at DESC);

-- 2. Optimize session list fetching for a user
-- Used in: GET /sessions (dashboard list)
-- Including role to avoid extra lookup if just needing basic info
CREATE INDEX IF NOT EXISTS idx_session_participants_lookup 
    ON session_participants(user_id, session_id) 
    INCLUDE (role);

-- 3. Optimize filtering for archived/active sessions
-- Used in: GET /sessions (filtering)
CREATE INDEX IF NOT EXISTS idx_sessions_archived_lookup 
    ON sessions(created_by, status, archived_at) 
    WHERE archived_at IS NOT NULL;
