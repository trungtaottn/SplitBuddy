# SplitBuddy

> Chia tiền nhậu dễ dàng, vui vẻ, không còn tranh cãi! 🍺

[![CI/CD](https://github.com/trungtaottn/SplitBuddy/workflows/CI/CD/badge.svg)](https://github.com/trungtaottn/SplitBuddy/actions)
[![Deploy](https://img.shields.io/badge/deploy-Heroku-purple)](https://splitbuddy-c4cac22ac498.herokuapp.com)
[![Frontend](https://img.shields.io/badge/frontend-React%2018-blue)](./frontend)
[![Backend](https://img.shields.io/badge/backend-Rust%20Axum-orange)](./backend)

## Giới thiệu

**SplitBuddy** là ứng dụng web giúp nhóm bạn chia tiền sau mỗi buổi nhậu một cách công bằng và minh bạch. Không còn tình trạng "ai trả bao nhiêu", "ai nợ ai" - SplitBuddy lo hết!

### Tính năng chính

- **Quản lý Session** - Tạo buổi nhậu, thêm người tham gia (user hoặc guest)
- **Chia bill thông minh** - Chia đều, chia theo %, hoặc custom amount
- **Theo dõi nợ** - Ai nợ ai, bao nhiêu, trạng thái thanh toán
- **Cấn trừ nợ tự động** - Smart netting giảm số giao dịch cần thiết
- **Nhóm bạn nhậu** - Quản lý nhóm bạn thường xuyên đi nhậu
- **Mini Games** - Truth or Dare, Never Have I Ever, Challenges, Spin Wheel, Kings Cup
- **Music Player** - Phát nhạc trong khi nhậu với playlist từ YouTube
- **Avatar & Achievements** - Gamification với XP, levels, badges
- **Wrapped Stats** - Thống kê hoạt động theo năm
- **AI Chat** - Chat với AI để được tư vấn

## Tech Stack

| Layer        | Technology                                                         |
| ------------ | ------------------------------------------------------------------ |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query |
| **Backend**  | Rust (Nightly), Axum 0.7, SQLx                                     |
| **Database** | PostgreSQL 16                                                      |
| **Auth**     | JWT + Argon2                                                       |
| **AI**       | Google Gemini API                                                  |
| **Deploy**   | Heroku (Docker)                                                    |
| **CI/CD**    | GitHub Actions (optimized with path filtering & caching)           |

## Quick Start

### Prerequisites

- Node.js 20+
- Rust (stable for development, nightly for Docker build)
- Docker & Docker Compose
- PostgreSQL (hoặc dùng Docker)

### 1. Clone repo

```bash
git clone https://github.com/trungtaottn/SplitBuddy.git
cd SplitBuddy
```

### 2. Setup Git Hooks (Quan trọng!)

```bash
# Cài đặt git hooks để auto-format code trước khi commit
make setup
```

### 3. Setup Database & Redis

```bash
# Start PostgreSQL + Redis với Docker
docker-compose up -d

# Verify services are running
docker ps
# Should show: splitbuddy-db (postgres) and splitbuddy-redis (redis)
```

### 4. Setup Backend

```bash
cd backend
cp .env.example .env

# Cài SQLx CLI
cargo install sqlx-cli --no-default-features --features postgres

# Chạy migrations
sqlx database create
sqlx migrate run

# Start server
cargo run
```

Backend sẽ chạy tại `http://localhost:8080`

### 5. Setup Frontend

```bash
cd frontend
npm install

# Start dev server
npm run dev
```

Frontend sẽ chạy tại `http://localhost:5173`

### 6. Truy cập

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080/api
- **Health Check:** http://localhost:8080/api/health

## Makefile Commands

```bash
make setup          # Cài đặt git hooks
make install        # Cài đặt dependencies
make format         # Format tất cả code (Rust + TypeScript)
make check          # Check tất cả giống CI (lint, build, test)
make check-backend  # Check backend only
make check-frontend # Check frontend only
make dev-backend    # Chạy backend dev server
make dev-frontend   # Chạy frontend dev server
make docker-build   # Build Docker image
make clean          # Dọn dẹp build artifacts
```

## Project Structure

```
SplitBuddy/
├── backend/                 # Rust Axum API
│   ├── src/
│   │   ├── api/            # Route handlers (auth, sessions, debts, games, etc.)
│   │   ├── domain/         # Business logic & models
│   │   ├── repository/     # Database layer (SQLx queries)
│   │   └── middleware/     # Auth middleware
│   ├── migrations/         # SQL migrations
│   └── .sqlx/              # SQLx offline query cache
│
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # UI components (shadcn/ui customized)
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth, Theme, Music, Mood)
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # TypeScript types
│   │   └── lib/            # Utilities (axios, queryClient)
│   └── public/
│
├── docs/                   # Documentation
│   ├── DEPLOYMENT.md       # Deployment guide
│   ├── SETUP.md            # Setup guide
│   ├── PROJECT_GUIDELINES.md
│   └── ...
│
├── .github/workflows/      # GitHub Actions CI/CD
│   └── ci.yml              # Optimized CI/CD pipeline
│
├── .githooks/              # Git hooks
│   ├── pre-commit          # Auto-format code before commit
│   └── setup.sh            # Setup script
│
├── Dockerfile              # Multi-stage Docker build (5 stages)
├── docker-compose.yml      # Local development (PostgreSQL)
├── Makefile                # Development commands
└── heroku.yml              # Heroku deployment config
```

## Documentation

**Xem [docs/README.md](./docs/README.md) — Documentation Hub (Living Index)** để navigation đầy đủ + phân biệt Living vs Historical documents.

### Living Documents (Single Source of Truth – cập nhật 2026-06-01)
- [Project Overview & PDR](./docs/project-overview-pdr.md) — Product scope, requirements, risks, acceptance criteria.
- [Codebase Summary](./docs/codebase-summary.md) — Tổng quan hiện trạng, feature status, P0 debt.
- [Code Standards](./docs/code-standards.md) — Standards thực tế + current violations.
- [System Architecture](./docs/system-architecture.md) — Layers thực tế, flows quan trọng, tradeoffs.
- [Project Roadmap](./docs/project-roadmap.md) — Phased P0 (money + any + unwraps) trước khi scale feature.
- [Deep Codebase Review 2026](./docs/reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md) — Audit triệt để toàn bộ (god objects, 33 migrations, frontend any/decimal, security... với exact file:line).
- [Project Guidelines](./docs/guidelines/PROJECT_GUIDELINES.md) — Bắt buộc: Decimal money, no unwrap/any, DDD, DoD, conventional commits.
- Deployment & Setup: [DEPLOYMENT.md](./docs/deployment/DEPLOYMENT.md) | [SETUP.md](./docs/deployment/SETUP.md)
- Backend / Frontend overviews: [SplitBuddy Backend.md](./docs/summaries/SplitBuddy Backend.md) | [SplitBuddy Frontend.md](./docs/summaries/SplitBuddy Frontend.md)

### Historical Plans (đã archive)
Tất cả SPRINT/EXECUTION/UI_TRANS/GAMES_ROADMAP/UX_FLOWS/Roadmap cũ (2024–early 2025) nằm tại `docs/archive/2024-2025-plans/`. Chỉ tham khảo lịch sử, không dùng làm basis cho phát triển mới (đã drift nặng so với codebase hiện tại).

**Chuẩn bị trước /brainstorm:** Luôn đọc living docs + deep review trước để "hiểu đúng và đủ", tránh debt mới.

## Development Workflow

### Branch Strategy

```
main          # Production - auto deploy to Heroku
  └── revert  # Last known good state (auto-synced)
  └── dev     # Development - CI checks, PR target
       └── feature/xxx  # Feature branches
```

**Branches:**

- `main` - Production code, auto-deploy khi merge
- `revert` - Giữ last known good state, tự động sync với main khi deploy thành công
- `dev` - Development branch, tạo PR từ đây vào main

**Quy tắc:**

- KHÔNG merge trực tiếp dev → main bằng `git merge`
- Luôn tạo **Pull Request** từ dev → main
- Đợi CI pass trước khi merge
- Heroku auto-deploy từ main
- Nếu deploy fail, dùng `revert` branch để rollback

### Commit Convention

```
type(scope): message

# Types: feat, fix, refactor, docs, style, test, chore
# Examples:
#   feat(sessions): add participant management
#   fix(debts): correct netting calculation
#   docs(readme): update API endpoints
```

### CI/CD Pipeline

GitHub Actions tự động chạy khi push:

**Path-based job execution:**

- `test-backend` - Chỉ chạy khi thay đổi `backend/**`
- `test-frontend` - Chỉ chạy khi thay đổi `frontend/**`
- `deploy` - Chỉ chạy trên `main` branch

**Features:**

- ✅ Auto-cancel in-progress runs on new commits
- ✅ Intelligent caching (Rust dependencies, npm)
- ✅ Path filtering (skip irrelevant jobs)
- ✅ Security scanning with Trivy
- ✅ Auto-sync `revert` branch
- ✅ Health check verification after deploy

### Git Hooks

Pre-commit hook tự động:

- Format Rust code (`cargo fmt`)
- Fix ESLint issues (`eslint --fix`)
- Check clippy warnings
- Verify build

```bash
# Setup (chỉ cần chạy 1 lần)
make setup
```

### SQLx Offline Mode

Khi thêm/sửa SQL query, cần update cache:

```bash
cd backend
cargo sqlx prepare
git add .sqlx/
git commit -m "chore: update sqlx cache"
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/splitbuddy

# Redis (optional - for WebSocket scaling)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION_HOURS=24

# Server
HOST=0.0.0.0
PORT=8080
RUST_LOG=debug

# Push Notifications (generate at https://vapidkeys.com)
VAPID_PRIVATE_KEY=your-base64-private-key
VAPID_SUBJECT=mailto:admin@splitbuddy.com

# AI Features
GEMINI_API_KEY=your-api-key  # Optional
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8080
VITE_VAPID_PUBLIC_KEY=your-base64-public-key  # For push notifications
```

## Deployment

### Heroku (Production)

**Required Addons:**

```bash
# Add Heroku Postgres (if not already added)
heroku addons:create heroku-postgresql:essential-0 -a splitbuddy

# Add Heroku Redis (for WebSocket Pub/Sub and caching)
heroku addons:create heroku-redis:mini -a splitbuddy

# Set environment variables
heroku config:set VAPID_PRIVATE_KEY=your-key -a splitbuddy
heroku config:set VAPID_SUBJECT=mailto:admin@splitbuddy.com -a splitbuddy
```

**Deployment Flow:**

1. Push to `main` branch
2. CI runs tests (path-filtered, parallel jobs)
3. Docker image built with 5-stage build (cargo-chef + BuildKit)
4. Image pushed to Heroku Container Registry
5. Health check verification
6. `revert` branch synced

### Rollback

```bash
# Nếu cần rollback về version trước
git checkout main
git reset --hard origin/revert
git push origin main --force
```

### Manual Deploy (Emergency)

```bash
# Chỉ khi có bug critical
heroku container:push web -a splitbuddy
heroku container:release web -a splitbuddy
```

## Testing

```bash
# Check tất cả (giống CI)
make check

# Backend tests
cd backend && cargo test

# Frontend type check
cd frontend && npm run type-check

# Frontend lint
cd frontend && npm run lint:fix
```

## Contributing

1. Fork repo
2. Clone và `make setup` để cài git hooks
3. Tạo branch từ `dev`: `git checkout -b feature/your-feature`
4. Commit changes (auto-formatted bởi pre-commit hook)
5. Push và tạo PR về `dev`
6. Đợi review và CI pass

Xem [CONTRIBUTING.md](./CONTRIBUTING.md) để biết thêm chi tiết.

## License

MIT License - Xem [LICENSE](./LICENSE) để biết thêm chi tiết.

---

Made with 🍺 and code by the SplitBuddy team

**Last Updated:** January 2026
