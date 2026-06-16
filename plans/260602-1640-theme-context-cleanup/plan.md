# Theme Context Cleanup

## Status

- [x] Verify theme hook consumers.
- [x] Split context and hook out of provider module.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/contexts/ThemeContext.tsx`
- `frontend/src/contexts/theme-context.ts`
- `frontend/src/contexts/use-theme.ts`
- Theme hook imports
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `ThemeContext.tsx` exports only `ThemeProvider`.
- Theme hook imports resolve from `contexts/use-theme`.
- Type-check, lint, tests, build, and money guard pass.
