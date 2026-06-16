---
title: "Smart Suggestions Dead Hook Cleanup"
description: "Remove unused bill prediction hook with float money parsing."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, suggestions, money, lint]
created: "2026-06-02T16:26:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Smart Suggestions Dead Hook Cleanup

## Scout Summary

- `SmartSuggestions.tsx` exports `SmartSuggestions` plus unused `useBillPrediction`.
- Repo search shows no `useBillPrediction` consumers.
- The hook uses `parseFloat` on bill amounts and causes a fast-refresh warning.
- Removing it keeps the suggestions UI unchanged.

## Acceptance Criteria

- `useBillPrediction` is removed.
- `SmartSuggestions.tsx` exports only the component.
- No references to `useBillPrediction` remain.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Remove unused hook | Done |
| 2 | Verification and report | Done |
