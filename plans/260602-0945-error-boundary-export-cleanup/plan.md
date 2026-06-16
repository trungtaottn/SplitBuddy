---
title: "Error Boundary Export Cleanup"
description: "Remove unused non-component hook export from ErrorBoundary module."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, errors, lint]
created: "2026-06-02T09:45:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Error Boundary Export Cleanup

## Scout Summary

- `ErrorBoundary.tsx` is used by `App.tsx`.
- `useErrorHandler` is exported from the same file but has no consumers.
- That non-component export causes a fast-refresh warning.
- Removing the unused hook keeps the error UI contract unchanged.

## Acceptance Criteria

- `useErrorHandler` is removed.
- `ErrorBoundary` and `AsyncBoundary` exports remain intact.
- `ErrorBoundary.tsx` no longer emits a fast-refresh warning.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Remove unused hook | Done |
| 2 | Verification and report | Done |
