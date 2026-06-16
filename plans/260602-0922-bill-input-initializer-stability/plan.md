---
title: "Bill Input Initializer Stability"
description: "Stabilize edit-mode bill form initialization for currency and split strategy."
status: completed
priority: P0
effort: "0.25d"
branch: "refactor/docs-restructure-2026"
tags: [frontend, bills, money, lint]
created: "2026-06-02T09:22:00+07:00"
createdBy: "ck:cook"
source: skill
---

# Bill Input Initializer Stability

## Scout Summary

- `BillInput` is the core create/edit bill form used by `SessionDetailPage`.
- The initialization effect reads `currencyCode` while setting `currencyCode`, producing stale fallback behavior for edited bills without `currency_code`.
- The same effect maps only `CUSTOM` back to `CUSTOM`; `WEIGHTED` edit data is reset to `EQUAL`.
- Fix can stay inside `frontend/src/components/BillInput.tsx` with no API contract change.

## Acceptance Criteria

- Edited bill custom split initialization uses a local resolved currency, not stale state.
- Edited bill `WEIGHTED` strategy stays `WEIGHTED`.
- `BillInput` no longer emits the hook dependency warning.
- `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `make check-money` pass.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Initializer patch | Done |
| 2 | Verification and report | Done |
