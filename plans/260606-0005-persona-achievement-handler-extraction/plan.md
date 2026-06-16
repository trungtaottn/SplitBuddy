# Persona Achievement Handler Extraction

- Status: Complete
- Scope: move achievement list/check/unlock handlers and XP helpers from `backend/src/api/personas.rs` into `backend/src/api/personas_achievements.rs`.
- Acceptance: `/personas/achievements`, `/personas/achievements/me`, and `/personas/achievements/check` route behavior, SQL queries, unlocked achievement codes, XP updates, feed activity side effect, and response payloads unchanged; backend gates pass.
- Out of scope: persona profile/update handlers, leaderboard handler, DTO changes, achievement rule changes, frontend changes.

## Todo

- [x] Add `personas_achievements` module.
- [x] Move achievement handlers/helpers and update route imports.
- [x] Update docs with new persona module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
