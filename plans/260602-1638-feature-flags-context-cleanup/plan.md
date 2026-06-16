# Feature Flags Context Cleanup

## Status

- [x] Verify feature flag hook consumers.
- [x] Split context and hooks out of provider module.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/contexts/FeatureFlagsContext.tsx`
- `frontend/src/contexts/feature-flags-context.ts`
- `frontend/src/contexts/use-feature-flags.ts`
- Feature flag hook imports
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `FeatureFlagsContext.tsx` exports only `FeatureFlagsProvider`.
- Feature flag hooks import from `contexts/use-feature-flags`.
- Type-check, lint, tests, build, and money guard pass.
