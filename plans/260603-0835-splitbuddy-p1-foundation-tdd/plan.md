---
title: SplitBuddy P1 Foundation TDD
description: >-
  Continue the stabilization brainstorm after completed P0: split session god
  objects, enforce the agreed authz matrix, harden WebSocket subscription authz,
  and lock the new boundaries with tests and CI.
status: completed
priority: P1
effort: 10-15d
branch: refactor/docs-restructure-2026
tags:
  - backend
  - refactor
  - authz
  - websocket
  - tdd
blockedBy: []
blocks: []
created: '2026-06-03T01:36:27.358Z'
createdBy: 'ck:plan'
source: skill
---

# SplitBuddy P1 Foundation TDD

## Overview

TDD plan for the P1 foundation slice from `docs/reviews/260601-splitbuddy-stabilization-brainstorm.md`.

P0 money/runtime/CI stabilization already has `plans/260601-1528-splitbuddy-p0-stabilization-tdd/`. This plan excludes money contract rebuild and focuses on maintainability and access-control foundations: session repository/API modularization, agreed mutating authz rules, server-side WebSocket subscribe authz, and follow-up guardrails.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Session Repository Modularization](./phase-01-session-repository-modularization.md) | Completed |
| 2 | [Session API Modularization](./phase-02-session-api-modularization.md) | Completed |
| 3 | [Authz Matrix Implementation](./phase-03-authz-matrix-implementation.md) | Completed |
| 4 | [WebSocket Subscribe Hardening](./phase-04-websocket-subscribe-hardening.md) | Completed |
| 5 | [Foundation CI And Docs](./phase-05-foundation-ci-and-docs.md) | Completed |

## Dependencies

- Source brainstorm: `docs/reviews/260601-splitbuddy-stabilization-brainstorm.md`
- Completed P0 plan: `plans/260601-1528-splitbuddy-p0-stabilization-tdd/`
- Current repo split already exists under `backend/src/repository/session/` and `backend/src/api/sessions/`; continue it, do not restart.
- Backend gates: `cd backend && cargo fmt -- --check && SQLX_OFFLINE=true cargo build && cargo test`
- Frontend gates after WS changes: `cd frontend && npm run lint && npm run type-check && npm test`
- Money guard remains in `make check-money`.

## Success Criteria

- `backend/src/repository/session_repo.rs` becomes a facade or disappears; capability modules own read/write/bill/debt/participant/import-export/stat responsibilities.
- `backend/src/api/sessions/mod.rs` is route wiring plus shared exports; handler families live in focused modules.
- Mutating session/bill/participant/debt/recurring endpoints enforce the agreed matrix from the brainstorm.
- WebSocket `Subscribe { session_id }` verifies session participant/admin access server-side before mutating subscription state.
- Negative 401/403 tests cover money-relevant mutations and WS subscription denial.
- CI reports or blocks new session/API god-object growth without breaking on existing historical debt unrelated to touched files.

## Out Of Scope

- New product features.
- Payments/feed/games/AI expansion.
- Full permission-engine/RBAC table.
- Multi-instance realtime ordering guarantees beyond subscribe authz and existing Redis/local behavior.
- Rebuilding frontend route/page architecture.
