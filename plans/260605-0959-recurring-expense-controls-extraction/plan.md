# Recurring Expense Controls Extraction

- Status: Complete
- Scope: move pause/resume/skip handlers from `backend/src/api/recurring_expenses.rs` into `backend/src/api/recurring_expense_controls.rs`.
- Acceptance: pause/resume/skip route behavior, authz, audit events, and next-run calculation unchanged; backend gates pass.
- Out of scope: CRUD handlers, exception handlers, scheduler policy changes, repository query changes.

## Todo

- [x] Add `recurring_expense_controls` module.
- [x] Move control handlers and update route imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new recurring module boundary/counts.
