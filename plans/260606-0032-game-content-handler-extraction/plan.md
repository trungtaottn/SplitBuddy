# Game Content Handler Extraction

- Status: Complete
- Scope: move truth-or-dare, never-have-I-ever, and challenge content handlers from `backend/src/api/games.rs` into `backend/src/api/games_content.rs`.
- Acceptance: `/games/truth-or-dare`, `/games/never-have-i-ever`, and `/games/challenges` route behavior, feature gates, query semantics, adult filtering, SQL queries, not-found errors, and response payloads unchanged; backend gates pass.
- Out of scope: spin wheel handlers, dice handler, repository-backed game handlers, DTO changes, SQL behavior changes, frontend changes.

## Todo

- [x] Add `games_content` module.
- [x] Move content handlers and update route imports.
- [x] Update docs with new games module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
