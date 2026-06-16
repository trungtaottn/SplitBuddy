# Analytics DTO Extraction

- Status: Complete
- Scope: move analytics request/response structs out of `backend/src/api/analytics.rs`.
- Out of scope: SQL/query behavior changes.

## Tasks

- [x] Scout analytics module seams.
- [x] Add `backend/src/api/analytics_dto.rs`.
- [x] Register module and update imports.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- API response shapes unchanged.
- SQLx offline build/test/clippy pass.
- `analytics.rs` LOC reduced without query churn.
