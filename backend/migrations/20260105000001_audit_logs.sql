-- Audit log table for tracking important actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    -- Who performed the action
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255), -- Preserved even if user is deleted
    
    -- What action was performed
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'session', 'bill', 'debt', 'user', 'feature_flag', etc.
    entity_id UUID, -- The ID of the affected entity
    
    -- Additional context
    description TEXT,
    metadata JSONB DEFAULT '{}', -- Additional structured data
    
    -- Client info
    ip_address VARCHAR(45), -- IPv6 compatible
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Example audit log actions:
-- AUTH: 'login', 'logout', 'register', 'password_change', 'password_reset'
-- SESSION: 'session_create', 'session_close', 'session_reopen', 'session_delete'
-- BILL: 'bill_create', 'bill_update', 'bill_delete'
-- DEBT: 'settlement_request', 'settlement_confirm', 'settlement_reject'
-- ADMIN: 'user_create', 'user_update', 'feature_toggle', 'music_upload', 'music_delete'
