# Music Context Fast Refresh Cleanup

## Status

- [x] Verify music hook consumers.
- [x] Split music context contract out of provider module.
- [x] Move `useMusic` to sidecar.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/contexts/MusicContext.tsx`
- `frontend/src/contexts/music-context.ts`
- `frontend/src/contexts/use-music.ts`
- Music hook imports
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `MusicContext.tsx` exports only `MusicProvider`.
- `useMusic` imports resolve from `contexts/use-music`.
- Type-check, lint, tests, build, and money guard pass.
