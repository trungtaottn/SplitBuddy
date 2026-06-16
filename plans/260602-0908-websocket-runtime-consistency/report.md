# WebSocket Runtime Consistency Report

Date: 2026-06-02

## Completed

- `WebSocketContext` no longer uses `any` in connection error handling.
- Intentional close on cleanup/logout now disables reconnect before closing the socket.
- Auth ticket failures stop reconnect on 401/403 through typed `getErrorStatus`.
- Manual reconnect resets attempts and re-enables reconnect.
- `isWsEvent` now accepts `unknown` and validates known event shapes before dispatch.
- CI/make money/type guard includes `WebSocketContext.tsx` and `types/websocket.ts`.

## Verification

- Target scan: no `any` in WebSocket context/event guard.
- `npm run type-check`: pass.
- `npm run lint`: pass, 39 warnings remaining.
- `npm test`: pass, 5 money tests.
- `npm run build`: pass.
- `make check-money`: pass.

## Remaining

- WebSocket context still has fast-refresh warnings because it exports hooks and provider from one file.
- Deeper realtime QA still needs browser/server run with reconnect, logout, and session subscribe flows.

## Unresolved Questions

- None.
