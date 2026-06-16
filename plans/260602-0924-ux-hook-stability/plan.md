---
title: "UX Hook Stability"
description: "Clear low-risk hook dependency warnings in chat, Kings Cup, and animated counters."
status: completed
priority: P1
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, ux, lint]
created: "2026-06-02T09:24:00+07:00"
createdBy: "ck:cook"
source: skill
---

# UX Hook Stability

## Scout Summary

- `FloatingChat` adds the initial assistant greeting with omitted dependencies.
- `KingsCup` initializes the deck by calling a component-local shuffle function from an empty-deps effect.
- `AnimatedNumber` starts animations from a stale captured display value.
- Fixes are local to existing frontend files with no API or route contract changes.

## Acceptance Criteria

- Chat initial greeting effect has complete dependencies and still only seeds empty chat history while open.
- Kings Cup deck helpers are stable outside render state.
- Animated number starts from the latest displayed value without hook dependency warning.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Hook patches | Done |
| 2 | Verification and report | Done |
