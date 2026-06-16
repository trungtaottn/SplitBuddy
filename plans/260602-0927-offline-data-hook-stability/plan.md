---
title: "Offline Data Hook Stability"
description: "Stabilize offline-first fetching against stale query functions and falsey cached data."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, pwa, offline, hooks]
created: "2026-06-02T09:27:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Offline Data Hook Stability

## Scout Summary

- `useOfflineData` is the shared offline-first fetch/cache hook.
- Its mount effect omits `fetchData`, which can keep stale `queryFn` behavior after callers change.
- Cached values are checked by truthiness, so valid falsey cached data is treated as absent.
- Fix is local to `frontend/src/hooks/useOffline.ts` and does not change the public hook shape.

## Acceptance Criteria

- `fetchData` reads the latest `queryFn` without making the mount effect loop on render-created callbacks.
- Cached values are considered present when they are not `null`.
- `useOfflineData` no longer emits a hook dependency warning.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Hook patch | Done |
| 2 | Verification and report | Done |
