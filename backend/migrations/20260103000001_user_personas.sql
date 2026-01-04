-- User Personas & Achievements System

-- Achievements definitions
CREATE TABLE IF NOT EXISTS achievements (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT '🏆',
    category VARCHAR(50) DEFAULT 'general',
    xp_reward INT DEFAULT 10,
    criteria JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User personas (avatar, level, titles)
CREATE TABLE IF NOT EXISTS user_personas (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    avatar_style VARCHAR(50) DEFAULT 'default',
    avatar_accessories JSONB DEFAULT '[]',
    avatar_background VARCHAR(50) DEFAULT 'default',
    avatar_frame VARCHAR(50) DEFAULT 'none',
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    current_title VARCHAR(50),
    display_badges VARCHAR(50)[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (unlocked)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_code VARCHAR(50) NOT NULL REFERENCES achievements(code),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_code)
);

-- Wrapped data cache
CREATE TABLE IF NOT EXISTS user_wrapped (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    period VARCHAR(20) DEFAULT 'yearly', -- 'yearly', 'q1', 'q2', 'q3', 'q4'
    stats JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year, period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wrapped_user_year ON user_wrapped(user_id, year);

-- Seed default achievements
INSERT INTO achievements (code, name, description, icon, category, xp_reward, criteria) VALUES
-- Spending titles
('budget_king', 'Budget King', 'Average spending lower than group average', '👑', 'spending', 50, '{"type": "avg_spending_low"}'),
('big_spender', 'Big Spender', 'Highest spending in a month', '💸', 'spending', 30, '{"type": "highest_monthly"}'),
('generous_soul', 'Generous Soul', 'Treated others 10+ times', '🎁', 'spending', 100, '{"type": "treat_count", "min": 10}'),

-- Activity titles
('party_starter', 'Party Starter', 'Created 10+ sessions', '🎉', 'activity', 50, '{"type": "sessions_created", "min": 10}'),
('night_owl', 'Night Owl', 'Attended 5+ sessions after 10pm', '🦉', 'activity', 30, '{"type": "late_sessions", "min": 5}'),
('weekend_warrior', 'Weekend Warrior', 'Only parties on weekends', '⚔️', 'activity', 40, '{"type": "weekend_only"}'),
('streak_master', 'Streak Master', 'Partied 4 weeks in a row', '🔥', 'activity', 60, '{"type": "weekly_streak", "min": 4}'),
('social_butterfly', 'Social Butterfly', 'Partied with 20+ different people', '🦋', 'activity', 80, '{"type": "unique_partners", "min": 20}'),

-- Payment titles  
('quick_settler', 'Quick Settler', 'Settled debts within 24 hours', '⚡', 'payment', 40, '{"type": "quick_payment"}'),
('debt_free', 'Debt Free', 'No outstanding debts for 30 days', '✨', 'payment', 50, '{"type": "debt_free_days", "min": 30}'),
('trustworthy', 'Trustworthy', '100% on-time payment rate', '🤝', 'payment', 100, '{"type": "payment_rate", "min": 100}'),

-- Game titles
('lucky_one', 'Lucky One', 'Won 10+ games', '🍀', 'games', 30, '{"type": "games_won", "min": 10}'),
('quiz_master', 'Quiz Master', 'Won 5+ number guessing games', '🧠', 'games', 40, '{"type": "quiz_wins", "min": 5}'),
('gambler', 'Gambler', 'Played 50+ games', '🎰', 'games', 50, '{"type": "games_played", "min": 50}'),

-- Special titles
('founding_member', 'Founding Member', 'Joined in the early days', '⭐', 'special', 100, '{"type": "join_date_before", "date": "2026-06-01"}'),
('legend', 'Legend', 'Reached level 50', '👑', 'special', 200, '{"type": "level", "min": 50}'),
('centurion', 'Centurion', 'Attended 100 sessions', '💯', 'special', 150, '{"type": "sessions_attended", "min": 100}')
ON CONFLICT (code) DO NOTHING;
