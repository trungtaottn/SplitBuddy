# Analytics Category Extraction

- Status: Complete
- Scope: move category breakdown handler/query logic from `backend/src/api/analytics.rs` into `backend/src/api/analytics_categories.rs` and reuse it from spending analytics.
- Acceptance: `/analytics/categories` and `/analytics/spending` category payloads unchanged; backend gates pass.
- Out of scope: trends logic, SQL semantics, DTO contracts, route paths.

## Todo

- [x] Add `analytics_categories` module.
- [x] Move category handler/query helper and reuse it from spending analytics.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new analytics module boundary/counts.
