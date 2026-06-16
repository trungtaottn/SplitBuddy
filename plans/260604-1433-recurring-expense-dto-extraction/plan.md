# Recurring Expense DTO Extraction

## Context
- `backend/src/api/recurring_expenses.rs` is a large API module.
- Request/response DTOs and money parsing are independent from route orchestration.

## Scope
- Move recurring expense DTOs and response mapping into a sibling module.
- Move positive money parsing with DTO-adjacent validation.
- Keep routes and payload contracts unchanged.
- Update living docs.

## Touchpoints
- `backend/src/api/recurring_expenses.rs`
- `backend/src/api/recurring_expense_dto.rs`
- `backend/src/api/mod.rs`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`

## Todo
- [x] Extract DTOs.
- [x] Run backend gates.
- [x] Update docs.
