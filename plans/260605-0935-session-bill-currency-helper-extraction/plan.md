# Session Bill Currency Helper Extraction

- Status: Complete
- Scope: move bill currency rounding/conversion helpers out of `backend/src/api/sessions/bills.rs`.
- Out of scope: bill handler behavior, SQL, FX resolution, request/response DTOs.

## Tasks

- [x] Scout session bills seams.
- [x] Add `backend/src/api/sessions/bill_currency.rs`.
- [x] Wire `bills.rs` to use extracted helpers.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- Bill create/update conversion behavior unchanged.
- SQLx offline build/test/clippy pass.
- `bills.rs` LOC reduced without handler query changes.
