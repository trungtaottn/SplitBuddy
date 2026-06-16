# Session Bill Request Extraction

- Status: Complete
- Scope: move bill create/update request DTOs from `backend/src/api/sessions/bills.rs` into `backend/src/api/sessions/bill_requests.rs`.
- Acceptance: bill create/update request JSON contracts and validation unchanged; routes unchanged; backend gates pass.
- Out of scope: bill mutation logic, currency conversion semantics, repository queries, response DTOs.

## Todo

- [x] Add `bill_requests` module.
- [x] Move bill request DTOs and update imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new bill module boundary/counts.
