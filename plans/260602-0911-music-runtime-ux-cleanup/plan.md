---
title: Music Runtime UX Cleanup
description: >-
  Make the app music player less fragile by typing retry handling and fixing
  stale playback closures.
status: completed
priority: P1
effort: 0.5d
branch: refactor/docs-restructure-2026
tags:
  - frontend
  - music
  - ux
  - reliability
created: '2026-06-02T09:11:00+07:00'
createdBy: 'ck:cook'
source: skill
---

# Music Runtime UX Cleanup

## Scout Summary

- `MusicContext` owns global background music state, YouTube playback, HTML audio playback, shuffle, volume persistence, and admin music refresh.
- It still used `error: any` in query retry logic.
- Audio and YouTube error handlers referenced stale `tracks`/`nextTrack` closures, so auto-skip could fail after playlist updates.
- `MusicPlayer` is user-visible, so playback controls must stay responsive and unchanged visually.

## Acceptance Criteria

- `MusicContext.tsx` has no `any`.
- Retry 429 detection uses typed helper.
- Audio/YouTube ended and error handlers always use current playlist/next-track logic.
- Volume persistence still clamps to `[0, 1]`.
- Public `useMusic` API remains unchanged.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Scope

- Modify `frontend/src/contexts/MusicContext.tsx`.
- No visual redesign and no backend/admin music API changes.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Typed retry and playback closure cleanup | Completed |
| 2 | Verification and report | Completed |

