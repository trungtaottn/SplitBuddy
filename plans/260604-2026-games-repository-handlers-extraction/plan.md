# Games Repository Handlers Extraction

- Status: Complete
- Scope: move game history, custom question, drinking stats, and leaderboard handlers out of `backend/src/api/games.rs`.
- Out of scope: game content SQL, spin wheel SQL, dice rules, repository behavior.

## Tasks

- [x] Scout games module seams.
- [x] Add `backend/src/api/games_repository_handlers.rs`.
- [x] Route repository-backed endpoints through extracted handlers.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- Games history/custom/stats/leaderboard endpoint behavior unchanged.
- SQLx offline build/test/clippy pass.
- `games.rs` LOC reduced without touching content/spin/dice flows.
