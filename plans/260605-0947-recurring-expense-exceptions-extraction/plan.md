# Recurring Expense Exceptions Extraction

- Status: Complete
- Scope: move recurring expense exception list/add/remove handlers from `backend/src/api/recurring_expenses.rs` into `backend/src/api/recurring_expense_exceptions.rs`.
- Acceptance: exception routes and authorization unchanged; recurring expense core handlers remain wired; backend gates pass.
- Out of scope: scheduler behavior, repository queries, DTO contracts, route paths.

## Todo

- [x] Add `recurring_expense_exceptions` module.
- [x] Move exception handlers and update route references.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new module boundary.
