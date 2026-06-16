# Analytics Trends Extraction

- Status: Complete
- Scope: move the spending trends handler out of `backend/src/api/analytics.rs`.
- Out of scope: SQL/query changes, response shape changes, analytics DTO changes.

## Tasks

- [x] Scout analytics helper seams.
- [x] Add `backend/src/api/analytics_trends.rs`.
- [x] Register module and route through extracted handler.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- `/api/analytics/trends` behavior unchanged.
- SQLx offline build/test/clippy pass.
- `analytics.rs` LOC reduced without editing trend SQL text.
