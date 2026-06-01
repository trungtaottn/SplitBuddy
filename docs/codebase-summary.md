# SplitBuddy Codebase Summary

**Last Updated:** 2026-06-01  
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
- `backend/src/api/mod.rs`: route tree and shared `AppState`.
- `backend/src/error.rs`: application error model.
- `backend/src/config.rs`: environment-driven runtime config.
- `backend/src/openapi.rs`: OpenAPI doc registration.

## Backend Modules

| Module | Purpose | Current Notes |
|---|---|---|
| `api/auth.rs` | register/login/refresh/logout | JWT + Argon2. |
| `api/sessions/*` | session detail, bills, debts, participants | Oversized module history; subdir split started. |
| `api/debts.rs` | debt views and settlement flows | Core money-adjacent path. |
| `api/groups.rs` | friend groups + group debts | Medium-large module. |
| `api/recurring_expenses.rs` | recurring CRUD/exceptions | Decimal/string money boundary. |
| `api/ws.rs` | WebSocket ticket/events/presence | Strong model; hardening still needed. |
| `api/uploads.rs` | avatar/receipt/bank QR uploads | Magic bytes + size checks are strong. |
| `api/admin.rs` | admin users/flags/music/audit | Needs backend feature-flag enforcement pass. |
| `api/games.rs` | game features | Large, some dead code. |
| `api/feed.rs` | activity feed/comments/likes | Partial product completeness. |
| `api/payments.rs` | settlement/payment proof | Partial. |
| `api/personas.rs`, `api/wrapped.rs`, `api/analytics.rs` | gamification/stats | Useful; money-display paths need Decimal discipline. |

## Domain & Repository

- `domain/split_calculator.rs`: strongest money core; uses `Decimal`, deterministic remainder distribution, net balance simplification.
- `domain/recurring_expense.rs`: recurring money now uses `Decimal`; dead code allowances remain.
- `repository/session_repo.rs`: 2059 LOC god object; core data access plus business-heavy debt/bill/session behavior.
- `repository/session/*`: intended split modules, currently partially delegating to `SessionRepository`.
- `repository/recurring_expense_repo.rs`: maps DB DECIMAL to `Decimal`.
- `repository/debt_repo.rs`, `payment_repo.rs`, `group_repo.rs`, `game_repo.rs`, `feed_repo.rs`, `user_repo.rs`: feature repositories.

## Frontend Entry Points

- `frontend/src/main.tsx`: React bootstrap.
- `frontend/src/App.tsx`: provider stack, protected routes, lazy page loading.
- `frontend/src/lib/axios.ts`: HTTP client.
- `frontend/src/lib/api.ts`: API wrapper; core bill/participant/persona DTOs typed.
- `frontend/src/types/api.ts`: central API types; recurring amount is string.

## Frontend Modules

| Area | Files | Notes |
|---|---|---|
| Routing/pages | `frontend/src/pages/*` | Main UX surfaces. `SessionDetailPage` is core and too large. |
| Session subcomponents | `frontend/src/pages/session/*` | Bill list, debt breakdown, import/export, recurring, overview. |
| UI system | `frontend/src/components/ui/*` | shadcn-style primitives and custom app controls. |
| Layout | `components/layout/*` | App shell and mobile nav. |
| Contexts | `contexts/*` | Auth, theme, feature flags, mood, music, WebSocket. Music/Mood are heavy. |
| Data hooks | `hooks/*` | Optimistic mutations, feed, offline, haptics, validation. |
| Money utils | `utils/money.ts`, `utils/formatCurrency.ts`, `utils/currency.ts` | decimal.js-backed helpers cover core bill/debt/recurring optimistic paths. |

## Verified Counts

- Backend migrations: 33.
- SQLx cache files: 74.
- Largest backend files from scout:
  - `backend/src/repository/session_repo.rs`: 2059 LOC.
  - `backend/src/api/recurring_expenses.rs`: 822 LOC.
  - `backend/src/api/ws.rs`: 752 LOC.
  - `backend/src/api/analytics.rs`: 697 LOC.
  - `backend/src/api/games.rs`: 693 LOC.
  - `backend/src/api/admin.rs`: 689 LOC.
- Frontend root heavy files:
  - `frontend/src/types/api.ts`: 761 LOC.
  - `frontend/src/App.tsx`: 202 LOC.

## Current Strengths

- Rust backend uses strong primitives for core split/netting.
- SQLx offline mode and migrations are established.
- WebSocket ticket/event invalidation is product-appropriate.
- Upload validation is stronger than typical MVP implementations.
- CI/deploy infrastructure exists.
- Documentation has already archived historical 2024-2025 plans.

## Current Blockers

1. God objects slow safe feature work.
2. Legacy frontend lint warnings remain outside fixed core money paths.
3. Manual money QA still needed for full Phase 0 exit.
4. Existing standards remain broader than CI enforcement.

## References

- [Project Overview & PDR](./project-overview-pdr.md)
- [System Architecture](./system-architecture.md)
- [Project Roadmap](./project-roadmap.md)
- [Deep Review](./reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md)
