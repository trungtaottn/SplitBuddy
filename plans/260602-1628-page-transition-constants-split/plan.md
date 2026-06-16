---
title: "Page Transition Constants Split"
description: "Move shared animation constants out of the component module."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, animation, lint]
created: "2026-06-02T16:28:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Page Transition Constants Split

## Scout Summary

- `PageTransition.tsx` exports route transition components and animation constants.
- `DashboardPage`, `DebtsPage`, and `GroupsPage` import `staggerContainer`/`staggerItem`.
- The shared constants cause three fast-refresh warnings.
- Moving constants to a `.ts` module preserves animation behavior and improves module boundaries.

## Acceptance Criteria

- Animation constants live in a non-component module.
- `PageTransition.tsx` exports only components.
- Pages import shared animation constants from the new module.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Split constants | Done |
| 2 | Verification and report | Done |
