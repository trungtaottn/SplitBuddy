# Notification DTO Extraction

- Status: Complete
- Scope: move notification request/response/query structs from `backend/src/api/notifications.rs` into `backend/src/api/notifications_dto.rs`.
- Acceptance: notification JSON payloads, SQL row mappings, and routes unchanged; backend gates pass.
- Out of scope: push delivery behavior, notification query semantics, preference defaults, route paths.

## Todo

- [x] Add `notifications_dto` module.
- [x] Move notification DTO/row structs and update imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new notification module boundary.
