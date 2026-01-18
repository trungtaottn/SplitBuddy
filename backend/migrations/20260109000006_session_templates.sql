-- Create session_templates table
CREATE TABLE IF NOT EXISTS session_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(500),
    participant_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_session_templates_user_id ON session_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_name ON session_templates(user_id, name);
