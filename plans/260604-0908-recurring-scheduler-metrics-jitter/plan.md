# Recurring Scheduler Metrics Jitter

- Status: Completed
- Scope: add bounded scheduler tick jitter and Prometheus metrics without changing scheduler env/config contracts.

## TODO

- [x] Add jittered sleep helper with deterministic bounds tests.
- [x] Instrument due scans, processed/skipped/failed executions, and run duration.
- [x] Run backend and money gates.
- [x] Update living docs.

## Evidence

- `cd backend && cargo fmt -- --check && SQLX_OFFLINE=true cargo build`
- `cd backend && SQLX_OFFLINE=true cargo test`
- `cd backend && SQLX_OFFLINE=true cargo clippy -- -D warnings`
- `make check-money`
