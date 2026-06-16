# Games DTO Extraction

- Status: Complete
- Scope: move game content query/response and spin wheel request/response DTOs from `backend/src/api/games.rs` into `backend/src/api/games_dto.rs`.
- Acceptance: truth-or-dare, never-have-i-ever, challenge, spin, and spin-history request/response shapes, SQLx row mapping, feature gates, participant authz, SQL queries, and session route integrations unchanged; backend gates pass.
- Out of scope: dice DTOs, repository-backed game handlers, game repository types, feature-flag behavior, SQL changes, frontend changes.

## Todo

- [x] Add `games_dto` module.
- [x] Move game content/spin DTO structs and update handler imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new games module boundary/counts.
