---
title: "Recurring Scheduler Atomic Execution"
status: completed
priority: P1
created: "2026-06-04T08:59:00+07:00"
---

# Recurring Scheduler Atomic Execution

## Context

- `backend/src/scheduler.rs` locks a recurring row inside a transaction, then calls `SessionRepository::create_bill` through the pool.
- That creates and commits the bill outside the scheduler transaction.
- If notification, snapshot, or `next_run` update fails afterward, the bill remains committed while the recurring row rolls back and can run again.

## Requirements

- Create recurring bills, payers, splits, debt recalculation, snapshot, and `next_run` update in one transaction.
- Preserve existing bill API behavior.
- Keep recurring money as `Decimal`.
- Do not broaden scheduler FX behavior; keep explicit same/base currency behavior.
- Add focused tests or compile gates around the new transaction path.

## Implementation

1. Add a transaction-aware bill creation method in `SessionBillRepository`.
2. Make existing `create_bill` delegate to the transaction-aware method.
3. Use the transaction-aware method from `RecurringExpenseScheduler`.
4. Keep audit logging after commit.
5. Run:
   - `cd backend && cargo fmt -- --check`
   - `cd backend && SQLX_OFFLINE=true cargo build`
   - `cd backend && SQLX_OFFLINE=true cargo test scheduler recurring`
   - `make check-money`

## Success Criteria

- [x] Scheduler no longer creates the recurring bill through a separate pool transaction.
- [x] Existing bill create call sites keep the same public API.
- [x] Backend build/tests pass.
- [x] Money guard passes.

## Verification

- 2026-06-04: `cd backend && cargo fmt -- --check && SQLX_OFFLINE=true cargo build`
- 2026-06-04: `cd backend && SQLX_OFFLINE=true cargo test`
- 2026-06-04: `make check-money`

## Open Questions

None.
