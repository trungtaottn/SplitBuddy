# WebSocket Context Fast Refresh Cleanup

## Status

- [x] Verify WebSocket hook consumers.
- [x] Split WebSocket context contract out of provider module.
- [x] Move WebSocket hooks to sidecar.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/contexts/WebSocketContext.tsx`
- `frontend/src/contexts/websocket-context.ts`
- `frontend/src/contexts/use-websocket.ts`
- WebSocket hook imports
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `WebSocketContext.tsx` exports only `WebSocketProvider`.
- WebSocket hooks import from `contexts/use-websocket`.
- Lint has 0 warnings.
- Type-check, lint, tests, build, and money guard pass.
