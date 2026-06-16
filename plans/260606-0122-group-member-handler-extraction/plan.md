# Group Member Handler Extraction

- Status: Complete
- Scope: move group member list/add/remove handlers from `backend/src/api/groups.rs` into `backend/src/api/groups_members.rs`.
- Acceptance: `/groups/:id/members` and `/groups/:id/members/:user_id` route behavior, auth, `groups` feature gate, membership checks, validation messages, repository calls, response envelopes, and DTO payloads unchanged; backend gates pass.
- Out of scope: group create/list/detail/archive/restore handlers, group debt handlers, DTO changes, repository changes, route path changes, frontend changes.

## Todo

- [x] Add `groups_members` module.
- [x] Move member handlers and update route imports.
- [x] Update docs with new group module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
