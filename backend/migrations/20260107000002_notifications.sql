-- In-app notifications system
-- Supports real-time notification delivery via WebSocket

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
    'settlement_request',
    'settlement_confirmed',
    'settlement_rejected',
    'bill_added',
    'added_to_session',
    'removed_from_session',
    'session_closed',
    'achievement_unlocked',
    'system'
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Index for fetching unread notifications (most common query)
CREATE INDEX idx_notifications_user_unread 
    ON notifications(user_id, is_read, created_at DESC) 
    WHERE is_read = false;

-- Index for fetching all notifications with pagination
CREATE INDEX idx_notifications_user_created 
    ON notifications(user_id, created_at DESC);

-- User wrapped table for caching yearly/quarterly stats
CREATE TABLE IF NOT EXISTS user_wrapped (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'yearly',
    stats JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, year, period)
);

CREATE INDEX IF NOT EXISTS idx_user_wrapped_user_year ON user_wrapped(user_id, year, period);
