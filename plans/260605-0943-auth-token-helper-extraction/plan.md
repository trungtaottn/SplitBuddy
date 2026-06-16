# Auth Token Helper Extraction

- Status: Complete
- Scope: move shared auth refresh-token persistence and auth response construction from `backend/src/api/auth.rs` into `backend/src/api/auth_tokens.rs`.
- Acceptance: register/login/refresh JSON contracts unchanged; token rotation semantics unchanged; backend gates pass.
- Out of scope: password reset behavior, auth middleware, JWT claims, route paths, OpenAPI schemas.

## Todo

- [x] Add `auth_tokens` module.
- [x] Replace duplicated refresh-token insert/auth response code in auth handlers.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new auth module boundary.
