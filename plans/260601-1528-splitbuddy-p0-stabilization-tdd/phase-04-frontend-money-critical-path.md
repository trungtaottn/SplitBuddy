---
phase: 4
title: Frontend Money Critical Path
status: completed
priority: P1
effort: 2-3d
dependencies:
  - 1
  - 2
---

# Phase 4: Frontend Money Critical Path

## Context Links

- `frontend/src/components/BillInput.tsx`
- `frontend/src/pages/SessionDetailPage.tsx`
- `frontend/src/pages/session/DebtBreakdown.tsx`
- `frontend/src/pages/DebtsPage.tsx`
- `frontend/src/pages/session/RecurringExpenses.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/types/api.ts`
- `frontend/src/utils/formatCurrency.ts`

## Overview

Replace core frontend money float math and `any` optimistic updates with typed DTOs and Decimal-backed helpers.

## Requirements

- Functional: bill create/update/delete optimistic totals stay exact as string money.
- Functional: split previews use Decimal math and deterministic remainder handling aligned with backend.
- Functional: debt totals/netting display paths stop accumulating money with JS numbers.
- Non-functional: no `any` in API, bill/debt/recurring optimistic paths.

## Architecture

```text
types/api.ts
  -> typed bill/session/recurring DTOs
utils/money.ts
  -> Decimal helpers return strings
BillInput / SessionDetail / Debt views
  -> consume helpers, never parseFloat for money
```

Keep UI components intact unless extraction is necessary for testability. Large component modularization is P1.

## Related Code Files

- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/utils/formatCurrency.ts`
- Create: `frontend/src/utils/money.ts` if no existing helper fits.
- Create: `frontend/src/utils/money.test.ts`
- Modify: `frontend/src/components/BillInput.tsx`
- Modify: `frontend/src/pages/SessionDetailPage.tsx`
- Modify: `frontend/src/pages/session/DebtBreakdown.tsx`
- Modify: `frontend/src/pages/DebtsPage.tsx`
- Modify: `frontend/src/pages/session/RecurringExpenses.tsx`

## Implementation Steps

1. Tests Before:
   - Money helper tests from Phase 1 must exist.
   - Add optimistic total test for add/update/delete bill using string totals.
2. Types:
   - Define typed create/update bill request DTOs in `types/api.ts`.
   - Replace `any` arguments in `lib/api.ts`.
   - Change recurring/frontend money fields to strings.
3. Money helpers:
   - Add Decimal-backed add/subtract/multiply/divide/compare helpers returning normalized strings.
   - Add split helpers for equal, weighted, and custom mode.
   - Keep final display through existing `formatCurrency`.
4. BillInput:
   - Replace `parseFloat`, `Math.round`, `toFixed` money math with helpers.
   - Keep user input as string.
   - Submit string money payloads.
5. SessionDetailPage:
   - Type TanStack query snapshots.
   - Replace optimistic total updates with Decimal helpers.
   - Type mutation errors as `unknown` plus existing toast guards.
6. Debt views:
   - Replace money reductions with Decimal helper accumulation.
   - Convert to number only at chart/display boundary if unavoidable, never for stored totals.
7. Tests After:
   - Add fractional split cases and rollback cases.
8. Regression Gate:
   - `cd frontend && npm run type-check`
   - `cd frontend && npm run build`

## Todo List

- [ ] API wrapper bill/participant/recurring money paths typed.
- [ ] Decimal money helper added with tests.
- [ ] BillInput money math has no `parseFloat`.
- [ ] SessionDetail optimistic updates have no `any` and no float math.
- [ ] Debt views stop number accumulation for money totals.
- [ ] Recurring frontend amount types are strings.

## Success Criteria

- [ ] `rg "parseFloat" frontend/src/components/BillInput.tsx frontend/src/pages/SessionDetailPage.tsx frontend/src/pages/session/DebtBreakdown.tsx frontend/src/pages/DebtsPage.tsx` has no money-path matches.
- [ ] `rg ":\\s*any|as any" frontend/src/lib/api.ts frontend/src/pages/SessionDetailPage.tsx frontend/src/components/BillInput.tsx frontend/src/pages/session/RecurringExpenses.tsx` has no matches.
- [ ] `npm run type-check` passes without relying on `no-explicit-any` warnings.
- [ ] Fractional bill and recurring values stay string-exact through UI state.

## Risk Assessment

Backend and frontend split rounding must match. If helper logic conflicts with `SplitCalculator`, treat backend as source of truth and adjust frontend preview expectations.

## Security Considerations

Typed API updates must preserve auth headers and existing error handling. Do not weaken protected route behavior.

## Next Steps

Proceed to Phase 5 after frontend type-check/build pass.
