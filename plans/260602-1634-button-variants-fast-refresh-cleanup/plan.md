# Button Variants Fast Refresh Cleanup

## Status

- [x] Verify `buttonVariants` usage.
- [x] Move button variants to a non-component module.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/button-variants.ts`
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `button.tsx` exports only React components/types.
- `buttonVariants` remains available from the sidecar module.
- Type-check, lint, tests, build, and money guard pass.
