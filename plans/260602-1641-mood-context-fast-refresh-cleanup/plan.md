# Mood Context Fast Refresh Cleanup

## Status

- [x] Verify mood config and hook consumers.
- [x] Move mood config/types to sidecar.
- [x] Move `useMood` to sidecar.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/contexts/MoodContext.tsx`
- `frontend/src/contexts/mood-configs.ts`
- `frontend/src/contexts/mood-context.ts`
- `frontend/src/contexts/use-mood.ts`
- Mood imports in `AiGreeting`, `FloatingChat`, `MoodEffects`
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `MoodContext.tsx` exports only `MoodProvider`.
- Mood config/type imports resolve from `contexts/mood-configs`.
- `useMood` imports resolve from `contexts/use-mood`.
- Type-check, lint, tests, build, and money guard pass.
