---
title: WebSocket Runtime Consistency
description: >-
  Improve realtime UX by preventing intentional-close reconnect loops and
  tightening WebSocket event typing.
status: completed
priority: P0
effort: 0.5d
branch: refactor/docs-restructure-2026
tags:
  - frontend
  - websocket
  - ux
  - reliability
created: '2026-06-02T09:08:00+07:00'
createdBy: 'ck:cook'
source: skill
---

# WebSocket Runtime Consistency

## Scout Summary

- WebSocket context owns realtime session invalidation, presence, notifications, activity indicators, and connection status.
- `WebSocketContext.tsx` still used `catch (error: any)`.
- `types/websocket.ts` used an `any` event guard that accepted any object with a string `type`.
- Provider cleanup closed sockets but `onclose` could still schedule reconnect while a user existed, causing unnecessary reconnect loops during remount/cleanup.

## Acceptance Criteria

- WebSocket target files have no `any`.
- Intentional cleanup/logout close does not schedule reconnect.
- Auth ticket failures stop reconnecting on 401/403 using typed error status.
- WebSocket event parser validates known event shapes enough to reject malformed messages.
- Existing public WebSocket context API remains unchanged.
- `npm run type-check`, `npm run lint`, `npm run build`, and `make check-money` pass.

## Scope

- Modify `frontend/src/contexts/WebSocketContext.tsx` and `frontend/src/types/websocket.ts`.
- Extend guard only if target files stay clean.
- No backend WebSocket contract change.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Reconnect and event typing cleanup | Completed |
| 2 | Verification and report | Completed |

