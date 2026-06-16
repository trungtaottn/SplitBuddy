---
title: Profile Sound Type Cleanup
description: >-
  Remove remaining visible explicit-any edges from persona editing, feed
  metadata, and game sound initialization.
status: completed
priority: P1
effort: 0.5d
branch: refactor/docs-restructure-2026
tags:
  - frontend
  - profile
  - audio
  - types
created: '2026-06-02T09:15:00+07:00'
createdBy: 'ck:cook'
source: skill
---

# Profile Sound Type Cleanup

## Scout Summary

- Remaining explicit `any` warnings are now concentrated in `PersonaEditor`, feed metadata typing, and `sounds.ts`.
- `PersonaEditor` already has `UpdatePersonaRequest`; mutation payload can be typed without changing API contracts.
- Feed metadata is JSON-like API payload and should use `Record<string, unknown>`.
- `sounds.ts` only needs a typed WebKit AudioContext fallback.

## Acceptance Criteria

- Target files have no `any`.
- Persona update payload uses `UpdatePersonaRequest`.
- Feed metadata uses `unknown` values.
- Sound manager creates AudioContext without casting `window` to `any`.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Scope

- Modify `frontend/src/components/profile/PersonaEditor.tsx`, `frontend/src/types/api.ts`, `frontend/src/utils/sounds.ts`.
- No visual redesign and no backend contract change.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Typed persona/feed/sound cleanup | Completed |
| 2 | Verification and report | Completed |

