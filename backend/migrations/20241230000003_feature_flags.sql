-- Feature flags table for admin to control app features
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);

-- Seed default feature flags for all views/features
INSERT INTO feature_flags (key, name, description, enabled) VALUES
    ('dashboard', 'Trang chủ', 'Hiển thị trang dashboard chính', true),
    ('sessions', 'Quản lý buổi nhậu', 'Tính năng tạo và quản lý session', true),
    ('groups', 'Nhóm bạn nhậu', 'Tính năng quản lý nhóm bạn', true),
    ('debts', 'Theo dõi nợ', 'Tính năng theo dõi và thanh toán nợ', true),
    ('games', 'Mini Games', 'Các trò chơi uống bia', true),
    ('game_truth_dare', 'Sự thật hay Thách thức', 'Trò chơi Truth or Dare', true),
    ('game_never_have_i', 'Tôi chưa bao giờ', 'Trò chơi Never Have I Ever', true),
    ('game_challenges', 'Thử thách', 'Trò chơi thử thách theo độ khó', true),
    ('game_dice', 'Tung xúc xắc', 'Trò chơi tung 2 xúc xắc', true),
    ('game_spin_wheel', 'Vòng quay may mắn', 'Vòng quay chọn người', true),
    ('game_drinking_counter', 'Đếm số shot', 'Đếm số lượng uống', true),
    ('game_player_rotation', 'Lượt chơi', 'Hệ thống xoay vòng người chơi', true),
    ('game_kings_cup', 'King''s Cup', 'Trò chơi bốc bài King''s Cup', true),
    ('game_most_likely', 'Ai có khả năng nhất', 'Trò chơi Most Likely To', true),
    ('game_categories', 'Kể tên theo chủ đề', 'Trò chơi Categories', true),
    ('game_high_low', 'Cao hay Thấp', 'Trò chơi đoán bài cao thấp', true),
    ('ai_assistant', 'AI Assistant', 'Tính năng AI hỗ trợ', true),
    ('notifications', 'Thông báo', 'Hệ thống thông báo', true);
