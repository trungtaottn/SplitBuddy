# Session Import Export Helper Extraction

## Context
- `backend/src/api/sessions/import_export_handlers.rs` is the largest backend API file.
- CSV response helpers and parser logic are independent from route orchestration.

## Scope
- Extract CSV HTTP response and escaping helpers into a sibling module.
- Extract CSV parser types/helpers into format-specific sibling modules.
- Keep route signatures and API payloads unchanged.
- Verify import preview response shape remains unchanged.
- Update living docs.

## Out of Scope
- Full CSV parser rewrite.
- Import format changes.
- Frontend import/export UI changes.

## Touchpoints
- `backend/src/api/sessions/import_export_handlers.rs`
- `backend/src/api/sessions/import_export_csv.rs`
- `backend/src/api/sessions/import_export_parser/*`
- `backend/src/api/sessions/mod.rs`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`

## Todo
- [x] Extract helpers.
- [x] Extract parser.
- [x] Split parser by format.
- [x] Verify preview response shape.
- [x] Move helper tests.
- [x] Run backend gates.
