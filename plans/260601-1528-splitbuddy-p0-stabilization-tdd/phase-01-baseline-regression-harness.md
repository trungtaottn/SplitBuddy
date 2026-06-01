---
phase: 1
title: Baseline Regression Harness
status: completed
priority: P1
effort: 1-2d
dependencies: []
---

# Phase 1: Baseline Regression Harness

## Context Links

- `docs/reviews/260601-splitbuddy-stabilization-brainstorm.md`
- `docs/code-standards.md`
- `docs/system-architecture.md`
- `backend/src/domain/split_calculator.rs`
- `backend/src/domain/recurring_expense.rs`
- `backend/src/scheduler.rs`
- `frontend/src/components/BillInput.tsx`
- `frontend/src/pages/SessionDetailPage.tsx`

## Overview

Freeze current risky behavior with regression tests before refactor. Add tests around recurring schedule/money boundaries, scheduler failure isolation seams, and frontend money helpers targeted for Decimal adoption.

## Requirements

- Functional: document current recurring creation/execution behavior before Decimal conversion.
- Functional: lock frontend bill total/split/optimistic update scenarios before replacing float math.
- Non-functional: tests must fail for real regressions; no fake pass-through mocks.

## Architecture

Add coverage at the nearest stable boundary:

- Backend domain tests for recurring validation and next-run date behavior.
- Backend repository/API tests where current test harness exists; otherwise add unit tests around conversion helpers introduced in Phase 2.
- Scheduler unit tests through extracted pure helpers before touching runtime loop behavior.
- Frontend Vitest tests for Decimal helper functions introduced before component rewiring.

## Related Code Files

- Modify: `backend/src/domain/recurring_expense.rs`
- Modify: `backend/src/scheduler.rs`
- Modify: `frontend/src/components/BillInput.tsx`
- Modify: `frontend/src/pages/SessionDetailPage.tsx`
- Modify: `frontend/package.json`
- Create: `frontend/src/utils/money.test.ts` if no existing money test target fits.

## Implementation Steps

1. Run baseline gates and record failures without fixing yet:
   - `cd backend && SQLX_OFFLINE=true cargo build`
   - `cd backend && cargo test`
   - `cd frontend && npm run type-check`
   - `cd frontend && npm run build`
2. Add or extend backend tests for recurring:
   - `0.01`, `0.10`, `123.45`, zero/negative validation.
   - custom split totals.
   - monthly next-run from Jan 31 in leap and non-leap years.
3. Add scheduler helper tests for:
   - empty participant list does not panic.
   - invalid recurring row does not abort batch.
   - exchange rate fallback returns an error/log path, not unwrap.
4. Add frontend money helper tests before component rewiring:
   - equal split remainder distribution.
   - weighted split deterministic totals.
   - custom split tolerance.
   - exchange-rate conversion without float drift.
5. Keep test helpers scoped; no broad `Amount` newtype yet.

## Todo List

- [ ] Baseline command output captured in plan notes or implementation PR.
- [ ] Backend recurring domain tests added.
- [ ] Scheduler helper tests added.
- [ ] Frontend money helper tests added.
- [ ] Existing failures separated from new regressions.

## Success Criteria

- [ ] New tests fail against current float/panic behavior where applicable.
- [ ] Tests describe money behavior with string literals, not floats.
- [ ] No production code refactor happens before regression tests exist.
- [ ] Baseline commands and known failures are recorded.

## Risk Assessment

If current code is too coupled for scheduler tests, extract only pure helpers first, then test helpers before changing behavior.

## Security Considerations

Do not relax auth or bypass scheduler ownership/session checks to make tests easier.

## Next Steps

Proceed to Phase 2 after backend recurring money tests exist.
