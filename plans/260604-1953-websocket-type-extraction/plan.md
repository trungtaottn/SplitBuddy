# WebSocket Type Extraction

## Context
- `backend/src/api/ws.rs` is a large API module.
- Transport/event/query/presence structs are independent from connection orchestration.

## Scope
- Move WebSocket transport/event/query/presence types into a sibling module.
- Preserve `crate::api::ws::WsEvent` import compatibility.
- Keep runtime behavior unchanged.
- Update living docs.

## Touchpoints
- `backend/src/api/ws.rs`
- `backend/src/api/ws_types.rs`
- `backend/src/api/mod.rs`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`

## Todo
- [x] Extract WS types.
- [x] Run backend gates.
- [x] Update docs.
