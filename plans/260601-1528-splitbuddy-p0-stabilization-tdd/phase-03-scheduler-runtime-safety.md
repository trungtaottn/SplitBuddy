---
phase: 3
title: Scheduler Runtime Safety
status: completed
priority: P1
effort: 2d
dependencies:
  - 2
---

# Phase 3: Scheduler Runtime Safety

## Context Links

- `backend/src/scheduler.rs`
- `backend/src/main.rs`
- `backend/src/services/push_service.rs`
- `backend/src/domain/recurring_expense.rs`
- `backend/src/error.rs`

## Overview

Remove production panic paths from scheduler, startup, push, and recurring date code. Scheduler must isolate per-item failures.

## Requirements

- Functional: one invalid recurring item cannot stop the recurring batch.
- Functional: empty participant sets, invalid dates, and push build errors return/log errors.
- Non-functional: no broad swallowing; every skip has structured tracing context.

## Architecture

```text
scheduler tick
  -> fetch due rows
  -> for each row
       -> run one item in isolated result boundary
       -> commit/update on success
       -> log/metric failure and continue
  -> tick returns aggregate status
```

Startup config errors should fail with contextual `anyhow`, not `.expect()`. Runtime background work should log-and-skip isolated records.

## Related Code Files

- Modify: `backend/src/scheduler.rs`
- Modify: `backend/src/main.rs`
- Modify: `backend/src/services/push_service.rs`
- Modify: `backend/src/domain/recurring_expense.rs`
- Modify: `backend/src/error.rs` only if existing error variants are insufficient.

## Implementation Steps

1. Tests Before:
   - Scheduler helper test: no active participants returns item error.
   - Scheduler helper test: invalid recurring data returns item error and next item still executes.
   - Date helper test: invalid local time returns error/none, not panic.
2. Scheduler:
   - Extract `process_due_recurring_item(...) -> Result<RecurringRunOutcome, AppError>` if not already testable.
   - Replace participant `unwrap()` with explicit no-participant error.
   - Replace exchange-rate unwrap/hardcoded parse with `Decimal::ONE`.
   - Continue loop after item failure; include recurring id/session id in tracing.
3. Recurring date domain:
   - Replace `and_hms_opt(...).unwrap()` and timezone unwraps with safe conversion.
   - Return `Option`/`Result` according to existing domain style.
4. Startup:
   - Replace header parse unwraps with static `HeaderValue` construction or contextual errors.
   - Replace Prometheus/governor/signal `expect()` with contextual startup failure.
5. Push:
   - Replace VAPID builder/message build `expect()` with `AppError`.
6. Tests After:
   - Add one test for mixed success/failure scheduler batch.
   - Add startup helper tests only if helpers are extracted; otherwise rely on compile + smoke.
7. Regression Gate:
   - `cd backend && SQLX_OFFLINE=true cargo build`
   - `cd backend && cargo test scheduler recurring push`

## Todo List

- [ ] Scheduler per-item result boundary exists.
- [ ] Scheduler participant/exchange-rate unwraps removed.
- [ ] Recurring date unwraps removed.
- [ ] Startup expect/unwrap paths converted to contextual errors.
- [ ] Push service expect paths converted to errors.
- [ ] Structured logs include recurring id/session id for skips.

## Success Criteria

- [ ] `rg "unwrap\\(|expect\\(" backend/src/scheduler.rs backend/src/main.rs backend/src/services/push_service.rs backend/src/domain/recurring_expense.rs` returns only tests or proven invariant notes.
- [ ] Scheduler continues after an item-level failure.
- [ ] Startup failures preserve actionable context.
- [ ] Push errors return `AppError`, not panic.

## Risk Assessment

Do not turn startup misconfiguration into silent fallback. Startup config failures should still fail fast with context.

## Security Considerations

CORS/rate-limit/signal changes must not loosen production behavior. Failure mode changes only.

## Next Steps

Proceed to Phase 4 after backend compile and scheduler tests pass.
