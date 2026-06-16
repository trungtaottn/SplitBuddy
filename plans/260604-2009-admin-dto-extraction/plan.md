# Admin DTO Extraction

- Status: Complete
- Scope: move admin request/response/query structs out of `backend/src/api/admin.rs`.
- Out of scope: admin behavior, route, SQL, upload, and authz changes.

## Tasks

- [x] Scout admin module seams.
- [x] Add `backend/src/api/admin_dto.rs`.
- [x] Register module and update imports.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- Admin endpoint payloads unchanged.
- SQLx offline build/test/clippy pass.
- `admin.rs` LOC reduced without touching handler behavior.
