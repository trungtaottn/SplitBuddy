# App State Startup Error Hardening

## Status

- [x] Verify `AppState::new` call site.
- [x] Make HTTP client construction return startup error instead of panic.
- [x] Run backend and affected guard gates.
- [x] Update docs.

## Scope

- `backend/src/api/mod.rs`
- `backend/src/main.rs`
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- `AppState::new` no longer panics on HTTP client builder failure.
- `main` propagates app-state initialization errors through `anyhow`.
- Backend format/build and money guard pass.
