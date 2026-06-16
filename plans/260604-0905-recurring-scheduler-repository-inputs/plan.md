# Recurring Scheduler Repository Inputs

- Status: Completed
- Scope: remove scheduler dependency on API bill input DTOs while preserving existing API-facing repository signatures.

## TODO

- [x] Add repository-local bill payer/split input structs.
- [x] Adapt API-facing create_bill to map API DTOs at the boundary.
- [x] Switch scheduler to repository-local inputs.
- [x] Run backend and money gates.
- [x] Update living docs.

## Evidence

- `cd backend && cargo fmt -- --check && SQLX_OFFLINE=true cargo build`
- `cd backend && SQLX_OFFLINE=true cargo test`
- `cd backend && SQLX_OFFLINE=true cargo clippy -- -D warnings`
- `make check-money`
