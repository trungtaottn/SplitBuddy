# SplitBuddy Codebase Summary

**Last Updated:** 2026-06-03
**Status:** Current
**Source:** Direct repo scout, `README.md`, `Cargo.toml`, `frontend/package.json`, source tree, living docs.

## Shape

SplitBuddy is a full-stack monolith deployment with split source roots:

| Layer | Location | Stack |
|---|---|---|
| Backend API | `backend/` | Rust 2021, Axum 0.7, SQLx, PostgreSQL, rust_decimal, JWT, Argon2, Redis optional |
| Frontend SPA | `frontend/` | React 18, TypeScript, Vite, TanStack Query, Axios, Tailwind, shadcn/ui, decimal.js |
| Database | `backend/migrations/` | 33 SQL migrations |
| SQLx cache | `backend/.sqlx/` | 74 offline query cache files |
| Deployment | root + app Dockerfiles | Docker, Heroku, GitHub Actions |
| Docs | `docs/` | Living docs + archived historical plans |

## Backend Entry Points

- `backend/src/main.rs`: config, tracing, metrics, database pool, migrations, admin bootstrap, cache, WebSocket manager, CORS, rate limit, scheduler, static serving, `/uploads`.
- `backend/src/api/mod.rs`: route tree and shared `AppState`; HTTP client setup is fallible and propagated through startup.
- `backend/src/error.rs`: application error model.
- `backend/src/config.rs`: environment-driven runtime config; required production values fail with context instead of panic, and invalid production CORS config fails startup.
- `backend/src/openapi.rs`: OpenAPI doc registration.

## Backend Modules

| Module | Purpose | Current Notes |
|---|---|---|
| `api/auth.rs`, `api/auth_dto.rs`, `api/auth_tokens.rs`, `api/auth_password_reset.rs`, `api/auth_features.rs`, `api/auth_ws_ticket.rs` | register/login/refresh/logout/password reset/features/ws ticket | Auth DTO/OpenAPI schema types, refresh-token issuance helpers, public password-reset handlers, feature flags, and WebSocket ticket handlers split from route wiring; JWT + Argon2. |
| `api/sessions/*` | session detail, bills, debts, participants, import/export | P1 route split complete; `mod.rs` is route wiring plus shared exports; bill currency conversion helpers, bill request DTOs, bill mutation event helpers, and status/minimize handlers split from core session handlers. |
| `api/debts.rs`, `api/debts_dto.rs`, `api/debts_settlement.rs` | debt views and settlement flows | Debt summary/session views, response DTOs/SQLx row contracts, and settlement orchestration are split into focused modules; core money-adjacent path. |
| `api/groups.rs`, `api/groups_dto.rs`, `api/groups_members.rs`, `api/groups_debts.rs` | friend groups + group debts | Group route/CRUD/archive handlers, member handlers, DTO contracts, and debt handlers are split by responsibility; group debt money contracts are string/Decimal-compatible and simplified group debt netting uses settled-aware member balances plus the shared deterministic split calculator. |
| `api/recurring_expenses.rs`, `api/recurring_expense_create.rs`, `api/recurring_expense_crud.rs`, `api/recurring_expense_dto.rs`, `api/recurring_expense_guards.rs`, `api/recurring_expense_exceptions.rs`, `api/recurring_expense_controls.rs` | recurring CRUD/exceptions/controls | Route wiring, create flow, read/update/delete handlers, Decimal/string DTO boundary, guards, exception handlers, and pause/resume/skip controls split by responsibility. |
| `api/ws.rs`, `api/ws_socket.rs`, `api/ws_types.rs`, `api/ws_redis.rs` | WebSocket ticket/events/presence | Socket upgrade/runtime loop, transport/event/query/client message/presence types, and Redis pub/sub plumbing split from manager orchestration; server-side session subscribe/activity authz added. |
| `api/uploads.rs`, `api/upload_storage.rs` | avatar/receipt/bank QR uploads | Magic bytes, size checks, and owner/admin deletion are implemented. |
| `api/users.rs`, `api/users_bank_accounts.rs`, `api/users_dto.rs` | user profile/password/bank accounts | Profile/password handlers, bank-account handlers, and DTO/validation/SQLx row contracts are split by responsibility. |
| `api/notifications.rs`, `api/notifications_dto.rs`, `api/notifications_push.rs` | in-app/push notifications | Notification request/response/query DTOs and push subscription/test handlers split from list/read/preference handlers. |
| `api/admin.rs`, `api/admin_dto.rs`, `api/admin_users.rs`, `api/admin_features.rs`, `api/admin_music.rs`, `api/admin_music_upload.rs` | admin users/flags/music/audit | Admin route wiring/guard/audit, DTOs, user management, feature flags, music list/delete/URL handlers, and multipart upload handling split by responsibility; feature flag writes invalidate the shared flag cache. |
| `api/games.rs`, `api/games_content.rs`, `api/games_dto.rs`, `api/games_dice.rs`, `api/games_repository_handlers.rs` | game features | Content handlers, spin/content DTOs, dice route/rule table, and repository-backed history/custom/stats handlers split from route orchestration. |
| `api/feed.rs` | activity feed/comments/likes | Partial product completeness. |
| `api/payments.rs`, `api/payments_dto.rs`, `api/payments_qr.rs` | settlement/payment proof | Payment transaction DTOs and VietQR request/response/handler logic split from transaction handler orchestration; status lifecycle remains partial. |
| `api/personas.rs`, `api/personas_dto.rs`, `api/personas_achievements.rs`, `api/wrapped.rs`, `api/wrapped_dto.rs`, `api/wrapped_stats.rs`, `api/analytics.rs`, `api/analytics_dto.rs`, `api/analytics_trends.rs`, `api/analytics_categories.rs`, `api/analytics_spending.rs`, `api/analytics_spending_amounts.rs`, `api/analytics_spending_sessions.rs` | gamification/stats | Persona DTO/row types, achievement handlers, and wrapped DTO/row types plus wrapped stat generation split from handlers; analytics route wiring, DTOs, trends, category breakdown, spending response assembly, amount queries, and session-count query are split by responsibility; money-display paths need Decimal discipline. |
| `api/ai.rs`, `api/ai_dto.rs`, `api/ai_generation*.rs` | greeting/chat assistant | Greeting/chat routes, DTOs, fallback generation, OpenAI request helpers, and slogan selection are split by responsibility; slogan fallback no longer panics on system clock skew. |
| `api/feature_flags.rs` | backend flag guard | Shared DB-backed guard for seeded feature flags; missing rows remain enabled for compatibility while disabled rows block matching APIs. |
| `api/sessions/import_export_csv.rs`, `api/sessions/import_export_parser/*` | import/export CSV helpers | CSV response/escaping and format-specific parser helpers split from route orchestration. |
| `services/push_service.rs` | web push delivery | Uses startup-loaded VAPID config; production startup rejects missing placeholder invalid push config. |

## Domain & Repository

- `domain/split_calculator.rs`: strongest money core; uses `Decimal`, deterministic remainder distribution, deterministic net balance simplification, and deterministic settlement-aware debt offsets/refunds.
- `domain/recurring_expense.rs`: recurring money now uses `Decimal`; dead code allowances remain.
- `repository/session_repo.rs`: 374 LOC compatibility facade; no direct SQL remains after read/list/detail/participant/debt/create/lifecycle/minimize-debt/bill extraction.
- `repository/session/*`: intended split modules; `session_read_repo.rs` owns session list/detail/helper queries; `participant_repo.rs` owns participant reads/mutations; `session_debt_repo.rs` owns user/settled debt reads and recalculation with separate paid/owed aggregation, settled-transfer offsets, unsettled status totals, and shared per-session transaction locks; `session_write_repo.rs` owns session create/status/archive/delete/minimize-debt flows; `session_bill_repo.rs` owns bill read/detail/create/update/delete queries.
- `repository/recurring_expense_repo.rs`: maps DB DECIMAL to `Decimal`.
- `scheduler.rs`: recurring execution resolves FX through the shared resolver, creates bill, payers, splits, debt recalculation, snapshot, and next-run update atomically in the scheduler transaction through repository-local bill inputs; scheduler tick jitter is config-injected, run-level PostgreSQL advisory locking prevents duplicate multi-instance ticks, and Prometheus run metrics are exported; audit remains post-commit best effort.
- `repository/debt_repo.rs`: settlement request/confirm/guest-settle updates guard current status in SQL and share the session debt advisory lock with recalculation; debt summaries expose stable registered-counterparty user ids for global netting.
- `repository/group_repo.rs`: group member debt balances include current-member-only settled-transfer offsets while preserving gross paid/owed totals.
- `repository/payment_repo.rs`, `game_repo.rs`, `feed_repo.rs`, `user_repo.rs`: feature repositories.
- `api/sessions/authz.rs`: explicit session business authz helpers for active bill/import creation, bill mutation, owner/admin session management, debt settlement roles, guest settlement, and WS session access.

## Frontend Entry Points

- `frontend/src/main.tsx`: React bootstrap.
- `frontend/src/App.tsx`: provider stack, protected routes, lazy page loading.
- `frontend/src/lib/axios.ts`: HTTP client.
- `frontend/src/lib/api.ts`: API wrapper; core bill/participant/persona DTOs typed.
- `frontend/src/types/api.ts`: central API types; recurring amount is string.

## Frontend Modules

| Area | Files | Notes |
|---|---|---|
| Routing/pages | `frontend/src/pages/*` | Main UX surfaces. `SessionDetailPage` is core and too large; `DashboardPage`, `DebtsPage`, `GroupDebtsPage`, and profile push paths now use cleaned typed/error-safe paths. `DebtsPage` groups global registered-user netting by user id and gates optimized/netted settlement actions to exact non-offset rows. |
| Session subcomponents | `frontend/src/pages/session/*` | Bill list, debt breakdown, import/export, recurring, overview. Core `BillInput` edit initialization keeps currency and weighted split strategy stable. |
| UI system | `frontend/src/components/ui/*` | shadcn-style primitives and custom app controls. Animated counters use latest-value refs and cleanup pending frames. |
| Layout | `components/layout/*` | App shell and mobile nav. |
| Contexts | `contexts/*` | Auth, theme, feature flags, mood, music, WebSocket. Music playback and WebSocket runtime paths are typed/hardened; Mood remains heavy. |
| Data hooks | `hooks/*` | Optimistic mutations, feed, offline, haptics, validation. Feed metadata/rendering and optimistic like cache are typed; offline data fetch uses latest query refs and non-null cache checks. |
| Money utils | `utils/money.ts`, `utils/formatCurrency.ts`, `utils/currency.ts` | decimal.js-backed helpers cover core bill/debt/group-debt/recurring optimistic paths. |

## Verified Counts

- Backend migrations: 33.
- SQLx cache files: 74.
- Largest backend files from scout:
  - `backend/src/api/sessions/import_export_handlers.rs`: 370 LOC.
  - `backend/src/api/sessions/import_export_parser/splitwise.rs`: 228 LOC.
  - `backend/src/api/sessions/import_export_parser/splitbuddy_v1.rs`: 201 LOC.
  - `backend/src/api/sessions/import_export_parser/splitbuddy_v2.rs`: 182 LOC.
  - `backend/src/api/sessions/import_export_parser/mod.rs`: 77 LOC.
  - `backend/src/api/sessions/import_export_parser/shared.rs`: 69 LOC.
  - `backend/src/api/sessions/import_export_csv.rs`: 40 LOC.
  - `backend/src/repository/session_repo.rs`: 374 LOC.
  - `backend/src/api/sessions/session_handlers.rs`: 319 LOC.
  - `backend/src/api/sessions/session_status_handlers.rs`: 104 LOC.
  - `backend/src/api/sessions/mod.rs`: 62 LOC.
  - `backend/src/api/sessions/bills.rs`: 366 LOC.
  - `backend/src/api/sessions/bill_events.rs`: 45 LOC.
  - `backend/src/api/sessions/bill_requests.rs`: 46 LOC.
  - `backend/src/api/sessions/bill_currency.rs`: 91 LOC.
  - `backend/src/api/recurring_expenses.rs`: 51 LOC.
  - `backend/src/api/recurring_expense_create.rs`: 139 LOC.
  - `backend/src/api/recurring_expense_crud.rs`: 161 LOC.
  - `backend/src/api/recurring_expense_dto.rs`: 118 LOC.
  - `backend/src/api/recurring_expense_guards.rs`: 47 LOC.
  - `backend/src/api/recurring_expense_exceptions.rs`: 89 LOC.
  - `backend/src/api/recurring_expense_controls.rs`: 114 LOC.
  - `backend/src/api/ws.rs`: 380 LOC.
  - `backend/src/api/ws_socket.rs`: 200 LOC.
  - `backend/src/api/ws_redis.rs`: 152 LOC.
  - `backend/src/api/ws_types.rs`: 118 LOC.
  - `backend/src/api/analytics.rs`: 13 LOC.
  - `backend/src/api/analytics_dto.rs`: 49 LOC.
  - `backend/src/api/analytics_categories.rs`: 145 LOC.
  - `backend/src/api/analytics_spending.rs`: 43 LOC.
  - `backend/src/api/analytics_spending_amounts.rs`: 177 LOC.
  - `backend/src/api/analytics_spending_sessions.rs`: 83 LOC.
  - `backend/src/api/analytics_trends.rs`: 183 LOC.
  - `backend/src/api/personas.rs`: 206 LOC.
  - `backend/src/api/personas_achievements.rs`: 162 LOC.
  - `backend/src/api/ai.rs`: 84 LOC.
  - `backend/src/api/ai_dto.rs`: 27 LOC.
  - `backend/src/api/ai_generation.rs`: 5 LOC.
  - `backend/src/api/ai_generation_fallbacks.rs`: 71 LOC.
  - `backend/src/api/ai_generation_openai.rs`: 130 LOC.
  - `backend/src/api/ai_generation_slogans.rs`: 41 LOC.
  - `backend/src/api/notifications.rs`: 247 LOC.
  - `backend/src/api/notifications_dto.rs`: 99 LOC.
  - `backend/src/api/notifications_push.rs`: 98 LOC.
  - `backend/src/api/personas_dto.rs`: 67 LOC.
  - `backend/src/api/wrapped.rs`: 104 LOC.
  - `backend/src/api/wrapped_dto.rs`: 66 LOC.
  - `backend/src/api/wrapped_stats.rs`: 247 LOC.
  - `backend/src/api/games.rs`: 164 LOC.
  - `backend/src/api/games_content.rs`: 173 LOC.
  - `backend/src/api/games_dto.rs`: 33 LOC.
  - `backend/src/api/games_dice.rs`: 172 LOC.
  - `backend/src/api/games_repository_handlers.rs`: 205 LOC.
  - `backend/src/api/admin.rs`: 68 LOC.
  - `backend/src/api/admin_dto.rs`: 112 LOC.
  - `backend/src/api/admin_users.rs`: 118 LOC.
  - `backend/src/api/admin_features.rs`: 113 LOC.
  - `backend/src/api/admin_music.rs`: 148 LOC.
  - `backend/src/api/admin_music_upload.rs`: 168 LOC.
  - `backend/src/api/auth.rs`: 192 LOC.
  - `backend/src/api/auth_dto.rs`: 108 LOC.
  - `backend/src/api/auth_tokens.rs`: 53 LOC.
  - `backend/src/api/auth_password_reset.rs`: 144 LOC.
  - `backend/src/api/auth_features.rs`: 57 LOC.
  - `backend/src/api/auth_ws_ticket.rs`: 49 LOC.
  - `backend/src/api/groups.rs`: 196 LOC.
  - `backend/src/api/groups_dto.rs`: 113 LOC.
  - `backend/src/api/groups_members.rs`: 124 LOC.
  - `backend/src/api/groups_debts.rs`: 117 LOC.
  - `backend/src/api/users.rs`: 144 LOC.
  - `backend/src/api/users_bank_accounts.rs`: 158 LOC.
  - `backend/src/api/users_dto.rs`: 81 LOC.
  - `backend/src/api/payments.rs`: 144 LOC.
  - `backend/src/api/payments_dto.rs`: 60 LOC.
  - `backend/src/api/payments_qr.rs`: 177 LOC.
  - `backend/src/api/debts.rs`: 56 LOC.
  - `backend/src/api/debts_dto.rs`: 58 LOC.
  - `backend/src/api/debts_settlement.rs`: 272 LOC.
- Frontend root heavy files:
  - `frontend/src/types/api.ts`: 761 LOC.
  - `frontend/src/App.tsx`: 202 LOC.

## Current Strengths

- Rust backend uses strong primitives for core split/netting.
- SQLx offline mode and migrations are established.
- Backend API/config/main panic regressions are blocked by local and CI guardrails.
- WebSocket ticket/event invalidation is product-appropriate and client-selected session subscriptions are server-authorized.
- Upload validation and owner/admin deletion are stronger than typical MVP implementations.
- Shared frontend numeric validators reject partial numeric strings.
- CI/deploy infrastructure exists.
- Documentation has already archived historical 2024-2025 plans.

## Current Blockers

1. Remaining large historical modules slow safe feature work outside the completed session repository/API split.
2. Legacy frontend lint debt is cleared for the fixed visible-flow/core bill/money/realtime/music/profile/feed/sound/wrapped/greeting/chat/KingsCup/counter/offline indicator/tooltip/install-prompt/error-boundary/onboarding/smart-suggestions/page-transition/dead-helper/swipe-action/button/toast/auth/feature-flag/theme/mood/WebSocket paths.
3. Manual money QA still needed for full Phase 0 exit.
4. Existing standards remain broader than CI enforcement.

## References

- [Project Overview & PDR](./project-overview-pdr.md)
- [System Architecture](./system-architecture.md)
- [Project Roadmap](./project-roadmap.md)
- [Deep Review](./reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md)
