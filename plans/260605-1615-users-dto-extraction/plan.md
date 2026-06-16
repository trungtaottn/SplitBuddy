# Users DTO Extraction

- Status: Complete
- Scope: move profile/password/bank-account request and response DTOs from `backend/src/api/users.rs` into `backend/src/api/users_dto.rs`.
- Acceptance: `/users/me`, `/users/me/password`, and `/users/me/bank-accounts` behavior, validation attributes, SQLx row mapping, cache behavior, and response shapes unchanged; backend gates pass.
- Out of scope: user repository changes, SQL queries, OpenAPI schema expansion, auth/cache behavior, bank-account business logic.

## Todo

- [x] Add `users_dto` module.
- [x] Move user DTO structs and update handler imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new users module boundary/counts.
