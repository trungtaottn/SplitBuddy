# Auth Public Handler Extraction

- Status: Complete
- Scope: move public feature flag and authenticated WebSocket ticket handlers from `backend/src/api/auth.rs` into focused sibling modules.

## Todo

- [x] Scout auth route boundaries.
- [x] Keep register/login/refresh/password-reset/token behavior unchanged.
- [x] Add `auth_features` module.
- [x] Add `auth_ws_ticket` module.
- [x] Register modules in `api/mod.rs`.
- [x] Update `docs/codebase-summary.md` LOC notes.
- [x] Run backend gates.

## Acceptance

- `/api/auth/features` route path, cache behavior, response shape, SQL ordering, and logging remain unchanged.
- `/api/auth/ws-ticket` route path, auth requirement, ticket TTL, cache payload, and response shape remain unchanged.
- `auth.rs` stays as route wiring plus register/login/refresh.
- Backend build, tests, clippy, and repository guard checks pass.

## Unresolved Questions

None.
