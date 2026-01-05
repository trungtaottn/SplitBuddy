# SplitBuddy

> Chia tiền nhậu dễ dàng, vui vẻ, không còn tranh cãi! 🍺

[![CI](https://github.com/trungtaottn/SplitBuddy/workflows/CI/badge.svg)](https://github.com/trungtaottn/SplitBuddy/actions)
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
- **Mini Games** - Truth or Dare, Never Have I Ever, Challenges, Spin Wheel
- **Avatar & Achievements** - Gamification với XP, levels, badges
- **Wrapped Stats** - Thống kê hoạt động theo năm

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query |
| **Backend** | Rust 1.75+, Axum 0.7, SQLx |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT + Argon2 |
| **AI** | Google Gemini API |
| **Deploy** | Heroku (Docker) |
| **CI/CD** | GitHub Actions |

## Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.75+
- Docker & Docker Compose
- PostgreSQL (hoặc dùng Docker)

### 1. Clone repo

```bash
git clone https://github.com/trungtaottn/SplitBuddy.git
cd SplitBuddy
```

### 2. Setup Database

```bash
# Start PostgreSQL với Docker
docker-compose up -d
```

### 3. Setup Backend

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

### 4. Setup Frontend

```bash
cd frontend
npm install

# Start dev server
npm run dev
```

Frontend sẽ chạy tại `http://localhost:5173`

### 5. Truy cập

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080/api

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
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── types/          # TypeScript types
│   │   └── lib/            # Utilities (axios, cn)
│   └── public/
│
├── docs/                   # Documentation
│   ├── PROJECT_GUIDELINES.md
│   ├── Architecture Plan.md
│   └── ...
│
├── .github/workflows/      # GitHub Actions CI
│   └── ci.yml
│
├── docker-compose.yml      # Local development (PostgreSQL)
├── Dockerfile              # Backend container
└── heroku.yml              # Heroku deployment config
```

## Documentation

| Document | Description |
|----------|-------------|
| [Backend README](./backend/README.md) | Backend API documentation, endpoints, setup |
| [Frontend README](./frontend/README.md) | Frontend documentation, components, routes |
| [Project Guidelines](./docs/PROJECT_GUIDELINES.md) | Coding conventions & standards |
| [Architecture](./docs/Architecture%20Plan.md) | System architecture overview |

## Development Workflow

### Branch Strategy

```
main          # Production - auto deploy to Heroku
  └── dev     # Development - CI checks, PR target
       └── feature/xxx  # Feature branches
```

**Quy tắc:**
- KHÔNG merge trực tiếp dev → main bằng `git merge`
- Luôn tạo **Pull Request** từ dev → main
- Đợi CI pass trước khi merge
- Heroku auto-deploy từ main

### Commit Convention

```
type(scope): message

# Types: feat, fix, refactor, docs, style, test, chore
# Examples:
#   feat(sessions): add participant management
#   fix(debts): correct netting calculation
#   docs(readme): update API endpoints
```

### CI Pipeline

GitHub Actions tự động chạy khi push:

**Backend:**
- `cargo build --release` (với SQLX_OFFLINE=true)
- `cargo test --release`

**Frontend:**
- `npm ci`
- `npm run build`

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
DATABASE_URL=postgres://user:pass@localhost:5432/splitbuddy
JWT_SECRET=your-secret-key
JWT_EXPIRATION_HOURS=24
HOST=0.0.0.0
PORT=8080
RUST_LOG=debug
GEMINI_API_KEY=your-api-key  # Optional, for AI features
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8080  # Optional, defaults to /api
```

## Deployment

### Heroku (Production)

1. Push to `main` branch
2. Heroku auto-builds Docker image
3. Runs migrations on release
4. Deploys new version

### Manual Deploy (Emergency)

```bash
# Chỉ khi có bug critical
heroku container:push web -a splitbuddy
heroku container:release web -a splitbuddy
```

## Testing

```bash
# Backend tests
cd backend && cargo test

# Frontend type check
cd frontend && npm run type-check

# Frontend lint
cd frontend && npm run lint
```

## Contributing

1. Fork repo
2. Tạo branch từ `dev`: `git checkout -b feature/your-feature`
3. Commit changes với conventional commits
4. Push và tạo PR về `dev`
5. Đợi review và CI pass

## License

MIT License - Xem [LICENSE](./LICENSE) để biết thêm chi tiết.

---

Made with 🍺 and code by the SplitBuddy team
