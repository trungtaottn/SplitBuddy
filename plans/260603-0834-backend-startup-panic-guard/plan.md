# Backend Startup Panic Guard

## Status

- [x] Verify cleaned backend startup/API paths.
- [x] Add local guard for production panic tokens.
- [x] Add CI guard for production panic tokens.
- [x] Run affected gates.
- [x] Update docs.

## Scope

- `Makefile`
- `.github/workflows/ci.yml`
- `docs/code-standards.md`
- `docs/project-roadmap.md`

## Acceptance

- `unwrap`, `expect`, and `panic!` are blocked in backend `api`, `config`, and `main` paths.
- Local and CI guard paths match.
- Backend build and money guard pass.

## Verification

- `make check-money`
- `cd backend && cargo fmt -- --check`
- `cd backend && SQLX_OFFLINE=true cargo build`
