---
phase: 5
title: CI Guardrails And Docs
status: completed
priority: P1
effort: 1-2d
dependencies:
  - 2
  - 3
  - 4
---

# Phase 5: CI Guardrails And Docs

## Context Links

- `Makefile`
- `.github/workflows/ci.yml`
- `frontend/eslint.config.js`
- `frontend/package.json`
- `docs/project-roadmap.md`
- `docs/codebase-summary.md`
- `docs/code-standards.md`
- `docs/system-architecture.md`

## Overview

Make CI fail on the defects this plan fixes and update living docs to match the new P0 baseline.

## Requirements

- Functional: frontend type-check failures fail local and GitHub gates.
- Functional: obvious recurring money float regression fails fast.
- Functional: docs reflect completed P0 changes and remaining P1 boundary.
- Non-functional: guards should be simple grep/lint/build gates, not broad custom framework work.

## Architecture

```text
make check
  -> backend lint/test
  -> frontend type-check hard gate
  -> frontend build
  -> money regression grep

GitHub Actions
  -> same hard gate semantics
```

Keep enforcement minimal and explicit. No repository-wide no-float ban; only money-critical files in P0.

## Related Code Files

- Modify: `Makefile`
- Modify: `.github/workflows/ci.yml`
- Modify: `frontend/eslint.config.js`
- Modify: `docs/project-roadmap.md`
- Modify: `docs/codebase-summary.md`
- Modify: `docs/code-standards.md`
- Modify: `docs/system-architecture.md`

## Implementation Steps

1. Tests Before:
   - Temporarily verify `make check-frontend` currently masks `npm run type-check` failure because of `|| true`.
   - Verify GitHub workflow has the same allow-fail pattern.
2. Local gates:
   - Remove `|| true` from frontend type-check in `Makefile`.
   - Add `make check-money` or inline grep guard for recurring backend money files.
   - Add frontend money path grep guard only after Phase 4 removes current matches.
3. GitHub gates:
   - Remove `|| true` from frontend type-check step.
   - Add equivalent recurring money grep guard.
4. ESLint:
   - Raise `@typescript-eslint/no-explicit-any` to error if current scope is clean enough.
   - If whole repo still has intentional `any`, restrict hard enforcement to touched money paths with grep and file TODOs.
5. Docs:
   - Update roadmap Phase 0 progress.
   - Update codebase summary blockers.
   - Update code standards current violations.
   - Update architecture money/scheduler notes.
6. Final Gates:
   - `make check`
   - `rg "\\bf(32|64)\\b" backend/src/domain/recurring_expense.rs backend/src/api/recurring_expenses.rs backend/src/repository/recurring_expense_repo.rs backend/src/scheduler.rs`
   - `rg "parseFloat|:\\s*any|as any" frontend/src/components/BillInput.tsx frontend/src/pages/SessionDetailPage.tsx frontend/src/lib/api.ts`

## Todo List

- [ ] Makefile frontend type-check is hard fail.
- [ ] GitHub frontend type-check is hard fail.
- [ ] Money float grep guard added for recurring backend files.
- [ ] Frontend money path guard added or scoped lint rule enforced.
- [ ] Living docs updated.
- [ ] Final gates pass.

## Success Criteria

- [ ] `make check` fails on frontend type-check failure.
- [ ] CI workflow fails on frontend type-check failure.
- [ ] Recurring money float regression is blocked by a cheap guard.
- [ ] Docs list P0 as complete only for changes actually implemented.

## Risk Assessment

Repo-wide `no-explicit-any` may be too noisy for P0. Prefer scoped guard over disabling useful CI because unrelated legacy files fail.

## Security Considerations

CI changes must not skip Trivy, backend tests, or deploy protections.

## Next Steps

Open P1 plan for session modularization, full authz pass, and WebSocket hardening after P0 merges.
