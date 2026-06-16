# SplitBuddy Project Overview & PDR

**Last Updated:** 2026-06-01  
**Status:** Current  
**Source:** Direct codebase scout + living docs + deep review.

## Product

SplitBuddy is a Vietnamese-first web app for group bill splitting, drinking-session debt transparency, settlement, and social/gamified group activity.

Primary users:
- Friend groups splitting food, drinks, games, and recurring shared costs.
- Session owners managing participants, bills, debts, and settlement.
- Admins managing users, feature flags, music uploads, and operational state.

Core value:
- Money disputes reduced through clear bill input, split strategy, debt netting, payment status, and real-time updates.
- Social stickiness through games, feed, achievements, personas, Wrapped stats, PWA, push, and music.

## Current Scope

| Area | Status | Notes |
|---|---:|---|
| Auth | Active | JWT + refresh token hash + Argon2 password storage. |
| Sessions | Active | Participants, guests, owners, archive/restore/delete, CSV import/export. |
| Bills | Active | Multi-payer, split details, categories, currency metadata, receipt URL. |
| Debts | Active | Pending/settled/requested states, session/group views, smart netting. |
| Groups | Active | Group members + group debt views. |
| Recurring expenses | Partial | DB DECIMAL is correct; Rust/FE still use `f64`/number in key paths. |
| Payments | Partial | VietQR/payment records exist; feature not production-complete. |
| Feed/social | Partial | Backend + frontend pages exist; completeness needs audit per flow. |
| Games | Active | Multiple game components + backend APIs; dead code remains. |
| Analytics/Wrapped/personas | Partial | Useful features exist; money display paths still need Decimal discipline. |
| Admin | Active/partial | Role claims and feature flags exist; backend enforcement gaps remain. |
| Real-time | Active | Native WebSocket + ticket + TanStack invalidation. |
| Push/PWA/uploads | Active | PWA install/offline; uploads use magic-byte checks; push has startup `.expect` debt. |

## Non-Negotiables

- Money uses Decimal semantics end-to-end. No `f32`, `f64`, `number`, or `parseFloat` in calculation paths.
- No production `unwrap()`/`expect()` except impossible invariants with local proof.
- No `any` in TypeScript money, auth, API, optimistic update, or WebSocket paths.
- API returns typed envelope responses and preserves request traceability.
- Feature work waits behind P0 stabilization where it touches money, scheduler, SessionDetail, debt netting, or settlement.

## Functional Requirements

1. Users can register/login, maintain profiles, and participate as registered users or guests.
2. Session owners can create sessions, add/remove participants, add bills, update bills, delete bills, close/reopen sessions, archive/restore sessions.
3. Bills support equal, custom, and weighted split strategies, multiple payers, receipt metadata, categories, currency code, exchange rate, and timestamps.
4. Debts are recalculated after bill/participant changes and simplified when `minimize_debts` is enabled.
5. Clients receive real-time session updates through WebSocket events and query invalidation.
6. Recurring expenses can schedule future bills, skip dates, pause/resume, and preserve execution snapshots.
7. Payments and VietQR metadata support settlement proof and status transitions.
8. PWA/offline indicators, push notifications, uploads, games, analytics, feed, personas, and admin tools support product engagement and operations.

## Quality Requirements

- `make check` passes before merge.
- Backend: `SQLX_OFFLINE=true cargo build`, tests/nextest, clippy without ignored correctness warnings.
- Frontend: `npm run type-check`, `npm run build`, eslint policy tightened for `any` in critical paths.
- Manual money validation uses fractional cases: `0.01`, `0.1`, `123.45`, VND-scale values, uneven splits, multi-payer splits.
- Critical flows tested manually: login, create session, add participants, add bill, debt recalc, close/reopen, recurring execution, WebSocket invalidation, payment settlement.

## Current Product Risks

| Risk | Severity | Evidence |
|---|---:|---|
| Recurring money precision | P0 | `backend/src/domain/recurring_expense.rs` uses `f64`; DB schema uses DECIMAL. |
| Frontend money drift | P0 | `SessionDetailPage`, `BillInput`, `DebtBreakdown`, `DebtsPage` use `any`/`parseFloat` paths. |
| Scheduler panic/startup crash | P0 | `scheduler.rs`, `main.rs`, `push_service.rs`, recurring domain contain production unwrap/expect paths. |
| God objects | P1 | `backend/src/repository/session_repo.rs` 2059 LOC; session API module also oversized. |
| Docs drift | P1 | Living docs exist, but canonical root docs were missing before this refresh. |
| Client-only flags | P1 | Feature flags exist, backend enforcement incomplete for critical decisions. |

## Acceptance Criteria For Next Development Phase

- P0 money paths use Decimal/string contracts end-to-end.
- No `any` in core bill/debt/recurring optimistic paths.
- Production panic paths are removed from scheduler/startup/push service.
- Session repo/API modularization starts before new large feature work.
- Documentation hub points to current root canonical docs and archived historical plans are not used as development basis.

## References

- [Codebase Summary](./codebase-summary.md)
- [System Architecture](./system-architecture.md)
- [Code Standards](./code-standards.md)
- [Project Roadmap](./project-roadmap.md)
- [Deep Review](./reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md)
