# Debts DTO Extraction

- Status: Complete
- Scope: move debt summary/session/settlement response DTOs from `backend/src/api/debts.rs` into `backend/src/api/debts_dto.rs` and update repository imports.
- Acceptance: `/debts/me`, `/debts/sessions`, settlement endpoints, SQLx row mapping, Decimal string serialization, feature gates, authz, audit, notifications, WebSocket events, and auto-archive behavior unchanged; backend gates pass.
- Out of scope: debt repository SQL changes, settlement lifecycle changes, notification extraction, WebSocket behavior, frontend changes.

## Todo

- [x] Add `debts_dto` module.
- [x] Move debt DTO structs and update API/repository imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new debt module boundary/counts.
