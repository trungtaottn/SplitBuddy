# Production CORS Hardening

- Status: Completed
- Scope: keep local-dev permissive fallback, but fail production startup when no valid CORS origins are configured.

## TODO

- [x] Reuse production environment detection outside config password validation.
- [x] Change CORS setup to reject empty/invalid production origins.
- [x] Run backend and guardrail gates.
- [x] Update living docs.

## Evidence

- `cd backend && cargo fmt -- --check && SQLX_OFFLINE=true cargo build`
- `cd backend && SQLX_OFFLINE=true cargo test`
- `cd backend && SQLX_OFFLINE=true cargo clippy -- -D warnings`
- `make check-money`
