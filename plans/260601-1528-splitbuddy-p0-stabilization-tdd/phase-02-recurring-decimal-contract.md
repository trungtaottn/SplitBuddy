---
phase: 2
title: Recurring Decimal Contract
status: completed
priority: P1
effort: 2-3d
dependencies:
  - 1
---

# Phase 2: Recurring Decimal Contract

## Context Links

- `backend/src/domain/recurring_expense.rs`
- `backend/src/api/recurring_expenses.rs`
- `backend/src/repository/recurring_expense_repo.rs`
- `backend/src/scheduler.rs`
- `backend/migrations/`
- `backend/.sqlx/`
- `frontend/src/types/api.ts`
- `frontend/src/pages/session/RecurringExpenses.tsx`

## Overview

Convert recurring money from float to Decimal/string end-to-end. DB already uses DECIMAL; code must stop downcasting precision.

## Requirements

- Functional: recurring create/update/read APIs accept and return money strings.
- Functional: domain/repository/scheduler use `rust_decimal::Decimal`.
- Functional: JSON snapshots store money as strings.
- Non-functional: no `Decimal::from_f64`; no `f64 -> string -> Decimal` conversions.

## Architecture

```text
Frontend recurring form
  -> amount: string
API DTO
  -> parse Decimal at boundary
Domain / Repo / Scheduler
  -> Decimal
Response DTO / snapshot JSON
  -> string
```

No `Amount` newtype in this phase. Raw `Decimal` is enough for P0 and keeps blast radius bounded.

## Related Code Files

- Modify: `backend/src/domain/recurring_expense.rs`
- Modify: `backend/src/api/recurring_expenses.rs`
- Modify: `backend/src/repository/recurring_expense_repo.rs`
- Modify: `backend/src/scheduler.rs`
- Modify: `backend/.sqlx/*.json` affected by recurring queries
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/pages/session/RecurringExpenses.tsx`

## Implementation Steps

1. Tests Before:
   - Assert recurring request amount `"0.10"` stays exact through API/domain/repo mapping.
   - Assert invalid amount string returns validation error.
   - Assert response serializes amount as string.
2. Backend domain:
   - Replace `amount: f64` and `custom_amounts: HashMap<Uuid, f64>` with `Decimal`.
   - Update validation to `Decimal::ZERO` comparisons.
   - Update snapshot structs to serialize string money.
3. API:
   - Change create/update request money fields to `String` / `Option<String>`.
   - Parse with `Decimal::from_str_exact` or equivalent strict parser.
   - Return validation errors through existing `AppError`.
   - Emit response money strings.
4. Repository:
   - Change row structs/query binds from `f64` to `Decimal`.
   - Ensure SQLx DECIMAL maps directly to Decimal.
   - Refresh SQLx offline cache for touched queries.
5. Scheduler:
   - Consume Decimal directly from recurring rows.
   - Delete `Decimal::from_str(&amount.to_string())`.
6. Frontend recurring types/UI:
   - Change recurring API types from `number` to `string`.
   - Keep form input as string until submit.
7. Tests After:
   - Add fractional recurring cases: `"0.01"`, `"0.10"`, `"123.45"`.
   - Add custom split exactness test.
8. Regression Gate:
   - `cd backend && SQLX_OFFLINE=true cargo build && cargo test recurring`
   - `cd frontend && npm run type-check`

## Todo List

- [ ] Recurring domain money fields use Decimal.
- [ ] Recurring API DTO money fields use strings.
- [ ] Repository query structs bind/read Decimal.
- [ ] Scheduler no longer parses Decimal from float strings.
- [ ] Frontend recurring types use string money.
- [ ] SQLx cache refreshed.

## Success Criteria

- [ ] `rg "\\bf(32|64)\\b" backend/src/domain/recurring_expense.rs backend/src/api/recurring_expenses.rs backend/src/repository/recurring_expense_repo.rs backend/src/scheduler.rs` has no recurring money matches.
- [ ] `rg "from_f64|amount\\.to_string\\(\\)" backend/src/{domain,api,repository,scheduler.rs}` finds no recurring money conversion.
- [ ] Recurring API request/response contract is string money.
- [ ] Existing recurring behavior remains covered by tests.

## Risk Assessment

SQLx offline cache may block compile after query type changes. Refresh cache as part of implementation, not as a follow-up.

## Security Considerations

Preserve existing auth extraction and session ownership checks. Do not broaden recurring access while changing DTOs.

## Next Steps

Proceed to Phase 3 after Decimal contract compiles and tests pass.
