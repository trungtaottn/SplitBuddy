# SplitBuddy Code Standards

**Last Updated:** 2026-06-03
**Status:** Current
**Primary rule source:** [PROJECT_GUIDELINES.md](./guidelines/PROJECT_GUIDELINES.md)

## Development Principles

- KISS, YAGNI, DRY.
- Keep feature work behind money safety and maintainability gates.
- Prefer existing module patterns over new abstractions.
- Keep code files under 200 LOC where practical; split large files by behavior boundary.
- Do not create parallel "enhanced" source files; update existing modules.

## Backend Standards

| Area | Standard |
|---|---|
| Language | Rust 2021. |
| Framework | Axum 0.7 + SQLx. |
| Money | `rust_decimal::Decimal`; never `f32`/`f64` for money. |
| Errors | `Result<T, AppError>` or contextual `anyhow` at startup boundaries. |
| Panics | No production `unwrap()`/`expect()` except locally proven impossible invariants. |
| API layer | Handlers stay thin; validation, authz, and DTO conversion explicit. |
| Domain layer | Pure business rules and money math. No DB or HTTP coupling. |
| Repository layer | SQLx and persistence mapping only. |
| Auth | JWT claims + explicit role/ownership checks for mutating operations. |
| Session authz | Money-affecting session, bill, participant, debt, recurring, import, and WS session access paths call explicit business-rule helpers. |
| WebSocket | Tickets authenticate the socket only; every client-selected `session_id` must pass server-side session participant/admin authz before subscribe or activity fanout. |
| Responses | Typed envelope, stable error codes, request traceability. |
| Observability | Structured tracing, request IDs, metrics for scheduler/cache/WS. |

Production panic tokens are guard-blocked in backend API, config, and main startup paths by `make check-money` and CI.

## Frontend Standards

| Area | Standard |
|---|---|
| Language | TypeScript strict. |
| Framework | React 18 + Vite + TanStack Query. |
| Money | Backend sends strings; frontend calculations use `decimal.js`. |
| Types | No `any` in API, money, auth, WS, optimistic update, or form submit paths. |
| API client | DTOs imported from `types/api.ts`, errors use `unknown` + guards. |
| State | TanStack Query for server state; Context only for app-wide UI/session state. |
| UI | Existing shadcn/custom primitives; mobile-first; no layout shift in core flows. |
| Optimistic updates | Typed snapshots, rollback paths, Decimal-safe totals. |
| Forms | Numeric validators must parse whole finite strings; no partial `parseFloat` acceptance. Shared validation is covered by the money guard. |

Frontend lint is a zero-warning gate: `npm run lint` uses `--max-warnings 0` and is enforced by `make check-frontend` plus CI. Frontend dependency audit is also enforced at `moderate` severity or higher.

## Database Standards

- Monetary columns use `DECIMAL`/`NUMERIC`, not floating types.
- Hot paths need indexes: session debts, bills, participants, recurring `next_run`, feed pagination.
- SQLx offline cache must be refreshed after query/migration changes.
- Migrations are append-only once shared.
- JSONB snapshots need versioned shape or explicit compatibility handling.

## Documentation Standards

- Canonical docs live at `docs/` root:
  - `project-overview-pdr.md`
  - `codebase-summary.md`
  - `code-standards.md`
  - `system-architecture.md`
  - `project-roadmap.md`
- Historical plans stay under `docs/archive/`.
- Every large feature/refactor updates roadmap, architecture, codebase summary, and deep review when affected.
- Reports sacrifice grammar for concision and list unresolved questions last.

## CI & Verification

Required before merge:

```bash
make check
```

Minimum local gates:

```bash
cd backend && SQLX_OFFLINE=true cargo build
cd backend && cargo test
cd frontend && npm audit --audit-level=moderate
cd frontend && npm run lint
cd frontend && npm run type-check
cd frontend && npm run build
```

Foundation guardrails:
- `make check-foundation` runs targeted backend authz and WebSocket tests.
- `make file-size-report` reports known large modules and hard-fails only session facade/route-module regrowth.
- CI runs money guardrails independently of frontend jobs, so backend-only PRs cannot skip them.

## Current Standard Violations To Fix First

| Violation | Priority | Evidence |
|---|---:|---|
| Manual money QA pending | P0 | Uneven split, fractional values, recurring run, debt netting. |
| Legacy frontend lint warnings | P0 | 0 warnings remain; frontend lint is clean. |
| Frontend dependency audit | P0 | 0 vulnerabilities; audit gate enforced at moderate severity or higher. |
| Production panic cleanup | P0 | Scheduler/startup config/AppState/push/recurring/persona cutoff/AI slogan target paths use fallible handling or safe fallback; backend API/config/main panic tokens are guard-blocked locally and in CI. |
| God objects | P1 | Session repository/API split completed for P1 target; remaining large historical files include recurring, WS, analytics, games, admin, and frontend API types. |
| Dead code allowances | P1 | recurring, cache, session submodules, stubs. |

## Merge Rule

No new feature touching money, debts, recurring, payments, settlement, or WebSocket consistency should merge until it either fixes or does not worsen the P0 list above.
