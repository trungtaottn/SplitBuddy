# User Bank Account Handler Extraction

- Status: Complete
- Scope: move user bank account list/add/update/delete handlers from `backend/src/api/users.rs` into `backend/src/api/users_bank_accounts.rs`.
- Acceptance: `/users/me/bank-accounts` and `/users/me/bank-accounts/:id` route behavior, auth, validation messages, default-account clearing, SQL queries, response envelopes, status codes, and DTO payloads unchanged; backend gates pass.
- Out of scope: profile handlers, password change handler, DTO changes, repository changes, upload lifecycle changes, route path changes, frontend changes.

## Todo

- [x] Add `users_bank_accounts` module.
- [x] Move bank account handlers and update route imports.
- [x] Update docs with new users module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
