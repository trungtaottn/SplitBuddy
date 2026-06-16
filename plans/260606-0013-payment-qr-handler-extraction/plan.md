# Payment QR Handler Extraction

- Status: Complete
- Scope: move VietQR generation handler and bank BIN mapping from `backend/src/api/payments.rs` into `backend/src/api/payments_qr.rs`.
- Acceptance: `/payments/qr` route behavior, OpenAPI annotation, default-bank SQL query, amount validation, URL format, note/account-name encoding, fallback BIN, and response payload unchanged; backend gates pass.
- Out of scope: payment transaction handlers, payment status lifecycle, repository changes, DTO changes, frontend changes.

## Todo

- [x] Add `payments_qr` module.
- [x] Move QR handler and bank BIN helper; update route imports.
- [x] Update docs with new payments module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
