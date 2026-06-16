---
title: "Onboarding Context Split"
description: "Move onboarding hook/context out of the component module."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, onboarding, lint]
created: "2026-06-02T16:24:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Onboarding Context Split

## Scout Summary

- `Onboarding.tsx` exports `OnboardingProvider`, `StartOnboardingButton`, and `useOnboarding`.
- `DashboardPage` and `ProfilePage` import `useOnboarding` directly from the component module.
- The hook export causes a fast-refresh warning and couples page logic to the component file.
- Splitting context/hook into a `.ts` module preserves behavior and improves module boundaries.

## Acceptance Criteria

- `useOnboarding` lives in a non-component module.
- `Onboarding.tsx` exports only components.
- `DashboardPage` and `ProfilePage` import the hook from the new module.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Split context/hook | Done |
| 2 | Verification and report | Done |
