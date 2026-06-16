---
phase: 3
title: "Execute P1 Foundation"
status: completed
priority: P1
effort: "10-15d"
dependencies: [1, 2]
---

# Phase 3: Execute P1 Foundation

## Overview

Execute `plans/260603-0835-splitbuddy-p1-foundation-tdd/` without broadening scope.

## Requirements

- Functional: finish session repository/API modularization, authz matrix, and WebSocket subscribe hardening.
- Non-functional: preserve URL/response contracts unless explicitly documented.

## Architecture

Keep `SessionRepository` as a temporary facade while capability modules own read/write/bill/debt/participant/import-export/stat behavior. Keep session API `mod.rs` as route wiring plus exports. Authz helpers must be server-side and tested with negative cases.

## Related Code Files

- Modify: `backend/src/repository/session_repo.rs`
- Modify: `backend/src/repository/session/*.rs`
- Modify: `backend/src/api/sessions/*.rs`
- Modify: `backend/src/api/ws.rs`
- Modify: `backend/src/middleware/*`
- Modify tests near affected modules.
- Read: `plans/260603-0835-splitbuddy-p1-foundation-tdd/`

## Implementation Steps

1. For each P1 phase, write failing tests first for the behavior boundary being changed.
2. Split session repository by capability while preserving call-site behavior.
3. Split session API handlers by route family while preserving route contracts.
4. Implement mutating endpoint authz matrix with 401/403 regression tests.
5. Enforce WebSocket `Subscribe { session_id }` authz server-side before subscription mutation.
6. Run full gates after each capability slice.

## Success Criteria

- [x] `backend/src/repository/session_repo.rs` is facade-sized or removed.
- [x] `backend/src/api/sessions/mod.rs` is route wiring plus exports.
- [x] Mutating session/bill/participant/debt/recurring endpoints have negative authz coverage.
- [x] Unauthorized WS session subscribe is rejected server-side.
- [x] P1 plan checkboxes are updated as work lands.

## Progress Notes

- 2026-06-03: Completed P1 Phase 1 session repository modularization and P1 Phase 2 session API modularization.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test`, `make check-money`.
- 2026-06-03: Completed P1 Phase 3 authz matrix implementation. Bill/session/participant/debt/recurring mutating paths now use explicit authz helpers or route-specific owner/admin filters; guest settlement records actor/action through audit logging.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test` (44 passed), `make check-money`.
- 2026-06-03: Completed P1 Phase 4 WebSocket subscribe hardening and P1 Phase 5 foundation CI/docs.
- 2026-06-03 verification: `make check` passed.

## Risk Assessment

Risk: modularization changes behavior while looking like file movement.
Mitigation: test existing behavior before each move; avoid behavior edits in pure split commits.
