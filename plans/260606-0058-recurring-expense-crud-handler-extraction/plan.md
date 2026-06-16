# Recurring Expense CRUD Handler Extraction

- Status: Complete
- Scope: move recurring expense create handler into `backend/src/api/recurring_expense_create.rs` and read/update/delete handlers into `backend/src/api/recurring_expense_crud.rs`.
- Acceptance: `/recurring-expenses/session/:session_id` and `/recurring-expenses/session/:session_id/:recurring_id` route behavior, authz, feature gates, validation messages, audit logs, repository calls, response status codes, and DTO payloads unchanged; backend gates pass.
- Out of scope: control endpoints, exception endpoints, DTO changes, repository changes, scheduler behavior, route path changes, frontend changes.

## Todo

- [x] Add recurring create/crud handler modules.
- [x] Move handlers and update router imports.
- [x] Update docs with new recurring module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
