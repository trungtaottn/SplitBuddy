-- Recurring expense exceptions (skip specific dates)

CREATE TABLE IF NOT EXISTS recurring_expense_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (recurring_expense_id, exception_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_recurring
    ON recurring_expense_exceptions(recurring_expense_id, exception_date);
