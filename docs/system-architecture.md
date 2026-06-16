# SplitBuddy System Architecture

**Last Updated:** 2026-06-04
**Status:** Current

## Runtime Topology

```text
Browser / PWA
  | HTTPS + JWT + WebSocket ticket
  v
React SPA (Vite static bundle)
  | Axios + TanStack Query + native WebSocket
  v
Axum API monolith
  | SQLx
  v
PostgreSQL

Optional: Redis for distributed cache / WebSocket scale.
Deployment: Docker container on Heroku.
```

## Backend Architecture

```text
main.rs
  -> Config / tracing / metrics / DB pool / migrations
  -> HybridCache
  -> WsManager
  -> AppState
  -> Router
       /api/auth
       /api/sessions
       /api/debts
       /api/groups
       /api/recurring-expenses
       /api/payments
       /api/feed
       /api/games
       /api/admin
       /api/ws
       /uploads
       static SPA fallback
  -> RecurringExpenseScheduler
```

Layer intent:

| Layer | Intended role | Current reality |
|---|---|---|
| `api/` | HTTP routing, auth extraction, DTOs | Session API route split is complete; several non-session modules remain business-heavy. |
| `domain/` | Pure business logic | Strong for split calculator; thin elsewhere. |
| `repository/` | Persistence mapping | `session_repo.rs` is a compatibility facade over split session capability repositories. |
| `scheduler.rs` | Background recurring execution | Uses repository-local bill inputs, shared FX resolution, config-injected tick jitter, PostgreSQL advisory run lock, and Prometheus run metrics; Decimal-safe in recurring money path. |
| `cache/` | Hybrid local/Redis cache | Useful but inconsistent adoption. |
| `services/` | Push/external service logic | VAPID config is loaded once and production startup fails without a real private key. |

## Frontend Architecture

```text
main.tsx
  -> App.tsx provider stack
       ThemeProvider
       FeatureFlagsProvider
       MoodProvider
       MusicProvider
       WebSocketProvider
       OnboardingProvider
  -> Protected AppLayout
  -> Lazy pages
       Dashboard
       SessionDetail
       Debts
       Groups
       Games
       Profile
       Templates
       Analytics
       Feed
       Admin
```

Data model:
- Axios wrapper talks to `/api`.
- TanStack Query owns server cache and invalidation.
- WebSocket events trigger targeted invalidation.
- Optimistic updates exist in session/bill flows and need typed Decimal-safe snapshots.

## Critical Flows

### Bill Creation & Debt Recalculation

```text
BillInput / SessionDetail
  -> api.inputs.createBill(sessionId, dto)
  -> Axum session bill handler
  -> SessionRepository create bill + payers + split details
  -> SplitCalculator Decimal split/netting
  -> debts persisted
  -> WebSocket BillUpdated / DebtsRecalculated
  -> TanStack invalidates session, bills, debts
```

Risk:
- Backend core is Decimal-safe.
- Frontend optimistic totals in core bill/debt paths use decimal.js helpers.

### Recurring Expense Execution

```text
API recurring config
  -> recurring_expenses table
  -> scheduler tick
  -> acquire PostgreSQL advisory run lock
  -> find active due recurring rows
  -> transaction + participant lookup
  -> shared FX resolution
  -> create bill/debts + snapshot + last_run/next_run in one transaction
  -> audit after commit
```

Risk:
- DB schema uses DECIMAL.
- Domain/repo/API/scheduler use Decimal/string money contracts.
- Scheduler target panic paths now return errors or skip safely.
- Recurring bill creation, debt recalculation, snapshot, and next-run update share the scheduler transaction; scheduler bill inputs no longer depend on API DTOs; recurring FX uses the shared resolver/cache/provider path; jitter policy is config-injected; a run-level advisory lock skips duplicate ticks across app instances; run/processed/skipped/failed/lock-skipped/due-count/duration metrics are exported through the existing Prometheus endpoint.
- Recurring API DTOs, money parsing, participant guard, and recurring-in-session lookup live outside the route handler module; route code owns persistence calls and audit logging.

### WebSocket Consistency

```text
Client requests WS ticket
  -> server consumes single-use ticket
  -> client subscribes to session
  -> server verifies session participant/admin access
  -> mutations broadcast events
  -> clients invalidate queries
```

Strength:
- Simple and product-appropriate.
- Unauthorized subscribe/activity messages are rejected before subscription, presence, or activity broadcast state changes.
- WebSocket transport/event/query/client message/presence types live outside the manager/socket orchestration module while preserving `api::ws::WsEvent` compatibility.
- WebSocket Redis pub/sub subscribe and publish helpers live outside socket lifecycle code; local fallback remains in the manager.

Risk:
- Redis fanout paths still need scale/ordering observation under multi-instance load.

### Uploads

```text
Authenticated upload
  -> multipart parser
  -> size limit by type
  -> magic-byte validation
  -> user-prefixed path
  -> static serve under /uploads
  -> owner/admin delete under /api/uploads/:kind/:filename
```

Strength:
- Magic-byte validation and type-specific limits are strong.
- Delete path validates generated filenames and requires owner/admin.

Risk:
- Static GET remains public to preserve current image rendering; move receipts/QR behind authenticated file serving if they become sensitive.

## Data Architecture

Core tables by feature family:
- Users/auth/refresh tokens.
- Sessions, participants, bills, bill payers, split details, debts.
- Groups and group membership.
- Recurring expenses, exceptions, snapshots.
- Payments/transactions.
- Games/music/personas/wrapped/analytics/feed/audit/uploads.

Migrations:
- 33 migration files.
- SQLx offline cache: 74 query files.
- Heavy 2026-01 expansion added recurring, payments, feed/social, personas, audit, templates, currency, participant flags.

## Security Architecture

Current controls:
- JWT auth and role claims.
- Explicit business-rule authz helpers for session, bill, participant, recurring, debt, import, and WebSocket session access paths.
- Argon2 password hashing.
- Rate limiting with proxy-aware real IP extraction.
- Config-driven CORS; production startup fails if no valid origins are configured.
- VAPID private key config is validated at startup in production; local dev can boot without push keys and push send returns feature-disabled.
- Upload magic-byte validation and owner/admin delete lifecycle.
- DB-backed feature flags now gate seeded backend API surfaces for sessions, debts, groups, group debts, games, AI assistant, and notifications.
- WebSocket single-use tickets.
- WebSocket tickets authenticate identity only; per-session subscribe/activity authz is enforced server-side.
- Admin bootstrap through environment password.

Needed hardening:
- Continue adding backend gates only when new feature flags protect security or money behavior.

## Main Architectural Debt

1. Remaining large historical modules outside the completed session repository/API split; session import/export route orchestration is split from CSV response and format-specific parser helpers.
2. Scheduler now has run-level DB locking; remaining scale work is runtime observation under horizontal deployment.
3. Money model still needs broader audit outside fixed recurring/core frontend paths.
4. Context bloat: frontend Mood/Music/WebSocket need narrower hooks/selectors.
5. CI enforcement weaker than written standards.

## Direction

Short-term architecture target:
- Decimal/string contract across all money boundaries.
- Keep session modules split by bills/debts/participants/import-export/stats.
- Scheduler depends on domain/repository contracts, not API DTOs.
- Frontend API wrapper fully typed.
- Query invalidation and optimistic updates use typed, Decimal-safe helpers.
