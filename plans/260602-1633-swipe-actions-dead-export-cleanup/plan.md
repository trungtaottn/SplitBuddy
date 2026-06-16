# Swipe Actions Dead Export Cleanup

## Status

- [x] Verify live imports.
- [x] Remove unused exports from `SwipeActions.tsx`.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/components/ui/SwipeActions.tsx`
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `SwipeActions.tsx` exports only the live component.
- Fast-refresh warning count drops.
- Type-check, lint, tests, build, and money guard pass.
