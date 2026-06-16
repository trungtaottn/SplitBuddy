# Groups DTO Extraction

- Status: Complete
- Scope: move group request/response/debt DTO structs out of `backend/src/api/groups.rs` into `backend/src/api/groups_dto.rs`.
- Acceptance: route behavior and serialized contracts unchanged; repository imports debt DTOs from DTO module; backend gates pass.
- Out of scope: handler logic changes, query changes, route changes.

## Todo

- [x] Add `groups_dto` module.
- [x] Move DTO definitions and update imports.
- [x] Run format/build/test/clippy and money/foundation checks.
- [x] Update docs with new module boundary/counts.
