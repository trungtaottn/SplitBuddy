# Session Status Handler Extraction

- Status: Complete
- Scope: move session close/reopen/minimize-debts handlers from `backend/src/api/sessions/session_handlers.rs` into `backend/src/api/sessions/session_status_handlers.rs`.
- Acceptance: `/sessions/:id/close`, `/sessions/:id/reopen`, and `/sessions/:id/minimize-debts` route behavior, feature-flag guard, owner/admin authz, cache invalidation, WebSocket events, and response shape unchanged; backend gates pass.
- Out of scope: archive/restore/bulk archive handlers, repository changes, DTO changes, frontend changes.

## Todo

- [x] Add `session_status_handlers` module.
- [x] Move close/reopen/minimize handlers and update route imports.
- [x] Update docs with new session module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
