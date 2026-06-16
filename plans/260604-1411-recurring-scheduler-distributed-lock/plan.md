# Recurring Scheduler Distributed Lock

## Context
- Scheduler scans due recurring rows every tick.
- Per-expense transaction uses `FOR UPDATE` and snapshot idempotency.
- Docs still list multi-instance scheduler lock as scale debt.

## Scope
- Add one PostgreSQL advisory transaction lock around each scheduler run.
- Skip a tick when another instance owns the run lock.
- Keep per-expense isolation and metrics.
- Fix directly adjacent exception cleanup SQL if compile gates touch it.
- Update living docs.

## Out of Scope
- Redis lock.
- Leader election service.
- Scheduler runtime config changes.

## Touchpoints
- `backend/src/scheduler.rs`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`
- `docs/project-roadmap.md`

## Todo
- [x] Add run lock helper and tests.
- [x] Gate `process_due_expenses`.
- [x] Update docs.
- [x] Run backend gates.
