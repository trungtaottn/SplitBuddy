---
phase: 5
title: "Foundation CI And Docs"
status: completed
priority: P1
effort: "1-2d"
dependencies:
  - 1
  - 2
  - 3
  - 4
---

# Phase 5: Foundation CI And Docs

## Overview

Lock the P1 foundation changes with cheap guardrails and update living docs to reflect the new session/authz/WS boundaries.

## Requirements

- Functional: CI/local gates catch regressions in money guard, backend compile, frontend lint/type-check, and authz/WS tests.
- Functional: file-size guard reports existing god objects and blocks new/touched growth after modularization.
- Functional: docs describe actual access-control rules and remaining debt.
- Non-functional: guardrails must not fail on unrelated historical files unless touched.

## Architecture

```text
make check
  -> check-money
  -> backend build/tests
  -> frontend lint/type-check/build/tests
  -> session file-size report/guard
  -> authz/WS targeted tests
```

Use simple shell/Makefile checks first. Avoid custom framework work unless needed.

## Related Code Files

- Modify: `Makefile`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/project-roadmap.md`
- Modify: `docs/codebase-summary.md`
- Modify: `docs/code-standards.md`
- Modify: `docs/system-architecture.md`
- Modify: `docs/reviews/260601-splitbuddy-stabilization-brainstorm.md` only if closing open questions with implemented evidence.

## Implementation Steps

1. Tests Before:
   - Verify current gates pass before adding new checks.
   - Capture current largest backend/frontend files for report-only baseline.
2. Local gates:
   - Keep `make check-money`.
   - Add targeted backend authz/WS test command if tests are named/filterable.
   - Add file-size report command.
   - Hard fail only for new/touched files over threshold or known session god files regrowing after split.
3. CI gates:
   - Mirror local backend/frontend/authz/WS gates.
   - Keep frontend audit/lint/type-check/build hard fail.
4. Docs:
   - Update roadmap P1 status.
   - Update codebase summary session repository/API status.
   - Update code standards with authz/WS subscription rules.
   - Update system architecture session/authz/realtime flow.
5. Final Gates:
   - `make check-money`
   - `cd backend && cargo fmt -- --check`
   - `cd backend && SQLX_OFFLINE=true cargo build`
   - `cd backend && cargo test`
   - `cd frontend && npm run lint && npm run type-check && npm test`

## Success Criteria

- [x] Local gates pass.
- [x] CI mirrors local authz/WS/file-size semantics.
- [x] Docs match implemented behavior and do not mark unimplemented work complete.
- [x] Remaining open questions are listed at the end of the relevant report/doc.

## Progress Notes

- 2026-06-03: Added `make check-foundation` and `make file-size-report`; `make check` now includes foundation authz/WS targeted tests and session split file-size guard.
- 2026-06-03: Added CI `guardrails` job so money guardrails, authz/WS targeted tests, and session file-size guard run independently of frontend-only jobs.
- 2026-06-03: Updated roadmap, codebase summary, code standards, and system architecture for the completed session split, authz matrix, WS subscription authz, and guardrails.
- 2026-06-03 verification: `make check` passed.

## Open Questions

None.

## Risk Assessment

Do not add noisy repo-wide file-size hard fails while the tree still contains unrelated historical large files. Hard-fail only new/touched regressions or the session files this plan is explicitly shrinking.

## Security Considerations

CI must preserve existing security checks and not hide test failures behind `|| true`.
