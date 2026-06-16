# Admin User Feature Handler Extraction

- Status: Complete
- Scope: move admin user management and feature flag handlers from `backend/src/api/admin.rs` into focused sibling modules.

## Todo

- [x] Scout admin route boundaries.
- [x] Keep music/audit/route paths/admin guard behavior unchanged.
- [x] Add `admin_users` module.
- [x] Add `admin_features` module.
- [x] Register modules in `api/mod.rs`.
- [x] Update `docs/codebase-summary.md` LOC notes.
- [x] Run backend gates.

## Acceptance

- `/api/admin/users`, `/api/admin/users/:id/password`, and pagination/password hashing/error behavior remain unchanged.
- `/api/admin/features`, `/api/admin/features/:key`, `/api/admin/features/toggle-all`, and `/api/admin/features/module/:module` SQL, cache invalidation, logs, and response shapes remain unchanged.
- `admin.rs` stays as route wiring plus `require_admin` and audit logs.
- Backend build, tests, clippy, and repository guard checks pass.

## Unresolved Questions

None.
