---
phase: 4
title: "WebSocket Subscribe Hardening"
status: completed
priority: P0
effort: "2d"
dependencies:
  - 3
---

# Phase 4: WebSocket Subscribe Hardening

## Overview

Require server-side authorization before accepting `Subscribe { session_id }` or activity messages for a session. Ticket auth proves user identity only; subscription must prove session access.

## Requirements

- Functional: unauthorized session subscribe is rejected and does not add presence/subscription state.
- Functional: authorized session participant/admin can subscribe.
- Functional: activity messages for a session require the same session access.
- Functional: client receives a clear error event or close code for subscription denial.
- Non-functional: keep existing ticket lifecycle and Redis/local broadcast behavior unless directly affected.

## Architecture

```text
WS ticket
  -> authenticated user_id
ClientMessage::Subscribe(session_id)
  -> require_session_participant_or_admin(user_id, session_id)
  -> subscribe_to_session
  -> presence update
ClientMessage::Activity(session_id)
  -> same authz
```

`WsManager::subscribe_to_session` currently mutates in-memory state directly. Authorization should happen before that call or be injected into the manager through a narrow repository dependency.

## Related Code Files

- Modify: `backend/src/api/ws.rs`
- Modify: shared authz helper from Phase 3.
- Modify: `frontend/src/contexts/WebSocketContext.tsx`
- Modify: `frontend/src/types/websocket.ts`
- Create/modify: backend WS tests if harness exists.
- Create/modify: frontend WebSocket message handling tests if existing Vitest setup supports it.

## Implementation Steps

1. Tests Before:
   - Backend test: non-participant subscribe returns WS error event or closes with explicit code.
   - Backend test: rejected subscribe leaves `session_subscriptions` unchanged.
   - Backend test: participant subscribe succeeds.
   - Frontend test: subscription error is surfaced without reconnect storm.
2. Backend:
   - Add `WsServerMessage::SubscriptionRejected` or equivalent typed error event if not present.
   - Before `subscribe_to_session`, call shared session access helper.
   - Before `Activity`, call same helper.
   - Ensure unauthorized subscribe does not emit presence update.
3. Client:
   - Type WS error/subscription rejection messages.
   - Avoid treating subscription denial as a transient reconnect reason.
   - Keep reconnect ticket refresh behavior unchanged.
4. Redis/local:
   - Preserve local broadcast fallback.
   - Do not publish unauthorized activity events.
5. Run:
   - `cd backend && cargo fmt -- --check`
   - `cd backend && SQLX_OFFLINE=true cargo build`
   - `cd frontend && npm run lint && npm run type-check`

## Success Criteria

- [x] Unauthorized subscribe is rejected server-side.
- [x] Rejected subscribe does not add subscription or presence state.
- [x] Activity messages cannot target unauthorized sessions.
- [x] Client handles subscription denial explicitly.
- [x] Existing reconnect path still requests a fresh ticket.

## Progress Notes

- 2026-06-03: Added `require_session_participant_or_admin` helper for WS session access. Tickets now carry user role into socket handling.
- 2026-06-03: `Subscribe` and `Activity` messages require server-side session participant/admin access before subscription, presence mutation, or activity broadcast.
- 2026-06-03: Added typed `SubscriptionRejected` event and frontend handling that removes the denied session from the resubscribe set without reconnecting.
- 2026-06-03: Added WS manager tests for successful subscribe mutation and rejected subscribe no-mutation behavior.
- 2026-06-03 verification: `make check` passed, including backend release build/tests, frontend lint/type-check/build, money guard, foundation authz/WS tests, and session file-size guard.

## Risk Assessment

WebSocket upgrade tests may be expensive. If full WS integration is not available, test the authorization boundary and manager mutation separately.

## Security Considerations

Ticket auth alone is insufficient. Session authorization must happen for each client-selected `session_id`.
