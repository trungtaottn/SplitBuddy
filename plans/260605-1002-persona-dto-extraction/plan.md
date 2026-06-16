# Persona DTO Extraction

- Status: Complete
- Scope: move persona response/request/row structs from `backend/src/api/personas.rs` into `backend/src/api/personas_dto.rs`.
- Acceptance: persona routes, SQL mappings, and JSON payloads unchanged; backend gates pass.
- Out of scope: achievement unlock rules, SQL query changes, response error model changes.

## Todo

- [x] Add `personas_dto` module.
- [x] Move persona DTO/row structs and update imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new persona module boundary.
