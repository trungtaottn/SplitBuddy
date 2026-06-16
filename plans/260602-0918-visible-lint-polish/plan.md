---
title: "Visible Lint Polish"
description: "Remove low-risk frontend warnings from visible wrapped/profile/greeting surfaces."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, ux, lint]
created: "2026-06-02T09:18:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Visible Lint Polish

## Scout Summary

- Remaining warnings are no longer explicit-any; they are hook dependency, fast-refresh structure, lexical declaration, and unused variable warnings.
- Low-risk visible warnings exist in `AiGreeting`, `WrappedModal`, and `ProfilePage`.
- These can be fixed without changing API contracts or UI layout.

## Acceptance Criteria

- `WrappedModal` no longer has the `no-case-declarations` warning.
- `ProfilePage` push notification handlers no longer define unused catch variables.
- `AiGreeting` initial local greeting effect has explicit dependencies without repeat-trigger loops.
- `npm run type-check`, `npm run lint`, `npm test`, and `npm run build` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Low-risk warning fixes | Done |
| 2 | Verification and report | Done |
