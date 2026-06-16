# Auth Context Fast Refresh Cleanup

## Status

- [x] Verify `useAuth` consumers.
- [x] Split context and hook out of provider module.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/contexts/auth-context.ts`
- `frontend/src/contexts/use-auth.ts`
- `useAuth` imports
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `AuthContext.tsx` exports only `AuthProvider`.
- `useAuth` imports resolve from `contexts/use-auth`.
- Type-check, lint, tests, build, and money guard pass.
