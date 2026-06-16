# Debt Settlement Handler Extraction

- Status: Complete
- Scope: move debt settlement request/confirm/guest-settle handlers and auto-archive helper from `backend/src/api/debts.rs` into `backend/src/api/debts_settlement.rs`.
- Acceptance: `/debts/:id/request-settle`, `/debts/:id/confirm-settle`, and `/debts/:id/settle-guest` route behavior, feature gate, authz helpers, repository calls, audit event, notification insert, WebSocket events, auto-archive behavior, and response payloads unchanged; backend gates pass.
- Out of scope: debt summary/session list handlers, repository SQL changes, settlement lifecycle changes, DTO changes, frontend changes.

## Todo

- [x] Add `debts_settlement` module.
- [x] Move settlement handlers/helpers and update route imports.
- [x] Update docs with new debt module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
