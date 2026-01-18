# Setup Guide

Hướng dẫn chi tiết để setup môi trường development cho SplitBuddy.

**Last Updated:** January 2026

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| Rust | Stable | [rustup.rs](https://rustup.rs/) |
| Docker | Latest | [docker.com](https://docker.com/) |
| PostgreSQL | 16 | Via Docker hoặc native |
| Make | Latest | Có sẵn trên macOS/Linux |

### Recommended Tools

- VS Code với extensions:
  - rust-analyzer
  - ESLint
  - Tailwind CSS IntelliSense
  - Prettier
- TablePlus hoặc DBeaver (database GUI)
- Postman hoặc Insomnia (API testing)

## Step-by-Step Setup

### 1. Clone Repository

```bash
git clone https://github.com/trungtaottn/SplitBuddy.git
cd SplitBuddy
```

### 2. Setup Git Hooks (Quan trọng!)

```bash
# Cài đặt git hooks để auto-format code
make setup
```

Điều này sẽ:
- Cài đặt pre-commit hook
- Auto-format Rust code với `cargo fmt`
- Auto-fix ESLint issues
- Check clippy warnings và build errors

### 3. Start PostgreSQL

```bash
# Option 1: Docker (recommended)
docker-compose up -d

# Option 2: Native PostgreSQL
# Ensure PostgreSQL is running on port 5432
# Create database: splitbuddy
```

Verify database is running:

```bash
docker ps
# Should show postgres container running
```

### 4. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/splitbuddy
# JWT_SECRET=your-secret-key
# RUST_LOG=debug

# Install SQLx CLI
cargo install sqlx-cli --no-default-features --features postgres

# Create database and run migrations
sqlx database create
sqlx migrate run

# Verify migrations
sqlx migrate info

# Start backend server
cargo run
```

Backend will be available at `http://localhost:8080`

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file (optional)
# cp .env.example .env.local

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Makefile Commands

Dự án sử dụng Makefile để đơn giản hóa các lệnh thường dùng:

```bash
make setup          # Cài đặt git hooks
make install        # Cài đặt tất cả dependencies
make format         # Format tất cả code (Rust + TypeScript)
make check          # Check tất cả giống CI (lint, build, test)
make check-backend  # Check backend only
make check-frontend # Check frontend only
make dev-backend    # Chạy backend dev server
make dev-frontend   # Chạy frontend dev server
make docker-build   # Build Docker image
make clean          # Dọn dẹp build artifacts
make help           # Hiển thị tất cả commands
```

### Workflow thường dùng

```bash
# Bắt đầu ngày làm việc
git pull origin dev
make check  # Đảm bảo mọi thứ hoạt động

# Trong khi code
# Git hooks sẽ tự động format khi commit

# Trước khi push
make check  # Kiểm tra giống CI

# Nếu cần format thủ công
make format
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/splitbuddy

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION_HOURS=24

# Server
HOST=0.0.0.0
PORT=8080

# Logging
RUST_LOG=debug,sqlx=warn

# AI (Optional)
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (.env.local)

```env
# API URL (optional, defaults to /api)
VITE_API_URL=http://localhost:8080
```

## Database

### Schema Overview

```
users                 # User accounts
├── sessions          # Drinking sessions
│   ├── session_participants
│   ├── bills
│   │   └── bill_splits
│   └── debts
├── groups            # Friend groups
│   └── group_members
├── friendships       # User connections
├── user_personas     # Avatar & XP
├── achievements      # Badge definitions
├── user_achievements # Unlocked badges
├── music_tracks      # Music player tracks
├── feature_flags     # Feature toggles
├── notifications     # User notifications
└── game_content      # Mini game questions
```

### Useful Commands

```bash
# Reset database
sqlx database drop
sqlx database create
sqlx migrate run

# Add new migration
sqlx migrate add <migration_name>

# Check migration status
sqlx migrate info

# Update SQLx cache (sau khi thêm/sửa query)
cargo sqlx prepare
git add .sqlx/
```

## Development Commands

### Backend

```bash
# Run with hot reload
cargo watch -x run

# Run tests
cargo test

# Check code (clippy)
cargo clippy -- -D warnings

# Format code
cargo fmt

# Build release
cargo build --release

# Update SQLx cache
cargo sqlx prepare
```

### Frontend

```bash
# Development server
npm run dev

# Type check
npm run type-check

# Lint (check only)
npm run lint

# Lint and auto-fix
npm run lint:fix

# Build production
npm run build

# Preview production build
npm run preview
```

## Git Hooks

### Pre-commit Hook

File: `.githooks/pre-commit`

Tự động chạy trước mỗi commit:
1. **Backend (nếu có thay đổi):**
   - `cargo fmt` - Format code
   - `cargo clippy` - Lint check
   - `cargo build` - Build verification

2. **Frontend (nếu có thay đổi):**
   - `eslint --fix` - Auto-fix ESLint
   - `npm run type-check` - TypeScript check
   - `npm run build` - Build verification

### Setup/Update Hooks

```bash
# Cài đặt hooks
make setup

# Hoặc thủ công
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks

# Tạm thời skip hooks (không khuyến khích)
git commit --no-verify -m "message"
```

## ESLint Configuration

Dự án sử dụng ESLint v9 với flat config:

File: `frontend/eslint.config.js`

```javascript
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // ...
    },
  },
)
```

## Common Issues

### Backend won't start

1. Check PostgreSQL is running: `docker ps`
2. Verify DATABASE_URL in .env
3. Run migrations: `sqlx migrate run`
4. Check port 8080 is not in use

### Frontend can't connect to API

1. Verify backend is running on port 8080
2. Check VITE_API_URL in .env.local (optional)
3. Check CORS settings in backend

### Database connection refused

```bash
# Restart PostgreSQL
docker-compose restart

# Check logs
docker-compose logs postgres

# Verify connection string
psql $DATABASE_URL
```

### Migration errors

```bash
# Reset everything
sqlx database drop
sqlx database create
sqlx migrate run
```

### ESLint errors

```bash
# Auto-fix
npm run lint:fix

# Nếu còn lỗi, xem chi tiết
npm run lint
```

### Rust compilation errors

```bash
# Clean build
cargo clean
cargo build

# Update dependencies
cargo update
```

### Git hooks not running

```bash
# Re-setup hooks
make setup

# Verify hook path
git config --get core.hooksPath
# Should return: .githooks

# Check hook is executable
ls -la .githooks/pre-commit
```

## IDE Setup

### VS Code Settings

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "[typescript]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "rust-analyzer.checkOnSave.command": "clippy",
  "eslint.format.enable": true,
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

### Recommended Extensions

- rust-analyzer
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens
- Thunder Client (API testing)
- Error Lens

## Docker Development

### Build locally

```bash
# Build image
make docker-build
# hoặc
docker build -t splitbuddy:dev .

# Run
docker run -p 8080:8080 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  splitbuddy:dev
```

### Test Docker build

```bash
# Test từng stage
docker build --target frontend-builder -t test-fe .
docker build --target backend-builder -t test-be .
docker build -t splitbuddy:test .
```

## Next Steps

After setup is complete:

1. Read [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md) for coding standards
2. Read [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution workflow
3. Check [Architecture Plan.md](./Architecture%20Plan.md) for system overview
4. Browse existing code to understand patterns
5. Pick an issue or feature to work on

Happy coding! 🍺
