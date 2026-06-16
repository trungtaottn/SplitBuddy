# WebSocket Client Message Extraction

## Context
- `backend/src/api/ws.rs` still owns client inbound message DTOs.
- DTOs belong with WebSocket transport/event types.

## Scope
- Move `ClientMessage` into `ws_types`.
- Keep socket parsing behavior unchanged.
- Update living docs.

## Touchpoints
- `backend/src/api/ws.rs`
- `backend/src/api/ws_types.rs`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`

## Todo
- [x] Move client message type.
- [x] Run backend gates.
- [x] Update docs.
