# Admin Music Extraction

- Status: Complete
- Scope: move admin music list/upload/delete/url handlers out of `backend/src/api/admin.rs`.
- Out of scope: upload validation changes, SQL changes, route changes, authz rule changes.

## Tasks

- [x] Scout admin music seam.
- [x] Add `backend/src/api/admin_music.rs`.
- [x] Share admin authz helper and route through extracted handlers.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- Admin music endpoints and payloads unchanged.
- SQLx offline build/test/clippy pass.
- `admin.rs` LOC reduced without touching users/features/audit handlers.
