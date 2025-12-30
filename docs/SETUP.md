# Setup Guide

Hướng dẫn chi tiết để setup môi trường development cho SplitBuddy.

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Rust | 1.75+ | [rustup.rs](https://rustup.rs/) |
| Docker | Latest | [docker.com](https://docker.com/) |
| PostgreSQL | 16 | Via Docker hoặc native |

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

### 2. Start PostgreSQL

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

### 3. Backend Setup

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

Backend will be available at `http://localhost:3000`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local
# VITE_API_URL=http://localhost:3000

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/splitbuddy

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server
HOST=0.0.0.0
PORT=3000

# Logging
RUST_LOG=debug,sqlx=warn
```

### Frontend (.env.local)

```env
# API URL
VITE_API_URL=http://localhost:3000
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
```

## Development Commands

### Backend

```bash
# Run with hot reload
cargo watch -x run

# Run tests
cargo test

# Check code
cargo clippy

# Format code
cargo fmt

# Build release
cargo build --release
```

### Frontend

```bash
# Development server
npm run dev

# Type check
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Common Issues

### Backend won't start

1. Check PostgreSQL is running: `docker ps`
2. Verify DATABASE_URL in .env
3. Run migrations: `sqlx migrate run`
4. Check port 3000 is not in use

### Frontend can't connect to API

1. Verify backend is running on port 3000
2. Check VITE_API_URL in .env.local
3. Check CORS settings in backend

### Database connection refused

```bash
# Restart PostgreSQL
docker-compose restart

# Check logs
docker-compose logs postgres
```

### Migration errors

```bash
# Reset everything
sqlx database drop
sqlx database create
sqlx migrate run
```

## IDE Setup

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "rust-analyzer.checkOnSave.command": "clippy"
}
```

### Recommended Extensions

- rust-analyzer
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens
- Thunder Client (API testing)

## Next Steps

After setup is complete:

1. Read [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md) for coding standards
2. Check [Architecture Plan.md](./Architecture%20Plan.md) for system overview
3. Browse existing code to understand patterns
4. Pick an issue or feature to work on

Happy coding!
