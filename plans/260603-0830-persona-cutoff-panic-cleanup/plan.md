# Persona Cutoff Panic Cleanup

## Status

- [x] Verify static cutoff `expect` location.
- [x] Replace static parse `expect` with safe construction.
- [x] Run backend gates.
- [x] Update docs.

## Scope

- `backend/src/api/personas.rs`
- `docs/code-standards.md`
- `docs/project-roadmap.md`

## Acceptance

- Founding-member cutoff cannot panic.
- Backend format/build and money guard pass.
