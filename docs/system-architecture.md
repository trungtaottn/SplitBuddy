# SplitBuddy System Architecture

**Last Updated:** 2026-06-01  
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
| `api/` | HTTP routing, auth extraction, DTOs | Many modules are business-heavy. |
| `domain/` | Pure business logic | Strong for split calculator; thin elsewhere. |
| `repository/` | Persistence mapping | `session_repo.rs` combines broad responsibilities. |
| `scheduler.rs` | Background recurring execution | Coupled to API DTOs; Decimal-safe in recurring money path. |
| `cache/` | Hybrid local/Redis cache | Useful but inconsistent adoption. |
| `services/` | Push/external service logic | VAPID startup validation debt. |

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
  -> find active due recurring rows
  -> transaction + participant lookup
  -> create bill/debts
  -> update last_run/next_run
  -> snapshot/exception handling
```

Risk:
- DB schema uses DECIMAL.
- Domain/repo/API/scheduler use Decimal/string money contracts.
- Scheduler target panic paths now return errors or skip safely.

### WebSocket Consistency

```text
Client requests WS ticket
  -> server consumes single-use ticket
  -> client subscribes to session
  -> mutations broadcast events
  -> clients invalidate queries
```

Strength:
- Simple and product-appropriate.

Risk:
- Ticket expiry/reconnect semantics and Redis/deprecated calls need hardening.

### Uploads

```text
Authenticated upload
  -> multipart parser
  -> size limit by type
  -> magic-byte validation
  -> user-prefixed path
  -> static serve under /uploads
```

Strength:
- Magic-byte validation and type-specific limits are strong.

Risk:
- Static GET authz/deletion lifecycle needs review if uploads become sensitive.

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
- Argon2 password hashing.
- Rate limiting with proxy-aware real IP extraction.
- Config-driven CORS, but permissive fallback remains.
- Upload magic-byte validation.
- WebSocket single-use tickets.
- Admin bootstrap through environment password.

Needed hardening:
- Remove CORS `Any` fallback in production.
- Centralize role/ownership authorization helpers.
- Enforce feature flags on backend where security or money behavior changes.
- Add upload deletion/ownership semantics.

## Main Architectural Debt

1. God objects: session repository and session API history.
2. Scheduler coupling: API DTO leakage and hardcoded FX.
3. Money model still needs broader audit outside fixed recurring/core frontend paths.
4. Context bloat: frontend Mood/Music/WebSocket need narrower hooks/selectors.
5. CI enforcement weaker than written standards.

## Direction

Short-term architecture target:
- Decimal/string contract across all money boundaries.
- Session modules split by bills/debts/participants/export.
- Scheduler depends on domain/repository contracts, not API DTOs.
- Frontend API wrapper fully typed.
- Query invalidation and optimistic updates use typed, Decimal-safe helpers.
