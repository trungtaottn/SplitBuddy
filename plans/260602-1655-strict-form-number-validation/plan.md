# Strict Form Number Validation

## Status

- [x] Verify numeric validators.
- [x] Replace permissive `parseFloat` behavior.
- [x] Add tests for strict numeric strings.
- [x] Run frontend and money gates.
- [x] Update docs.

## Scope

- `frontend/src/hooks/useFormValidation.ts`
- `frontend/src/hooks/useFormValidation.test.ts`
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md`

## Acceptance

- Numeric validators reject partial strings like `12abc`.
- Numeric validators still accept trimmed numeric strings and finite numbers.
- Type-check, audit, lint, tests, build, and money guard pass.
