# Payments DTO Extraction

- Status: Complete
- Scope: move payment and QR request/response DTOs from `backend/src/api/payments.rs` into `backend/src/api/payments_dto.rs`.
- Acceptance: `/payments`, `/payments/:id`, and `/payments/qr` request/response shapes, `ToSchema` derives, Decimal fields, pagination query params, QR validation behavior, authz, SQL, feed activity, and bank BIN mapping unchanged; backend gates pass.
- Out of scope: payment repository changes, QR handler extraction, OpenAPI registration expansion, payment status lifecycle changes, frontend changes.

## Todo

- [x] Add `payments_dto` module.
- [x] Move payment/QR DTO structs and update handler imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new payments module boundary/counts.
