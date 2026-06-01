---
title: SplitBuddy P0 Stabilization TDD
description: >-
  Stabilize money, recurring execution, runtime safety, and CI gates before new
  feature work.
status: completed
priority: P1
effort: 8-12d
branch: refactor/docs-restructure-2026
tags:
  - refactor
  - backend
  - frontend
  - critical
  - tech-debt
blockedBy: []
blocks: []
created: '2026-06-01T08:28:45.092Z'
createdBy: 'ck:plan'
source: skill
---

# SplitBuddy P0 Stabilization TDD

## Overview

TDD plan for the P0 stabilization slice from `docs/reviews/260601-splitbuddy-stabilization-brainstorm.md`.

Scope is intentionally smaller than the full brainstorm: recurring Decimal/string contract, scheduler/startup/push panic removal, frontend money critical path typing, and hard CI gates. Session repo/API modularization, full authz matrix, and WebSocket hardening are P1 follow-up work.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Baseline Regression Harness](./phase-01-baseline-regression-harness.md) | Completed |
| 2 | [Recurring Decimal Contract](./phase-02-recurring-decimal-contract.md) | Completed |
| 3 | [Scheduler Runtime Safety](./phase-03-scheduler-runtime-safety.md) | Completed |
| 4 | [Frontend Money Critical Path](./phase-04-frontend-money-critical-path.md) | Completed |
| 5 | [CI Guardrails And Docs](./phase-05-ci-guardrails-and-docs.md) | Completed |

## Dependencies

- Source brainstorm: `docs/reviews/260601-splitbuddy-stabilization-brainstorm.md`
- Living docs: `docs/project-roadmap.md`, `docs/codebase-summary.md`, `docs/code-standards.md`, `docs/system-architecture.md`
- Deep review: `docs/reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md`
- Backend gates: `cd backend && SQLX_OFFLINE=true cargo build && cargo test`
- Frontend gates: `cd frontend && npm run type-check && npm run build`
- Final gate: `make check`

## Success Criteria

- Recurring money path has no `f64`/`f32`; API money is string, backend money is `rust_decimal::Decimal`.
- Frontend core bill/debt/recurring optimistic path has no `any`, `parseFloat`, or number money math.
- Scheduler processes due recurring rows independently; one bad item logs/skips without stopping the loop.
- Startup, scheduler, push, and recurring date paths have no production `unwrap()`/`expect()` except proven invariants.
- CI fails on frontend type-check/build failures and blocks obvious money-float regressions.

## Out Of Scope

- Session repository/API modularization.
- Full mutating endpoint authz matrix implementation.
- WebSocket subscribe authz and reconnect hardening.
- Payments/feed/games/AI/product expansion.
