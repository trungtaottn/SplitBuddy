-- PL2: Indexing/Perf for recurring expenses tables
-- Ensure efficient filtering by session and active status

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_session_active_next_run
    ON recurring_expenses(session_id, is_active, next_run);

CREATE INDEX IF NOT EXISTS idx_recurring_expense_snapshots_created_at
    ON recurring_expense_snapshots(created_at);
