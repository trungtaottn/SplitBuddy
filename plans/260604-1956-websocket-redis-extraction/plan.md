# WebSocket Redis Extraction

## Context
- `backend/src/api/ws.rs` still owns Redis pub/sub plumbing.
- Redis subscribers and publishers are independent from socket lifecycle handlers.

## Scope
- Move Redis WS subscribe/publish helpers into a sibling module.
- Preserve local fallback behavior.
- Keep public WebSocket API unchanged.
- Update living docs.

## Touchpoints
- `backend/src/api/ws.rs`
- `backend/src/api/ws_redis.rs`
- `backend/src/api/mod.rs`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`

## Todo
- [x] Extract Redis helpers.
- [x] Run backend gates.
- [x] Update docs.
