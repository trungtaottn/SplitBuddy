-- Performance indexes for common query patterns
-- This migration adds indexes to improve query performance
-- Note: Only creates indexes that don't already exist

-- Sessions: Query by date range (dashboard, history)
-- session_date added in later migration, created_at and status indexes may exist
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON sessions(session_date DESC);

-- Bills: Permission checks
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);

-- Debts: User debt queries (critical for dashboard performance)
CREATE INDEX IF NOT EXISTS idx_debts_debtor_status ON debts(debtor_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_creditor_status ON debts(creditor_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_settled_at ON debts(settled_at) WHERE settled_at IS NOT NULL;

-- Game history: Leaderboard queries (player_id, not user_id)
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_session_player ON game_history(session_id, player_id);

-- User personas: XP leaderboard
CREATE INDEX IF NOT EXISTS idx_user_personas_level_xp ON user_personas(level DESC, xp DESC);

-- User achievements: Achievement checks
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- Custom questions: Public questions lookup
CREATE INDEX IF NOT EXISTS idx_custom_questions_public ON custom_questions(game_type, is_public) 
    WHERE is_public = true;

-- Drinking stats: Session leaderboard
CREATE INDEX IF NOT EXISTS idx_drinking_stats_session_drinks ON drinking_stats(session_id, total_drinks DESC);

-- Users: Admin queries and role-based access (role added in later migration)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Groups: Member queries
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- Audit logs: Query optimization
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Feature flags: Fast lookup by key
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
