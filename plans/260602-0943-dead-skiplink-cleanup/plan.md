---
title: "Dead SkipLink Cleanup"
description: "Remove unused accessibility helper module that only self-references."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, accessibility, lint]
created: "2026-06-02T09:43:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Dead SkipLink Cleanup

## Scout Summary

- `frontend/src/components/SkipLink.tsx` exports `useFocusManagement`, `LiveRegion`, and `useAnnounce`.
- Repo search shows no consumers outside the file itself.
- Keeping the module adds two fast-refresh warnings and unused accessibility surface.
- Removing it has no import blast radius.

## Acceptance Criteria

- `SkipLink.tsx` is removed.
- No imports or references to its exports remain.
- Lint warning count drops by 2.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Delete dead module | Done |
| 2 | Verification and report | Done |
