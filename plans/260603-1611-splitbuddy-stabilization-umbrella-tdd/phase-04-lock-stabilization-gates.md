---
phase: 4
title: "Lock Stabilization Gates"
status: completed
priority: P1
effort: "1d"
dependencies: [3]
---

# Phase 4: Lock Stabilization Gates

## Overview

Make stabilization regressions fail in local and CI gates.

## Requirements

- Functional: money, debt, authz, WS, and build gates run reliably.
- Non-functional: gates must fail on real errors and avoid broad noisy checks that block unrelated historical debt.

## Architecture

Use existing Makefile/CI structure. Prefer focused guardrails such as `make check-money` over repository-wide speculative lint rules unless current code already passes.

## Related Code Files

- Modify: `Makefile`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/codebase-summary.md`
- Modify: `docs/code-standards.md`
- Modify: `docs/project-roadmap.md`
- Read: child plan docs and verification output.

## Implementation Steps

1. Add or confirm focused guardrails for money float regressions and frontend type/build failures.
2. Confirm backend CI runs format, offline build, and tests.
3. Confirm frontend CI runs lint, type-check, and build without allow-fail.
4. Update living docs only for implemented scope.
5. Run final local gates.

## Success Criteria

- [x] `cargo fmt -- --check` passes.
- [x] `SQLX_OFFLINE=true cargo build` passes.
- [x] `cargo test` passes.
- [x] `npm run lint` passes.
- [x] `npm run type-check` passes.
- [x] `npm run build` passes.
- [x] `make check-money` passes.
- [x] Docs list unresolved questions at the end if any.

## Progress Notes

- 2026-06-03: Added independent CI guardrails for money checks, targeted authz/WS tests, and session split file-size guard.
- 2026-06-03: `make check` now runs backend release fmt/clippy/build/tests, frontend audit/lint/type-check/build, money guard, and foundation guard.
- 2026-06-03 verification: `make check` passed.

## Open Questions

None.

## Risk Assessment

Risk: CI changes fail because unrelated dirty work is still in progress.
Mitigation: scope gate edits to stabilization requirements and report unrelated failures separately.
