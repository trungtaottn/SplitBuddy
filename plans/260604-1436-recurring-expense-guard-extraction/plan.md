# Recurring Expense Guard Extraction

## Context
- `backend/src/api/recurring_expenses.rs` repeats participant and recurring-in-session checks.
- Shared guard helpers reduce route-handler bloat and keep 404/403 behavior consistent.

## Scope
- Extract recurring participant guard.
- Extract recurring lookup scoped to session.
- Keep route contracts unchanged.
- Update living docs.

## Touchpoints
- `backend/src/api/recurring_expenses.rs`
- `backend/src/api/recurring_expense_guards.rs`
- `backend/src/api/mod.rs`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`

## Todo
- [x] Extract guards.
- [x] Run backend gates.
- [x] Update docs.
