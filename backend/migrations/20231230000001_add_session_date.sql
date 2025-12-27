-- Add session_date column to sessions table
ALTER TABLE sessions ADD COLUMN session_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create index for session_date
CREATE INDEX idx_sessions_session_date ON sessions(session_date);
