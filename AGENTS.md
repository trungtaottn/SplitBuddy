# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Rust Axum API (`src/api`, `src/domain`, `src/repository`, `src/middleware`), SQL migrations in `backend/migrations`, SQLx cache in `backend/.sqlx`.
- `frontend/`: React + TypeScript SPA (`src/components`, `src/pages`, `src/contexts`, `src/hooks`, `src/lib`, `src/types`).
- `docs/`: setup/deployment/architecture docs; `.github/workflows` for CI; `.githooks` for pre-commit; `docker-compose.yml` for local Postgres.

## Build, Test, and Development Commands
- `make setup`: install git hooks (auto-format on commit).
- `make install`: install backend/frontend deps.
- `make format`: run `cargo fmt` + ESLint auto-fix.
- `make check`: CI-equivalent checks (lint/build/test).
- `make dev-backend` / `make dev-frontend`: run dev servers.
- `make docker-build`: build Docker image.
- Backend: `cargo run`, `cargo test`, `cargo clippy -- -D warnings`, `SQLX_OFFLINE=true cargo build --release`.
- Frontend: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`, `npm run lint:fix`, `npm run type-check`.

## Coding Style & Naming Conventions
- Rust: follow `rustfmt`; avoid `unwrap()` in production; use `Result<T, AppError>`; document public functions.
- TypeScript/React: functional components + hooks, strict typing, TailwindCSS; avoid inline styles; component files use `PascalCase.tsx`.
- Formatting/linting: `cargo fmt` and ESLint v9 flat config; rely on the pre-commit hook to keep code formatted.

## Testing Guidelines
- Backend uses Rust’s built-in test harness (`cargo test`). Add unit tests alongside modules (e.g., `backend/src/domain`).
- Frontend CI checks are `npm run type-check` and `npm run build`; no dedicated UI test runner is documented.
- No explicit coverage target is defined—focus on critical business logic and regression-prone paths.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits; history uses `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore` (scope optional). Example: `feat(sessions): add participant management`.
- Branching: work from `dev` using `feature/xxx`, `fix/xxx`, `refactor/xxx`, `docs/xxx`; PRs target `dev`.
- PRs: run `make check`, include a clear description, testing notes, and screenshots for UI changes; CI must pass and at least one review is required.

## Configuration & Data
- Backend config lives in `backend/.env` (copy from `.env.example`); do not commit secrets.
- When SQL changes, run `cargo sqlx prepare` and commit updates to `backend/.sqlx`.
