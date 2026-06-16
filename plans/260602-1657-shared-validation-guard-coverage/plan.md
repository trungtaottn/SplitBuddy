# Shared Validation Guard Coverage

## Status

- [x] Verify shared numeric validation is clean.
- [x] Add `useFormValidation.ts` to local money guard.
- [x] Add `useFormValidation.ts` to CI money guard.
- [x] Run affected gates.
- [x] Update docs.

## Scope

- `Makefile`
- `.github/workflows/ci.yml`
- `docs/code-standards.md`
- `docs/project-roadmap.md`

## Acceptance

- `parseFloat`, `any`, and broad records are blocked in shared form validation.
- Local and CI guard paths match.
- Money guard and frontend gates pass.
