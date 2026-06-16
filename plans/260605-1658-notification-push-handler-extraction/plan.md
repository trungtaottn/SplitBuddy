# Notification Push Handler Extraction

- Status: Complete
- Scope: move push subscribe/unsubscribe/test handlers from `backend/src/api/notifications.rs` into `backend/src/api/notifications_push.rs`.
- Acceptance: `/notifications/push/subscribe`, `/notifications/push/unsubscribe`, and `/notifications/push/test` route behavior, feature-flag guard, SQL writes, preference bootstrap, push-service call, and response payloads unchanged; backend gates pass.
- Out of scope: notification list/read/preference handlers, push delivery internals, DTO changes, frontend changes.

## Todo

- [x] Add `notifications_push` module.
- [x] Move push handlers and update route imports.
- [x] Update docs with new notification module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
