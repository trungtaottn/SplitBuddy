---
phase: 3
title: "Authz Matrix Implementation"
status: completed
priority: P0
effort: "3-4d"
dependencies:
  - 1
  - 2
---

# Phase 3: Authz Matrix Implementation

## Overview

Encode the business authz decisions from the brainstorm into backend helpers and negative tests. Focus on money-affecting session, bill, participant, debt, and recurring mutations.

## Requirements

- Functional: active participants can create bills.
- Functional: only bill creator, session owner, or admin can update/delete a bill while session is active.
- Functional: bill creator cannot update/delete after session is closed.
- Functional: participant management and recurring automation are owner/admin only.
- Functional: group admin has no session authority unless they are also a session participant/owner/admin.
- Functional: guest settlements are performed by owner/admin.
- Functional: owner/admin force-settle creates member notification/audit event if the product path exists.
- Non-functional: helper names should reflect business rules, not generic RBAC overbuild.

## Architecture

```text
auth middleware
  -> authenticated user context
session authz helpers
  -> require_session_participant
  -> require_session_owner_or_admin
  -> require_bill_creator_owner_or_admin
  -> require_bill_mutable_session
  -> require_debt_party_or_owner_admin
handlers
  -> call helper before mutation
tests
  -> 401/403/allowed matrix
```

Prefer local helpers near session handlers unless they are reused by recurring/WS. Shared helpers can live in `backend/src/api/authz.rs` or a session-specific module.

## Related Code Files

- Modify: `backend/src/api/sessions/*.rs`
- Modify: `backend/src/api/recurring_expenses.rs`
- Modify: `backend/src/api/debts.rs`
- Modify: `backend/src/api/bills.rs` if standalone bill endpoints exist.
- Modify: `backend/src/api/groups.rs` only where group role currently leaks into session auth.
- Modify: `backend/src/middleware/auth.rs`
- Modify: `backend/src/repository/session*.rs`
- Create: `backend/src/api/authz.rs` or `backend/src/api/sessions/authz.rs`
- Create/modify: backend integration tests for authz matrix.

## Implementation Steps

1. Tests Before:
   - Write failing negative tests for:
     - non-participant reads/mutates session bill.
     - participant updates another participant's bill.
     - bill creator updates bill after closed session.
     - participant creates recurring.
     - group admin who is not participant mutates session.
     - unauthorized WS subscribe is covered in Phase 4.
2. Add authz helper module:
   - session participant lookup.
   - owner/admin lookup.
   - bill creator lookup.
   - session status check for mutable bill operations.
   - debt party lookup for settlement flows.
3. Apply helpers to bill mutations.
4. Apply helpers to participant management.
5. Apply helpers to recurring CRUD/pause/resume/delete/exception.
6. Apply helpers to debt settlement/request/confirm/force-settle.
7. Wire notifications/audit for force-settle if existing notification/event plumbing supports it; otherwise add a narrowly scoped event record and document the gap.
8. Tests After:
   - Allowed-path tests for participant bill create and creator bill update on active session.
   - Denied-path tests return 403, not 404 camouflage unless existing API policy requires 404.
9. Run:
   - `cd backend && cargo fmt -- --check`
   - `cd backend && SQLX_OFFLINE=true cargo build`
   - `cd backend && cargo test authz`

## Progress Notes

- 2026-06-03: Added `backend/src/api/sessions/authz.rs` with explicit bill mutation and active-participant authz helpers.
- 2026-06-03: Applied authz helpers to session bill create/update/delete. Create now requires an active session participant or admin on an active session. Update/delete now allow bill creator, session owner, or admin only while the session is active.
- 2026-06-03: Added authz matrix tests for active bill creator/session owner/admin allow, participant deny, and closed-session deny.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test`, `make check-money`.
- 2026-06-03: Added owner/admin session management helper and applied it to recurring create/update/delete/pause/resume/skip/add-exception/remove-exception mutations. Recurring reads remain participant-accessible.
- 2026-06-03: Added authz matrix test for session owner/admin allow and participant deny on session management.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test`, `make check-money`.
- 2026-06-03: Applied owner/admin session management helper to participant add/update/delete handlers.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test`, `make check-money`.
- 2026-06-03: Applied owner/admin session management helper to session lifecycle mutations: delete, close, reopen, minimize-debts toggle, archive, restore. Bulk archive now keeps explicit owner/admin authorization filtering.
- 2026-06-03: Applied debt settlement helpers for request, confirm, and guest settlement. Guest settlement is now session owner/admin only and writes an audit event with actor, session, debt, amount, debtor, and creditor metadata.
- 2026-06-03: Applied active participant helper to CSV import because it creates bills; preview/export remain participant-readable.
- 2026-06-03 verification: `cd backend && cargo fmt -- --check`, `cd backend && SQLX_OFFLINE=true cargo build`, `cd backend && SQLX_OFFLINE=true cargo test` (44 passed), `make check-money`.

## Success Criteria

- [x] Every money-affecting mutating endpoint calls an explicit authz helper.
- [x] Tests cover agreed allow/deny matrix.
- [x] Closed-session bill mutation is blocked for bill creator.
- [x] Recurring mutation is owner/admin only.
- [x] Group admin without session participation has no session authority.
- [x] Force-settle path notifies or records actor/action clearly.

## Risk Assessment

The critical flaw is `remove participant đã có bill/debt: remove luôn`. Implement semantic removal/deactivation under the hood unless FK/history analysis proves hard delete is safe.

## Security Considerations

Do not depend on frontend feature flags or UI visibility for admin/session authority. Backend must enforce all rules.
