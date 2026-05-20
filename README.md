# SplitBuddy

> Chia tiền nhậu dễ dàng, vui vẻ, không còn tranh cãi! 🍺

[![CI/CD](https://github.com/trungtaottn/SplitBuddy/workflows/CI/CD/badge.svg)](https://github.com/trungtaottn/SplitBuddy/actions)
[![Deploy](https://img.shields.io/badge/deploy-Heroku-purple)](https://splitbuddy-c4cac22ac498.herokuapp.com)
[![Frontend](https://img.shields.io/badge/frontend-React%2018-blue)](./frontend)
[![Backend](https://img.shields.io/badge/backend-Rust%20Axum-orange)](./backend)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

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
- **Wrapped Stats** - Thống kê hoạt động theo năm (kiểu Spotify Wrapped)
- **AI Chat** - Chat với AI (Google Gemini) để được tư vấn
- **Social Feed** - Dòng thời gian hoạt động của nhóm bạn
- **VietQR Payments** - Thanh toán nhanh qua mã QR ngân hàng Việt Nam
- **Push Notifications** - Nhận thông báo realtime qua trình duyệt (VAPID/Web Push)
- **WebSocket Real-time** - Cập nhật dữ liệu tức thời giữa các thành viên
- **Multi-currency** - Hỗ trợ đa tiền tệ với tỷ giá FX tự động
- **Recurring Expenses** - Chi phí định kỳ tự động tạo bill
- **Templates** - Lưu mẫu bill thường dùng để tạo nhanh
- **Import/Export CSV** - Nhập dữ liệu từ Splitwise, xuất CSV v2
- **Analytics** - Biểu đồ & phân tích chi tiêu chi tiết
- **PWA** - Cài đặt như app native, hỗ trợ offline & pull-to-refresh
- **Dark Mode** - Chế độ tối/sáng/tự động

## Demo

🔗 **Live:** [https://splitbuddy-c4cac22ac498.herokuapp.com](https://splitbuddy-c4cac22ac498.herokuapp.com)

## Tech Stack

| Layer          | Technology                                                          |
| -------------- | ------------------------------------------------------------------- |
| **Frontend**   | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query |
| **Backend**    | Rust (Nightly), Axum 0.7, SQLx                                     |
| **Database**   | PostgreSQL 16                                                       |
| **Cache**      | Redis (HybridCache: Redis + Local)                                  |
| **Auth**       | JWT + Argon2                                                        |
| **Real-time**  | WebSocket (Axum WS + Redis Pub/Sub)                                 |
| **AI**         | Google Gemini API                                                   |
| **Payments**   | VietQR                                                              |
| **Deploy**     | Heroku (Docker multi-stage build)                                   |
| **CI/CD**      | GitHub Actions (path filtering, sccache, mold linker)               |

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

## API Endpoints

| Endpoint                | Description                          |
| ----------------------- | ------------------------------------ |
| `/api/auth`             | Đăng ký, đăng nhập, JWT             |
| `/api/users`            | Quản lý user, profile, avatar       |
| `/api/sessions`         | CRUD buổi nhậu, participants, bills |
| `/api/debts`            | Công nợ, settlement, smart netting  |
| `/api/groups`           | Quản lý nhóm bạn nhậu              |
| `/api/payments`         | VietQR payment transactions         |
| `/api/games`            | Mini games (ToD, NHIE, Kings Cup…)  |
| `/api/ai`               | AI chat (Gemini)                    |
| `/api/analytics`        | Biểu đồ & phân tích chi tiêu       |
| `/api/feed`             | Social feed hoạt động               |
| `/api/notifications`    | Push notifications (VAPID)          |
| `/api/fx`               | Tỷ giá ngoại tệ                    |
| `/api/recurring-expenses` | Chi phí định kỳ                   |
| `/api/templates`        | Mẫu bill                            |
| `/api/categories`       | Danh mục chi tiêu                   |
| `/api/wrapped`          | Wrapped stats theo năm              |
| `/api/uploads`          | Upload file/ảnh                     |
| `/api/personas`         | AI personas                         |
| `/api/admin`            | Admin dashboard                     |
| `/api/ws`               | WebSocket real-time                  |
| `/api/health`           | Health check                         |

## Project Structure

```
SplitBuddy/
├── backend/                 # Rust Axum API
│   ├── src/
│   │   ├── api/            # Route handlers (auth, sessions, debts, games, etc.)
│   │   ├── domain/         # Business logic & models
│   │   ├── repository/     # Database layer (SQLx queries)
│   │   ├── middleware/     # Auth, rate limiting
│   │   ├── services/      # Business services (PushService)
│   │   ├── cache/          # Redis & local caching (HybridCache)
│   │   └── scheduler.rs   # Background job scheduler
│   ├── migrations/         # SQL migrations
│   └── .sqlx/              # SQLx offline query cache
│
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # UI components (shadcn/ui customized)
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth, Theme, Music, Mood, WebSocket)
│   │   ├── hooks/          # Custom hooks (TanStack Query mutations)
│   │   ├── types/          # TypeScript types
│   │   └── lib/            # Utilities (axios, queryClient)
│   └── public/
│       └── sw.js           # Service Worker for Push Notifications
│
├── docs/                   # Documentation
│   ├── DEPLOYMENT.md       # Deployment guide
│   ├── SETUP.md            # Setup guide
│   ├── RELEASE_NOTES.md    # Release notes
│   ├── PROJECT_GUIDELINES.md
│   └── ...
│
├── .github/workflows/      # GitHub Actions CI/CD
│   ├── ci.yml              # Main CI/CD pipeline
│   └── cache-cleanup.yml   # Auto cleanup caches
│
├── .githooks/              # Git hooks
│   ├── pre-commit          # Auto-format code before commit
│   └── setup.sh            # Setup script
│
├── Dockerfile              # Multi-stage Docker build (5 stages)
├── docker-compose.yml      # Local development (PostgreSQL + Redis)
├── docker-compose.prod.yml # Production Docker config
├── Makefile                # Development commands
└── heroku.yml              # Heroku deployment config
```

## Documentation

| Document                                           | Description                                 |
| -------------------------------------------------- | ------------------------------------------- |
| [Backend README](./backend/README.md)              | Backend API documentation, endpoints, setup |
| [Frontend README](./frontend/README.md)            | Frontend documentation, components, routes  |
| [Contributing](./CONTRIBUTING.md)                  | How to contribute to this project           |
| [Deployment](./docs/DEPLOYMENT.md)                 | Deployment & CI/CD guide                    |
| [Setup](./docs/SETUP.md)                           | Detailed setup guide                        |
| [Release Notes](./docs/RELEASE_NOTES.md)           | Version history & changelog                 |
| [Project Guidelines](./docs/PROJECT_GUIDELINES.md) | Coding conventions & standards              |
| [Architecture](./docs/Architecture%20Plan.md)      | System architecture overview                |

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

- `lint-backend` - Chỉ chạy khi thay đổi `backend/**` (fmt + clippy)
- `test-backend` - Chỉ chạy khi thay đổi `backend/**` (build + nextest)
- `test-frontend` - Chỉ chạy khi thay đổi `frontend/**` (type-check + build)
- `deploy` - Chỉ chạy trên `main` branch (Docker build + Heroku)
- `security-scan` - Trivy vulnerability scan trên `main`

**Optimizations:**

- sccache - Compiler caching (40-60% faster)
- mold linker - Faster linking (30-50% faster)
- cargo nextest - Parallel test runner (2-3x faster)
- Path filtering - Skip irrelevant jobs
- Auto-cancel in-progress runs on new commits
- Cache cleanup every 3 days
- Auto-sync `revert` branch after successful deploy
- Health check verification after deploy

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

# Redis (optional - for WebSocket scaling & caching)
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
# Hoặc dùng nextest (nhanh hơn)
cd backend && cargo nextest run

# Frontend type check
cd frontend && npm run type-check

# Frontend build
cd frontend && npm run build

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

**Last Updated:** May 2026
