---
phase: 2
title: "Session API Modularization"
status: completed
priority: P1
effort: "2-3d"
dependencies:
  - 1
---

# Phase 2: Session API Modularization

## Overview

Reduce `backend/src/api/sessions/mod.rs` from mixed route/DTO/handler/business orchestration into route wiring and shared exports. Keep URLs and response shapes stable.

## Requirements

- Functional: all existing session routes continue to compile and return the same contract.
- Functional: bill, participant, debt, import/export, and lifecycle handlers live in focused modules.
- Non-functional: no authz policy changes in this phase unless required to preserve behavior.

## Architecture

```text
backend/src/api/sessions/
  mod.rs
  dto.rs
  session_handlers.rs
  bills.rs
  participants.rs
  debts.rs
  import_export_handlers.rs
  stats_handlers.rs
```

Current files already include `bills.rs`, `participants.rs`, and `debts.rs`; continue extracting from `mod.rs` into those or new focused modules.

## Related Code Files

- Modify: `backend/src/api/sessions/mod.rs`
- Modify: `backend/src/api/sessions/bills.rs`
- Modify: `backend/src/api/sessions/participants.rs`
- Modify: `backend/src/api/sessions/debts.rs`
- Create: `backend/src/api/sessions/dto.rs`
- Create: `backend/src/api/sessions/session_handlers.rs`
- Create: `backend/src/api/sessions/import_export_handlers.rs` if import/export handlers remain in `mod.rs`.
- Create: `backend/src/api/sessions/stats_handlers.rs` if stats handlers remain in `mod.rs`.

## Implementation Steps

1. Tests Before:
   - Add route registration smoke test if backend has router test harness.
   - Add serialization tests for moved DTOs that are part of the public contract.
2. Move DTOs from `mod.rs` into `dto.rs`.
3. Move create/read/update/archive/close/reopen handlers into `session_handlers.rs`.
4. Move import/export handlers into a focused module if present.
5. Move stats/summary handlers into a focused module if present.
6. Keep `mod.rs` as:
   - module declarations.
   - route wiring.
   - shared exports.
7. Preserve route order where Axum matching depends on static vs dynamic paths.
8. Run:
   - `cd backend && cargo fmt -- --check`
   - `cd backend && SQLX_OFFLINE=true cargo build`
   - targeted backend tests for session routes.

## Progress Notes

- 2026-06-03: Moved shared session DTO/query/response types into `backend/src/api/sessions/dto.rs` with serialization/default regression tests.
- 2026-06-03: Moved list/create/read/lifecycle/archive handlers into `backend/src/api/sessions/session_handlers.rs`; `mod.rs` keeps route wiring and remaining import/export/stat logic.
- 2026-06-05: Moved close/reopen/minimize-debts handlers into `backend/src/api/sessions/session_status_handlers.rs`.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test`.
- 2026-06-03: Moved import/export handlers into `backend/src/api/sessions/import_export_handlers.rs` and who-pays-next into `backend/src/api/sessions/stats_handlers.rs`; `mod.rs` is now route wiring plus module declarations and DTO re-exports.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test`, `make check-money`.

## Success Criteria

- [x] `backend/src/api/sessions/mod.rs` is route wiring plus shared exports.
- [x] DTOs are not duplicated across handler files.
- [x] URLs and response envelopes do not change.
- [x] `SQLX_OFFLINE=true cargo build` passes.
- [x] Route/DTO regression tests pass.

## Risk Assessment

Axum route ordering can regress silently. Keep path registration order stable and add a smoke test for representative static and dynamic routes.

## Security Considerations

Do not broaden endpoint access while moving handlers. Authz matrix lands in Phase 3.
