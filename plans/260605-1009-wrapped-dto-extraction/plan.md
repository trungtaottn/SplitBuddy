# Wrapped DTO Extraction

- Status: Complete
- Scope: move wrapped query/stat/cache row structs from `backend/src/api/wrapped.rs` into `backend/src/api/wrapped_dto.rs`.
- Acceptance: wrapped response JSON, cache row mapping, and routes unchanged; backend gates pass.
- Out of scope: wrapped SQL/stat semantics, date range logic, cache behavior.

## Todo

- [x] Add `wrapped_dto` module.
- [x] Move wrapped DTO/cache row structs and update imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new wrapped module boundary.
