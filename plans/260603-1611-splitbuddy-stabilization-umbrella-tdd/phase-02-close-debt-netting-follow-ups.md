---
phase: 2
title: "Close Debt Netting Follow Ups"
status: completed
priority: P1
effort: "1-2d"
dependencies: [1]
---

# Phase 2: Close Debt Netting Follow Ups

## Overview

Run a tests-first final pass over debt netting only if new regressions are found after the completed debt-netting plan.

## Requirements

- Functional: verify session/global/group netting behavior stays settlement-aware and deterministic.
- Non-functional: no API-breaking contract changes.

## Architecture

Debt netting remains centralized in `SplitCalculator` and session/group repositories call shared logic. UI optimized debt rows must not trigger gross settlement actions when rendered as net rows.

## Related Code Files

- Modify if needed: `backend/src/domain/split_calculator.rs`
- Modify if needed: `backend/src/repository/session/session_debt_repo.rs`
- Modify if needed: `backend/src/repository/debt_repo.rs`
- Modify if needed: `backend/src/repository/group_repo.rs`
- Modify if needed: `frontend/src/pages/DebtsPage.tsx`
- Modify if needed: `frontend/src/pages/GroupDebtsPage.tsx`
- Read: `plans/260603-1309-debt-netting-stabilization/plan.md`

## Implementation Steps

1. Write or confirm regression tests for any newly found netting issue before implementation.
2. Check minimized, direct, global, and group debt flows for settlement-aware offsets.
3. Verify `settlement_requested` remains outstanding and stale requests are cleared on recalculation.
4. Verify registered-user global debt grouping uses stable user ids, not session participant ids.
5. Verify group offsets ignore removed/non-member participants.
6. Run backend and frontend gates after any change.

## Success Criteria

- [x] Existing debt-netting plan remains completed or gets a targeted reopened checkbox with evidence.
- [x] No new debt regression found; existing completed regression coverage remains the active evidence.
- [x] `SQLX_OFFLINE=true cargo build` passes.
- [x] `cargo test` passes.
- [x] `npm run type-check` passes if frontend touched.
- [x] `make check-money` passes.

## Progress Notes

- 2026-06-03: Verified `plans/260603-1309-debt-netting-stabilization/plan.md` remains completed with explicit debt regression coverage and no reopened follow-up needed.
- 2026-06-03 verification: `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test`, `make check-money`.

## Risk Assessment

Risk: frontend net display and backend settlement mutation diverge.
Mitigation: only allow aggregate settlement actions for exact non-offset rows; otherwise require per-row settlement.
