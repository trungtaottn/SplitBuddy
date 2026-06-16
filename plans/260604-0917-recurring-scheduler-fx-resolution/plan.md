# Recurring Scheduler FX Resolution

- Status: Completed
- Scope: remove hardcoded scheduler exchange-rate behavior by reusing existing FX resolution and preserving original recurring amount/currency on generated bills.

## TODO

- [x] Inject HTTP client into scheduler.
- [x] Resolve recurring expense currency to session base currency before bill creation.
- [x] Preserve original amount/currency and converted base amount semantics.
- [x] Add focused conversion tests.
- [x] Run backend and money gates.
- [x] Update living docs.

## Evidence

- `cd backend && cargo fmt -- --check && SQLX_OFFLINE=true cargo build`
- `cd backend && SQLX_OFFLINE=true cargo test`
- `cd backend && SQLX_OFFLINE=true cargo clippy -- -D warnings`
- `make check-money`
