# Auth Password Reset Extraction

- Status: Complete
- Scope: move public forgot/reset password handlers from `backend/src/api/auth.rs` into `backend/src/api/auth_password_reset.rs`.
- Acceptance: `/auth/forgot-password` and `/auth/reset-password` behavior, DTOs, audit writes, token invalidation unchanged; backend gates pass.
- Out of scope: email delivery implementation, JWT/refresh-token rotation, admin password reset flow, OpenAPI schema changes.

## Todo

- [x] Add `auth_password_reset` module.
- [x] Move forgot/reset password handlers and update route imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new auth module boundary/counts.
