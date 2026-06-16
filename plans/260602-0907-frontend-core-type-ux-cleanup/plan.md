---
title: Frontend Core Type UX Cleanup
description: >-
  Remove loose any/error handling from core visible flows after the group-debt
  money upgrade.
status: completed
priority: P0
effort: 0.5d
branch: refactor/docs-restructure-2026
tags:
  - frontend
  - types
  - ux
  - reliability
created: '2026-06-02T09:07:00+07:00'
createdBy: 'ck:cook'
source: skill
---

# Frontend Core Type UX Cleanup

## Scout Summary

- Remaining frontend lint warnings after money stabilization were concentrated in visible UX flows: dashboard, CSV import/export, notifications, feature flags, app layout, and feed optimistic updates.
- Existing utilities already support `unknown` error handling via `getErrorMessage`, and API data models support typed notification/feed data.
- UX impact is error clarity, retry behavior, notification deep-link safety, nav affordance, and less fragile optimistic feed state.

## Acceptance Criteria

- Target files have no `: any`, `as any`, or `error: any`.
- Dashboard retry/archive errors use typed helpers and settled-session checks use Decimal compare.
- CSV import/export errors use the shared error message helper.
- Feature flag and notification retry logic uses typed rate-limit detection.
- Notification deep links read `session_id` through a type guard.
- Feed optimistic like update uses typed cache data.
- `npm run type-check` and `npm run lint` pass.

## Scope

- Modify only frontend utility/error and visible-flow files.
- Do not redesign layouts or change API contracts.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Typed visible-flow cleanup | Completed |
| 2 | Verification and guard sync | Completed |

