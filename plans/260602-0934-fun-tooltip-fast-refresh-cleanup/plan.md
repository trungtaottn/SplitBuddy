---
title: "Fun Tooltip Fast Refresh Cleanup"
description: "Split tooltip message constants from the component module."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, ux, lint]
created: "2026-06-02T09:34:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Fun Tooltip Fast Refresh Cleanup

## Scout Summary

- `FunTooltip.tsx` exports a component plus `FUN_MESSAGES`, causing a fast-refresh warning.
- `FUN_MESSAGES` is consumed by `DebtsPage`.
- The copy can move to a colocated `.ts` constants module without UI contract changes.

## Acceptance Criteria

- `FunTooltip.tsx` exports only the component.
- `DebtsPage` imports tooltip messages from the new constants module.
- `FunTooltip.tsx` no longer emits a fast-refresh warning.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Split constants | Done |
| 2 | Verification and report | Done |
