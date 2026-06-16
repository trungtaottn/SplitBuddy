# Group Debt Handler Extraction

- Status: Complete
- Scope: move group debt and simplified debt handlers from `backend/src/api/groups.rs` into `backend/src/api/groups_debts.rs`.
- Acceptance: `/groups/:id/debts` and `/groups/:id/debts/simplified` behavior, feature gates, authz, sorting, and DTOs unchanged; backend gates pass.
- Out of scope: group CRUD/member handlers, repository queries, split calculator behavior, DTO contracts.

## Todo

- [x] Add `groups_debts` module.
- [x] Move debt handlers and update group route imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new group module boundary/counts.
