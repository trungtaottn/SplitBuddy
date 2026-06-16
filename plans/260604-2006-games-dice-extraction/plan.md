# Games Dice Extraction

- Status: Complete
- Scope: move dice response and roll endpoint out of `backend/src/api/games.rs`.
- Out of scope: game rule changes, route changes, schema/query changes.

## Tasks

- [x] Scout games module seams.
- [x] Add `backend/src/api/games_dice.rs`.
- [x] Register module and route through extracted handler.
- [x] Run backend gates.
- [x] Update docs.

## Acceptance

- `/api/games/dice` behavior and payload unchanged.
- SQLx offline build/test/clippy pass.
- `games.rs` LOC reduced without touching repository-backed game flows.
