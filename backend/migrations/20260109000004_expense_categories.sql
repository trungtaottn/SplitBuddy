-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);

-- Add category_id to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id);

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_bills_category_id ON bills(category_id);

-- Insert default categories
INSERT INTO expense_categories (id, name, icon, color, is_system) VALUES
    (gen_random_uuid(), 'Đồ ăn', '🍽️', '#FF6B6B', true),
    (gen_random_uuid(), 'Đồ uống', '🍺', '#4ECDC4', true),
    (gen_random_uuid(), 'Karaoke', '🎤', '#95E1D3', true),
    (gen_random_uuid(), 'Vận chuyển', '🚗', '#F38181', true),
    (gen_random_uuid(), 'Giải trí', '🎮', '#AA96DA', true),
    (gen_random_uuid(), 'Khác', '📦', '#C7CEEA', true)
ON CONFLICT (name) DO NOTHING;
