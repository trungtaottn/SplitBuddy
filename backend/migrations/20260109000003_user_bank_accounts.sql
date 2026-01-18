-- Create user_bank_accounts table for storing bank account information
CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(200) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, account_number)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_default ON user_bank_accounts(user_id, is_default) WHERE is_default = true;
