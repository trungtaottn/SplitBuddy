---
title: "Offline Indicator Fast Refresh Cleanup"
description: "Remove duplicate offline hook export and stabilize reconnect timeout cleanup."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, pwa, offline, lint]
created: "2026-06-02T09:30:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Offline Indicator Fast Refresh Cleanup

## Scout Summary

- `OfflineIndicator.tsx` exports both a component and an unused duplicate `useOnlineStatus` hook.
- The canonical online-status hook already lives in `frontend/src/hooks/useOffline.ts`.
- Reconnect banner timeout is not cleared on unmount.
- Fix is local to `frontend/src/components/OfflineIndicator.tsx`.

## Acceptance Criteria

- `OfflineIndicator.tsx` exports only the component.
- Reconnect timeout is cleared before replacement and on unmount.
- `OfflineIndicator.tsx` no longer emits a fast-refresh warning.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Component cleanup | Done |
| 2 | Verification and report | Done |
