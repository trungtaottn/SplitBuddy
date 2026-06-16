# WebSocket Socket Handler Extraction

- Status: Complete
- Scope: move ticket validation, socket upgrade, receive/send loop, and WS session access helper out of `backend/src/api/ws.rs`.
- Out of scope: event payloads, Redis behavior, manager state, authz rules.

## Tasks

- [x] Scout ws module seams.
- [x] Add `backend/src/api/ws_socket.rs`.
- [x] Route through extracted handler.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- `/api/ws` behavior unchanged.
- Existing WebSocket unit tests pass.
- SQLx offline build/test/clippy pass.
- `ws.rs` LOC reduced while manager methods remain in place.
