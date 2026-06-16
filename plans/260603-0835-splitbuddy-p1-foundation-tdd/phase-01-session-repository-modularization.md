---
phase: 1
title: Session Repository Modularization
status: completed
priority: P1
effort: 3-4d
dependencies: []
---

# Phase 1: Session Repository Modularization

## Overview

Finish the partial repository split already present under `backend/src/repository/session/`. Keep behavior stable and move capability code out of `backend/src/repository/session_repo.rs` behind a facade until call sites are clean.

## Requirements

- Functional: preserve current session list/detail/create/bill/debt/participant behavior.
- Functional: keep SQLx query semantics and response DTO construction equivalent.
- Non-functional: no behavior changes mixed into mechanical moves.
- Non-functional: each touched repository module should stay focused and reviewable.

## Architecture

```text
SessionRepository facade
  -> session_read_repo
  -> session_write_repo
  -> session_bill_repo
  -> session_debt_repo
  -> participant_repo
  -> import_export_repo
  -> stats_repo
```

Existing modules:

- `backend/src/repository/session/participant_repo.rs`
- `backend/src/repository/session/session_bill_repo.rs`
- `backend/src/repository/session/session_debt_repo.rs`
- `backend/src/repository/session/mod.rs`

Add only missing capability modules; do not create generic repository abstractions.

## Related Code Files

- Modify: `backend/src/repository/session_repo.rs`
- Modify: `backend/src/repository/session/mod.rs`
- Modify: `backend/src/repository/session/participant_repo.rs`
- Modify: `backend/src/repository/session/session_bill_repo.rs`
- Modify: `backend/src/repository/session/session_debt_repo.rs`
- Create: `backend/src/repository/session/session_read_repo.rs`
- Create: `backend/src/repository/session/session_write_repo.rs`
- Create: `backend/src/repository/session/session_import_export_repo.rs` if import/export code is still in facade.
- Create: `backend/src/repository/session/session_stats_repo.rs` if stats code is still in facade.

## Implementation Steps

1. Tests Before:
   - Add repository-level regression coverage for list/detail/create session if an integration harness exists.
   - Add compile-only facade call coverage where DB integration is not practical.
   - Capture baseline `SQLX_OFFLINE=true cargo build` before file moves. Done for the first read/list cut.
2. Inventory `session_repo.rs` into capability groups:
   - read/list/detail.
   - create/update/lifecycle.
   - participants.
   - bills.
   - debts/recalculation.
   - import/export.
   - stats/summary.
3. Move read/list/detail first into `session_read_repo.rs`.
4. Move create/update/lifecycle into `session_write_repo.rs`.
5. Move remaining participant/bill/debt functions into existing modules, deleting duplicate wrappers.
6. Move import/export and stats only after lower-risk capability modules compile.
7. Keep `SessionRepository` as a thin facade until Phase 2 call sites can move safely.
8. Run after each capability move:
   - `cd backend && cargo fmt -- --check`
   - `cd backend && SQLX_OFFLINE=true cargo build`

## Progress Notes

- 2026-06-03: Moved non-paginated `find_by_user` into `backend/src/repository/session/session_read_repo.rs`; `SessionRepository` remains a facade for call-site compatibility.
- 2026-06-03: Moved paginated `find_by_user_paginated` into `backend/src/repository/session/session_read_repo.rs`.
- 2026-06-03: Moved `find_by_id_with_details` into `backend/src/repository/session/session_read_repo.rs`.
- 2026-06-03: Moved `verify_owner`, `verify_participant`, and `get_session_base_currency` into `backend/src/repository/session/session_read_repo.rs`.
- 2026-06-03: Moved `get_session_participants_basic` and `batch_get_participants` into `backend/src/repository/session/participant_repo.rs`.
- 2026-06-03: Moved `get_user_debt_in_session`, `get_session_settled_amount`, `batch_get_user_debts`, and `batch_get_settled_amounts` into `backend/src/repository/session/session_debt_repo.rs`.
- 2026-06-03: Created `backend/src/repository/session/session_write_repo.rs` and moved `create` plus `create_with_participants`.
- 2026-06-03: Moved `update_status`, `set_archived`, and `delete` into `backend/src/repository/session/session_write_repo.rs`.
- 2026-06-03: Moved `update_minimize_debts` into `backend/src/repository/session/session_write_repo.rs`.
- 2026-06-03: Moved `add_participant`, `update_participant`, and `delete_participant` into `backend/src/repository/session/participant_repo.rs`.
- 2026-06-03: Moved `find_bills_by_session` and `find_bills_with_details` into `backend/src/repository/session/session_bill_repo.rs`.
- 2026-06-03: Moved `delete_bill` into `backend/src/repository/session/session_bill_repo.rs`.
- 2026-06-03: Moved `create_bill`, `update_bill`, and bill split helpers into `backend/src/repository/session/session_bill_repo.rs`.
- 2026-06-03: Moved debt recalculation into `backend/src/repository/session/session_debt_repo.rs`; `session_repo.rs` has no direct SQL left.
- 2026-06-03: `backend/src/repository/session_repo.rs` reduced from 2059 LOC to 374 LOC.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && cargo test`, `make check-money`.
- 2026-06-03: Added compile-only facade coverage for the split repository public surface in `backend/src/repository/session/facade_compile_tests.rs`.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test`, `make check-money`.

## Success Criteria

- [x] `session_repo.rs` contains facade wiring and shared helpers only.
- [x] No public API route behavior changes in current read/list/detail/participant/debt/create/lifecycle cuts.
- [x] Existing SQLx offline cache remains valid for current read/list/detail/participant/debt/create/lifecycle cuts.
- [x] `SQLX_OFFLINE=true cargo build` passes for current read/list/detail/participant/debt/create/lifecycle cuts.
- [x] `cargo test` passes for current repository cuts.
- [x] New/modified repository tests pass.

## Risk Assessment

SQLx macro line moves can expose stale offline cache. Refresh only touched query metadata; do not churn unrelated `.sqlx` files.

## Security Considerations

Repository split must not weaken existing ownership filters in queries. Authz changes wait for Phase 3.
