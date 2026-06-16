# Auth DTO Extraction

- Status: Complete
- Scope: move auth request/response/public schema types out of `backend/src/api/auth.rs`.
- Out of scope: auth behavior, token lifecycle, SQL, OpenAPI path changes.

## Tasks

- [x] Scout auth module seams.
- [x] Add `backend/src/api/auth_dto.rs`.
- [x] Register module and update auth/openapi imports.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- Auth endpoint payloads and OpenAPI schemas unchanged.
- SQLx offline build/test/clippy pass.
- `auth.rs` LOC reduced without changing handlers.
