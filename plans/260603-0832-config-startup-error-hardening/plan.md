# Config Startup Error Hardening

## Status

- [x] Verify `Config::from_env` already returns `anyhow::Result`.
- [x] Replace required env `expect` calls with contextual errors.
- [x] Replace production admin password panic with startup error.
- [x] Run backend gates.
- [x] Update docs.

## Scope

- `backend/src/config.rs`
- `docs/code-standards.md`
- `docs/project-roadmap.md`

## Acceptance

- `Config::from_env` contains no `expect` or `panic`.
- Missing/invalid startup config returns actionable errors.
- Backend format/build and money guard pass.
