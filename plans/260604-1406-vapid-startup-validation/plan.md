# VAPID Startup Validation

## Context
- `docs/system-architecture.md` still lists VAPID startup validation debt.
- `PushService` reads `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` at send time.
- Production can boot with broken push config and fail only after user action.

## Scope
- Move VAPID config into `Config`.
- Fail production startup on missing placeholder invalid VAPID config.
- Keep local development bootable without push keys.
- Make push sends use validated config instead of direct env reads.
- Update docs.

## Out of Scope
- VAPID key generation.
- Frontend push UI redesign.
- Public key delivery endpoint.

## Touchpoints
- `backend/src/config.rs`
- `backend/src/config/push_config.rs`
- `backend/src/api/mod.rs`
- `backend/src/services/push_service.rs`
- `backend/.env.example`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`
- `docs/project-roadmap.md`

## Todo
- [x] Add config model and validation tests.
- [x] Wire push service to config.
- [x] Update docs/env sample.
- [x] Run backend gates.
