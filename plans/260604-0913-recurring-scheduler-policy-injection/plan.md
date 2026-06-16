# Recurring Scheduler Policy Injection

- Status: Completed
- Scope: move scheduler timing/rate-source policy out of hardcoded scheduler constants while preserving default behavior.

## TODO

- [x] Add config-backed scheduler jitter percent and rate source.
- [x] Wire scheduler through an explicit policy struct.
- [x] Update scheduler tests for injected policy.
- [x] Run backend and money gates.
- [x] Update living docs.

## Evidence

- `cd backend && cargo fmt -- --check && SQLX_OFFLINE=true cargo build`
- `cd backend && SQLX_OFFLINE=true cargo test`
- `cd backend && SQLX_OFFLINE=true cargo clippy -- -D warnings`
- `make check-money`
