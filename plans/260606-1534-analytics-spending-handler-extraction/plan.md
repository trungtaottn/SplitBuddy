# Analytics Spending Handler Extraction

- Status: Complete
- Scope: move spending analytics handler from `backend/src/api/analytics.rs` into a focused sibling module.

## Todo

- [x] Scout analytics route boundaries.
- [x] Keep category/trend DTO/helper modules unchanged.
- [x] Add `analytics_spending` module.
- [x] Add spending amount/session query helpers.
- [x] Register modules in `api/mod.rs`.
- [x] Update `docs/codebase-summary.md` LOC notes.
- [x] Run backend gates.

## Acceptance

- `/api/analytics/spending` route path, auth requirement, query parameters, SQL branches, Decimal math, and response shape remain unchanged.
- `/api/analytics/categories` and `/api/analytics/trends` remain wired to existing modules unchanged.
- `analytics.rs` stays as route wiring and extracted analytics files remain below 200 LOC.
- Backend build, tests, clippy, and repository guard checks pass.

## Unresolved Questions

None.
