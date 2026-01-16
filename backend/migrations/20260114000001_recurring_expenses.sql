-- Add recurring expenses feature
-- RE1: DB migrations for recurring_expenses + snapshot weights

-- Frequency enum for recurring expenses
CREATE TYPE recurring_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- Main recurring expenses table
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'VND',
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    split_strategy TEXT NOT NULL CHECK (split_strategy IN ('EQUAL', 'CUSTOM', 'WEIGHTED')),
    frequency recurring_frequency NOT NULL,
    interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    next_run TIMESTAMPTZ NOT NULL,
    last_run TIMESTAMPTZ,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_next_run CHECK (next_run >= start_date::timestamptz)
);

-- Snapshot table to store split configuration at execution time
CREATE TABLE recurring_expense_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
    -- Store participant weights, custom splits, etc. at the time of bill creation
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_recurring_expenses_session_id ON recurring_expenses(session_id);
CREATE INDEX idx_recurring_expenses_created_by ON recurring_expenses(created_by);
CREATE INDEX idx_recurring_expenses_category_id ON recurring_expenses(category_id);
-- Critical index for scheduler: find active expenses that need to run
CREATE INDEX idx_recurring_expenses_scheduler ON recurring_expenses(next_run, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_expense_snapshots_recurring_id ON recurring_expense_snapshots(recurring_expense_id);

-- Add audit log action for recurring expenses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'audit_action' AND e.enumlabel = 'RecurringExpenseCreate'
    ) THEN
        ALTER TYPE audit_action ADD VALUE 'RecurringExpenseCreate';
        ALTER TYPE audit_action ADD VALUE 'RecurringExpenseUpdate';
        ALTER TYPE audit_action ADD VALUE 'RecurringExpenseDelete';
        ALTER TYPE audit_action ADD VALUE 'RecurringExpenseExecute';
        ALTER TYPE audit_action ADD VALUE 'RecurringExpensePause';
        ALTER TYPE audit_action ADD VALUE 'RecurringExpenseResume';
        ALTER TYPE audit_action ADD VALUE 'RecurringExpenseSkip';
    END IF;
END;
$$;

-- Comment documentation
COMMENT ON TABLE recurring_expenses IS 'Stores recurring expense configurations that automatically create bills';
COMMENT ON COLUMN recurring_expenses.interval_count IS 'Run every N frequency units (e.g., every 2 weeks if frequency=WEEKLY and interval_count=2)';
COMMENT ON COLUMN recurring_expenses.timezone IS 'Timezone for calculating next_run (e.g., Asia/Ho_Chi_Minh)';
COMMENT ON TABLE recurring_expense_snapshots IS 'Snapshots of split configuration at each execution time for audit trail';
COMMENT ON COLUMN recurring_expense_snapshots.snapshot_data IS 'JSONB containing participant weights, custom splits, active participants at execution time';
