# Upload Lifecycle Ownership

- Status: Completed
- Scope: consolidate image upload handling and add owner/admin deletion for app-uploaded avatar, receipt, and bank QR files.

## TODO

- [x] Refactor duplicated upload handlers into shared image save path.
- [x] Add owner/admin delete endpoint with filename/path validation.
- [x] Add focused tests for magic-byte and ownership parsing.
- [x] Run backend gates.
- [x] Update living docs.

## Evidence

- `cd backend && cargo fmt -- --check && SQLX_OFFLINE=true cargo build`
- `cd backend && SQLX_OFFLINE=true cargo test`
- `cd backend && SQLX_OFFLINE=true cargo clippy -- -D warnings`
- `make check-money`
- `make check-foundation`
