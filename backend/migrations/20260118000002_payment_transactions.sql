-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_id UUID NOT NULL REFERENCES users(id),
    payee_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, rejected, verified
    method VARCHAR(50) NOT NULL DEFAULT 'cash', -- cash, bank_transfer, vietqr
    proof_image_url TEXT,
    reference_code VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payer ON payment_transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payee ON payment_transactions(payee_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- Create debt_transactions table (Junction to link payments to specific debts)
CREATE TABLE IF NOT EXISTS debt_transactions (
    transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(15, 2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (transaction_id, debt_id)
);

CREATE INDEX IF NOT EXISTS idx_debt_transactions_debt ON debt_transactions(debt_id);
