# Backend Feature Flag Enforcement

## Context
- Existing table: `feature_flags`.
- Existing frontend gates: `groups`, `debts`, `games`, `group_debts`, `group_debts_simplified`, `ai_assistant`, `notifications`.
- Existing backend gap: most feature flags are UI-only.

## Scope
- Add shared backend feature-flag guard.
- Replace group-local flag lookup.
- Enforce seeded flags on matching backend APIs.
- Update living docs.

## Out of Scope
- New feature flags.
- Route restructuring.
- Frontend changes.

## Touchpoints
- `backend/src/api/mod.rs`
- `backend/src/api/feature_flags.rs`
- `backend/src/api/groups.rs`
- `backend/src/api/debts.rs`
- `backend/src/api/games.rs`
- `backend/src/api/ai.rs`
- `backend/src/api/notifications.rs`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`
- `docs/project-roadmap.md`

## Todo
- [x] Add shared guard.
- [x] Apply route gates.
- [x] Update docs.
- [x] Run backend gates.
