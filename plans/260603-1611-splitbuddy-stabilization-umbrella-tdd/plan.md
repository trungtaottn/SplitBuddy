---
title: "SplitBuddy Stabilization Umbrella TDD"
description: >-
  Umbrella execution plan for the stabilization brainstorm, linking completed
  P0, completed debt-netting work, and active P1 foundation work.
status: completed
priority: P1
branch: "refactor/docs-restructure-2026"
tags:
  - stabilization
  - tdd
  - backend
  - frontend
  - debt-netting
blockedBy: []
blocks:
  - "260603-0835-splitbuddy-p1-foundation-tdd"
created: "2026-06-03T09:11:36.421Z"
createdBy: "ck:plan"
source: skill
---

# SplitBuddy Stabilization Umbrella TDD

## Overview

This plan coordinates the remaining work from `docs/reviews/260601-splitbuddy-stabilization-brainstorm.md`.

Existing split is correct and should stay split:

- P0 money/runtime/CI stabilization: completed in `plans/260601-1528-splitbuddy-p0-stabilization-tdd/`.
- Debt netting stabilization: completed in `plans/260603-1309-debt-netting-stabilization/`.
- P1 foundation: completed in `plans/260603-0835-splitbuddy-p1-foundation-tdd/`.

Do not reopen broad product scope. Finish P1, keep tests first, and lock gates so money/debt/authz regressions fail before merge.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Audit Existing Stabilization Plans](./phase-01-audit-existing-stabilization-plans.md) | Completed |
| 2 | [Close Debt Netting Follow Ups](./phase-02-close-debt-netting-follow-ups.md) | Completed |
| 3 | [Execute P1 Foundation](./phase-03-execute-p1-foundation.md) | Completed |
| 4 | [Lock Stabilization Gates](./phase-04-lock-stabilization-gates.md) | Completed |

## Dependencies

- Source brainstorm: `docs/reviews/260601-splitbuddy-stabilization-brainstorm.md`
- Completed P0: `plans/260601-1528-splitbuddy-p0-stabilization-tdd/`
- Active P1: `plans/260603-0835-splitbuddy-p1-foundation-tdd/`
- Debt netting: `plans/260603-1309-debt-netting-stabilization/`
- Living docs: `docs/project-roadmap.md`, `docs/codebase-summary.md`, `docs/code-standards.md`, `docs/system-architecture.md`

## Success Criteria

- P0 remains verified completed; no duplicate P0 work is created.
- Debt netting has explicit regression coverage for current known failure modes.
- P1 session/API/authz/WS work is implemented via tests-first slices.
- Final gates pass: `cargo fmt -- --check`, `SQLX_OFFLINE=true cargo build`, `cargo test`, `npm run lint`, `npm run type-check`, `npm run build`, `make check-money`.
- Docs reflect actual completed work without claiming unrelated dirty-tree changes.
