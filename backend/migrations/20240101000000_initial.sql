-- Initial Migration for SplitBuddy
-- Creates all core tables for the MVP

-- Custom Types
CREATE TYPE session_status AS ENUM ('active', 'closed');
CREATE TYPE participant_role AS ENUM ('owner', 'member');
CREATE TYPE split_strategy AS ENUM ('EQUAL', 'CUSTOM', 'WEIGHTED');
CREATE TYPE debt_status AS ENUM ('pending', 'settlement_requested', 'settled');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Sessions Table (Cuộc nhậu)
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    status session_status NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_created_by ON sessions(created_by);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Session Participants Table
CREATE TABLE session_participants (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    guest_name VARCHAR(255),
    role participant_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Either user_id or guest_name must be provided
    CONSTRAINT check_participant CHECK (
        (user_id IS NOT NULL) OR (guest_name IS NOT NULL)
    ),
    -- Prevent duplicate user in same session
    CONSTRAINT unique_user_per_session UNIQUE (session_id, user_id)
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);

-- Bills Table (Hoá đơn)
CREATE TABLE bills (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    split_strategy VARCHAR(20) NOT NULL DEFAULT 'EQUAL',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_session ON bills(session_id);

-- Bill Payers Table (Ai trả tiền cho bill)
CREATE TABLE bill_payers (
    id UUID PRIMARY KEY,
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    amount_paid DECIMAL(15, 2) NOT NULL CHECK (amount_paid > 0)
);

CREATE INDEX idx_bill_payers_bill ON bill_payers(bill_id);
CREATE INDEX idx_bill_payers_participant ON bill_payers(participant_id);

-- Bill Splits Table (Ai chịu bao nhiêu trong bill)
CREATE TABLE bill_splits (
    id UUID PRIMARY KEY,
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    amount_owed DECIMAL(15, 2) NOT NULL CHECK (amount_owed >= 0)
);

CREATE INDEX idx_bill_splits_bill ON bill_splits(bill_id);
CREATE INDEX idx_bill_splits_participant ON bill_splits(participant_id);

-- Debts Table (Công nợ tổng kết)
CREATE TABLE debts (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    debtor_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    creditor_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status debt_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ,
    
    CONSTRAINT check_different_parties CHECK (debtor_id != creditor_id)
);

CREATE INDEX idx_debts_session ON debts(session_id);
CREATE INDEX idx_debts_debtor ON debts(debtor_id);
CREATE INDEX idx_debts_creditor ON debts(creditor_id);
CREATE INDEX idx_debts_status ON debts(status);
