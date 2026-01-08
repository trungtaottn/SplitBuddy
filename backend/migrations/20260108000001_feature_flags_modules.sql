-- Add module grouping to feature flags
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS module VARCHAR(50) DEFAULT 'general';

-- Create index for module filtering
CREATE INDEX IF NOT EXISTS idx_feature_flags_module ON feature_flags(module);

-- Update existing flags with module assignments
UPDATE feature_flags SET module = 'general' WHERE key IN ('dashboard', 'ai_assistant', 'notifications');
UPDATE feature_flags SET module = 'sessions' WHERE key IN ('sessions');
UPDATE feature_flags SET module = 'groups' WHERE key IN ('groups');
UPDATE feature_flags SET module = 'debts' WHERE key IN ('debts');
UPDATE feature_flags SET module = 'games' WHERE key LIKE 'game%' OR key = 'games';

-- Add new feature flags for group debts specifically
INSERT INTO feature_flags (key, name, description, enabled, module) VALUES
    ('group_debts', 'Công nợ nhóm', 'Xem công nợ tổng hợp theo nhóm', true, 'groups'),
    ('group_debts_simplified', 'Công nợ nhóm đơn giản hóa', 'Xem công nợ nhóm đã tối ưu', true, 'groups')
ON CONFLICT (key) DO NOTHING;
