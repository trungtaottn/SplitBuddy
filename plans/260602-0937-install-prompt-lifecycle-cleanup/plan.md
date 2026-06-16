---
title: "Install Prompt Lifecycle Cleanup"
description: "Remove unused PWA hook export and clear delayed prompt timers."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, pwa, lint]
created: "2026-06-02T09:37:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Install Prompt Lifecycle Cleanup

## Scout Summary

- `InstallPrompt.tsx` exports the component plus an unused `usePWAInstall` hook.
- The component schedules delayed prompt timers without cleanup.
- `InstallPrompt` is used from `App.tsx`; `usePWAInstall` has no callers.
- Fix is local to `frontend/src/components/InstallPrompt.tsx`.

## Acceptance Criteria

- `InstallPrompt.tsx` exports only the component.
- Delayed install prompt timers are cleared on unmount.
- `InstallPrompt.tsx` no longer emits a fast-refresh warning.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Component cleanup | Done |
| 2 | Verification and report | Done |
