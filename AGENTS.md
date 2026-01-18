# Repository Guidelines

## Project Structure & Module Organization

- `backend/`: Rust Axum API
  - `src/api/` - Route handlers (auth, sessions, debts, games, payments, notifications, ws)
  - `src/domain/` - Business logic & models
  - `src/repository/` - Database layer (SQLx queries)
  - `src/middleware/` - Auth, rate limiting
  - `src/services/` - Business services (PushService)
  - `src/cache/` - Redis & local caching (HybridCache)
  - `src/scheduler.rs` - Background job scheduler
  - `migrations/` - SQL migrations
  - `.sqlx/` - SQLx offline query cache
- `frontend/`: React + TypeScript SPA
  - `src/components/` - UI components (shadcn/ui customized)
  - `src/pages/` - Page components
  - `src/contexts/` - React contexts (Auth, Theme, Music, Mood)
  - `src/hooks/` - Custom hooks (TanStack Query mutations)
  - `src/lib/` - Utilities (axios, queryClient)
  - `src/types/` - TypeScript types
  - `public/sw.js` - Service Worker for Push Notifications
- `docs/`: Setup, deployment, architecture docs
- `.github/workflows/`: CI/CD pipelines
  - `ci.yml` - Main CI/CD (lint, build, test, deploy)
  - `cache-cleanup.yml` - Auto cleanup caches every 3 days
- `.githooks/`: Pre-commit hooks (auto-format)

## Build, Test, and Development Commands

```bash
# Setup
make setup          # Install git hooks (auto-format on commit)
make install        # Install all dependencies

# Development
make dev-backend    # Run backend dev server (cargo run)
make dev-frontend   # Run frontend dev server (npm run dev)

# Linting & Format
make format         # Run cargo fmt + ESLint auto-fix
make check          # CI-equivalent checks (lint/build/test)
make check-backend  # Backend only
make check-frontend # Frontend only

# Docker
docker-compose up -d                  # Start PostgreSQL + Redis
make docker-build                      # Build Docker image
```

### Backend Commands

```bash
cargo run                              # Dev server (port 8080)
cargo test                             # Run tests
cargo nextest run                      # Faster parallel tests
cargo clippy -- -D warnings            # Lint
SQLX_OFFLINE=true cargo build --release  # Production build
cargo sqlx prepare                     # Update SQLx cache after SQL changes
```

### Frontend Commands

```bash
npm run dev         # Dev server (port 5173)
npm run build       # Production build
npm run type-check  # TypeScript check
npm run lint:fix    # ESLint auto-fix
```

## Coding Style & Naming Conventions

### Rust

- Follow `rustfmt` formatting
- Avoid `unwrap()` in production; use `Result<T, AppError>`
- Use `anyhow::anyhow!()` for internal errors
- Document public functions with `///`
- Use `#[allow(dead_code)]` sparingly for intentionally unused code

### TypeScript/React

- Functional components + hooks only
- Strict typing (no `any`)
- TailwindCSS for styling (no inline styles)
- Component files use `PascalCase.tsx`
- Use TanStack Query for server state
- Invalidate queries in `onSuccess` callbacks for cache freshness

## Testing Guidelines

- **Backend**: `cargo test` or `cargo nextest run --release`
- **Frontend**: `npm run type-check` + `npm run build`
- Focus on critical business logic and regression-prone paths
- No explicit coverage target defined

## Commit & Pull Request Guidelines

### Commit Messages

```
type(scope): message

# Types: feat, fix, refactor, docs, style, test, chore
# Examples:
#   feat(sessions): add participant management
#   fix(debts): correct netting calculation
#   docs(readme): update API endpoints
```

### Branching

- Work from `dev` using `feature/xxx`, `fix/xxx`, `refactor/xxx`
- PRs target `dev` first, then `dev` → `main` for release
- `main` auto-deploys to Heroku
- `revert` branch holds last known good state

### PR Requirements

- Run `make check` before pushing
- Include clear description and testing notes
- Screenshots for UI changes
- CI must pass, at least one review required

## CI/CD Pipeline

### Jobs (run in parallel where possible)

| Job             | Trigger                            | Description                               |
| --------------- | ---------------------------------- | ----------------------------------------- |
| `changes`       | Always                             | Detect file changes (paths-filter)        |
| `lint-backend`  | `backend/**` changes               | fmt + clippy (parallel with test-backend) |
| `test-backend`  | `backend/**` changes               | build + nextest                           |
| `test-frontend` | `frontend/src/**`, `package*.json` | type-check + build                        |
| `deploy`        | `main` push only                   | Docker build + Heroku deploy              |
| `security-scan` | `main` push only                   | Trivy vulnerability scan                  |

### Optimizations

- **sccache**: Compiler caching (40-60% faster)
- **mold linker**: Faster linking (30-50% faster)
- **cargo nextest**: Parallel test runner (2-3x faster)
- **Path filtering**: Skip irrelevant jobs
- **Cache cleanup**: Auto cleanup every 3 days

## Configuration & Data

### Backend (.env)

```env
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/splitbuddy

# Redis (optional, for WebSocket scaling)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION_HOURS=24

# Push Notifications (VAPID keys)
VAPID_PRIVATE_KEY=base64-encoded-private-key
VAPID_SUBJECT=mailto:admin@splitbuddy.com

# Server
HOST=0.0.0.0
PORT=8080
RUST_LOG=debug
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8080
VITE_VAPID_PUBLIC_KEY=base64-encoded-public-key
```

### SQLx Offline Mode

When SQL changes, update cache:

```bash
cd backend
cargo sqlx prepare
git add .sqlx/
git commit -m "chore: update sqlx cache"
```

## Infrastructure

### Local Development

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Check services
docker ps
```

### Production (Heroku)

- **Postgres**: Heroku Postgres addon
- **Redis**: Heroku Redis addon (for WebSocket Pub/Sub)
- **Deploy**: Auto via GitHub Actions on `main` push

## Key Features

| Feature             | Backend                         | Frontend                           |
| ------------------- | ------------------------------- | ---------------------------------- |
| WebSocket Real-time | `src/api/ws.rs`                 | TanStack Query + WebSocket context |
| Push Notifications  | `src/services/push_service.rs`  | `public/sw.js` + VAPID             |
| VietQR Payments     | `src/api/payments.rs`           | QR code display                    |
| Gamification        | `src/api/games.rs`              | Games page with mini-games         |
| Analytics           | `src/api/analytics.rs`          | Charts & spending breakdown        |
| Recurring Expenses  | `src/api/recurring_expenses.rs` | Scheduler-based triggers           |
