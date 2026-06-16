# Frontend Quality Gate

## Status

- [x] Verify frontend lint is currently clean.
- [x] Make `npm run lint` fail on warnings.
- [x] Add lint to `make check-frontend`.
- [x] Add lint to CI frontend job before build.
- [x] Add frontend audit to local and CI gates.
- [x] Run verification and update docs.

## Scope

- `frontend/package.json`
- `Makefile`
- `.github/workflows/ci.yml`
- `docs/code-standards.md`
- `docs/project-roadmap.md`

## Acceptance

- Frontend lint warnings and moderate+ audit vulnerabilities fail locally and in CI.
- `make check-frontend` includes audit and lint.
- Type-check, lint, tests, build, and money guard pass.
