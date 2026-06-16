# Session Bill Event Helper Extraction

- Status: Complete
- Scope: move repeated bill mutation cache invalidation and WebSocket event broadcasts from `backend/src/api/sessions/bills.rs` into `backend/src/api/sessions/bill_events.rs`.
- Acceptance: create/update/delete bill side effects and routes unchanged; backend gates pass.
- Out of scope: bill validation, currency conversion, repository writes, feed activity creation.

## Todo

- [x] Add `bill_events` module.
- [x] Replace repeated cache/WebSocket bill side effects with helpers.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new bill helper boundary/counts.
