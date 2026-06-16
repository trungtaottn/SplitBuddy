# Toast Wrapper Fast Refresh Cleanup

## Status

- [x] Verify toast consumers.
- [x] Move toast wrapper out of `toaster.tsx`.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/components/ui/toaster.tsx`
- `frontend/src/components/ui/toast.tsx`
- Toast wrapper imports
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `toaster.tsx` exports only the `Toaster` component.
- Toast wrapper imports resolve from `ui/toast`.
- Type-check, lint, tests, build, and money guard pass.
