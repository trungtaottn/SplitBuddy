# Wrapped Stats Helper Extraction

- Status: Complete
- Scope: move wrapped stats generation and date-range calculation from `backend/src/api/wrapped.rs` into `backend/src/api/wrapped_stats.rs`.
- Acceptance: `/wrapped/me` and `/wrapped/generate` cache behavior, query defaults, SQL queries, fallback values, period date ranges, response shape, and wrapped DTO contracts unchanged; backend gates pass.
- Out of scope: replacing f64 money stats, SQL query fixes, cache schema changes, DTO changes, frontend changes.

## Todo

- [x] Add `wrapped_stats` module.
- [x] Move stats generation/date-range helpers and update handler imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new wrapped module boundary/counts.
