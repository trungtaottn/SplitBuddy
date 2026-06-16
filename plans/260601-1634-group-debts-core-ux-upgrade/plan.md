---
title: Group Debts Core UX Upgrade
description: >-
  Make the group debt overview safer and smoother by removing float money math
  from the user-facing group debt flow.
status: completed
priority: P0
effort: 0.5d
branch: refactor/docs-restructure-2026
tags:
  - frontend
  - money
  - ux
  - debt
created: '2026-06-01T16:34:00+07:00'
createdBy: 'ck:cook'
source: skill
---

# Group Debts Core UX Upgrade

## Scout Summary

- SplitBuddy is React 18 + TypeScript + Vite frontend, Rust Axum backend, PostgreSQL, Decimal money contracts.
- P0 recurring/core bill money path is fixed; remaining user-facing money drift exists in group debt overview.
- `frontend/src/pages/GroupDebtsPage.tsx` is 674 LOC and still uses `parseFloat` for totals, rankings, table checks, and monthly totals.
- Existing `frontend/src/utils/money.ts` provides Decimal-backed helpers already used by bill/debt core paths.
- Group debt API types already expose money as strings, so no backend/API contract change is needed.

## Acceptance Criteria

- `GroupDebtsPage.tsx` has no `parseFloat`, `: any`, or `as any`.
- Group debt totals, averages, ranking tie-breakers, table totals, and member owed totals use Decimal helpers.
- Touch targets on filter controls and expand control remain keyboard/click accessible with labels.
- Existing API response contracts stay unchanged.
- `npm run type-check`, `npm test`, `npm run build`, and money guard pass.

## Scope

- Modify `frontend/src/pages/GroupDebtsPage.tsx`.
- Add money helper tests only if a missing edge is found.
- Do not redesign page structure or backend contracts in this slice.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Decimal-safe group debt calculations | Completed |
| 2 | Verification and docs sync | Completed |

