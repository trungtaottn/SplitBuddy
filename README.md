# SplitBuddy

> Chia tiền nhậu dễ dàng, vui vẻ, không còn tranh cãi!

[![Deploy](https://img.shields.io/badge/deploy-Heroku-purple)](https://splitbuddy.herokuapp.com)
[![Frontend](https://img.shields.io/badge/frontend-React%2018-blue)](./frontend)
[![Backend](https://img.shields.io/badge/backend-Rust%20Axum-orange)](./backend)

## Giới thiệu

**SplitBuddy** là ứng dụng web giúp nhóm bạn chia tiền sau mỗi buổi nhậu một cách công bằng và minh bạch. Không còn tình trạng "ai trả bao nhiêu", "ai nợ ai" - SplitBuddy lo hết!

### Tính năng chính

- **Quản lý Session** - Tạo buổi nhậu, thêm người tham gia
- **Chia bill thông minh** - Chia đều, chia theo %, hoặc custom
- **Theo dõi nợ** - Ai nợ ai, bao nhiêu, trạng thái thanh toán
- **Mini Games** - Trò chơi uống bia vui nhộn
- **Nhóm bạn nhậu** - Quản lý nhóm bạn thường xuyên đi nhậu

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Rust, Axum, SQLx |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT + Argon2 |
| **Deploy** | Heroku (Docker) |

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

### 2. Setup Backend

```bash
cd backend
cp .env.example .env

# Start PostgreSQL
docker-compose up -d

# Run migrations
cargo install sqlx-cli --no-default-features --features postgres
sqlx database create
sqlx migrate run

# Start server
cargo run
```

### 3. Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env.local

# Start dev server
npm run dev
```

### 4. Truy cập

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

## Project Structure

```
SplitBuddy/
├── backend/                 # Rust Axum API
│   ├── src/
│   │   ├── api/            # Route handlers
│   │   ├── domain/         # Business logic
│   │   ├── repository/     # Database access
│   │   └── middleware/     # Auth, logging
│   └── migrations/         # SQL migrations
│
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
│   └── public/
│
├── docs/                   # Documentation
│   ├── PROJECT_GUIDELINES.md
│   ├── Architecture Plan.md
│   ├── GAMES_ROADMAP.md
│   └── ...
│
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production
├── Dockerfile              # Backend container
└── heroku.yml              # Heroku deployment
```

## Documentation

| Document | Description |
|----------|-------------|
| [Project Guidelines](./docs/PROJECT_GUIDELINES.md) | Coding conventions & standards |
| [Architecture](./docs/Architecture%20Plan.md) | System architecture |
| [Frontend Guide](./docs/SplitBuddy%20Frontend.md) | Frontend documentation |
| [Backend Guide](./docs/SplitBuddy%20Backend.md) | Backend documentation |
| [UX Flows](./docs/UX_FLOWS.md) | User experience flows |
| [Games Roadmap](./docs/GAMES_ROADMAP.md) | Mini games development plan |
| [Setup Guide](./docs/SETUP.md) | Detailed setup instructions |
| [Deployment](./docs/DEPLOYMENT.md) | Deployment guide |

## Development

### Branch Strategy

```
main        # Production - auto deploy to Heroku
  └── dev   # Development - CI checks
       └── feature/xxx  # Feature branches
```

### Commit Convention

```
type(scope): message

# Types: feat, fix, refactor, docs, style, test, chore
# Example: feat(games): add spin wheel component
```

### Running Tests

```bash
# Backend
cd backend && cargo test

# Frontend
cd frontend && npm test
```

## Contributing

Xem [CONTRIBUTING.md](./CONTRIBUTING.md) để biết cách đóng góp cho dự án.

## License

MIT License - Xem [LICENSE](./LICENSE) để biết thêm chi tiết.

---

Made with beer and code by the SplitBuddy team
