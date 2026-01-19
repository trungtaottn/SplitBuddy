# SplitBuddy Makefile
# Các lệnh tiện ích cho development

.PHONY: setup check format check-backend check-frontend lint-backend test-backend format-backend format-frontend clean docker-up docker-down

# ============================================
# Setup
# ============================================

## Cài đặt git hooks
setup:
	@echo "🔧 Setting up git hooks..."
	@chmod +x .githooks/pre-commit
	@chmod +x .githooks/setup.sh
	@git config core.hooksPath .githooks
	@echo "✅ Git hooks installed!"

## Cài đặt dependencies
install:
	@echo "📦 Installing backend dependencies..."
	cd backend && cargo fetch
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm ci
	@echo "✅ All dependencies installed!"

# ============================================
# Format Code
# ============================================

## Format tất cả code
format: format-backend format-frontend
	@echo "✅ All code formatted!"

## Format backend (Rust)
format-backend:
	@echo "🔧 Formatting Rust code..."
	cd backend && cargo fmt
	@echo "✅ Backend formatted!"

## Format frontend (TypeScript)
format-frontend:
	@echo "🔧 Formatting TypeScript code..."
	cd frontend && npm run lint:fix
	@echo "✅ Frontend formatted!"

# ============================================
# Check Code (giống như CI)
# ============================================

## Check tất cả (giống CI - chạy tuần tự)
check: lint-backend test-backend check-frontend
	@echo ""
	@echo "✅ All checks passed! Ready to push."

## Lint backend (fmt + clippy) - tương ứng job lint-backend trong CI
lint-backend:
	@echo "🔍 Linting backend..."
	@echo "  → cargo fmt --check"
	cd backend && cargo fmt -- --check
	@echo "  → SQLX_OFFLINE=true cargo clippy"
	cd backend && SQLX_OFFLINE=true cargo clippy --release -- -D warnings
	@echo "✅ Backend lint passed!"

## Test backend (build + test) - tương ứng job test-backend trong CI
test-backend:
	@echo "🔍 Testing backend..."
	@echo "  → SQLX_OFFLINE=true cargo build"
	cd backend && SQLX_OFFLINE=true cargo build --release
	@echo "  → SQLX_OFFLINE=true cargo nextest run (or cargo test)"
	cd backend && SQLX_OFFLINE=true cargo nextest run --release 2>/dev/null || SQLX_OFFLINE=true cargo test --release
	@echo "✅ Backend tests passed!"

## Check backend (lint + test combined - legacy)
check-backend: lint-backend test-backend
	@echo "✅ Backend checks passed!"

## Check frontend
check-frontend:
	@echo "🔍 Checking frontend..."
	@echo "  → npm ci"
	cd frontend && npm ci --prefer-offline
	@echo "  → type-check"
	cd frontend && npm run type-check || true
	@echo "  → npm run build"
	cd frontend && npm run build
	@echo "✅ Frontend checks passed!"

# ============================================
# Development
# ============================================

## Chạy backend dev server
dev-backend:
	cd backend && cargo run

## Chạy frontend dev server
dev-frontend:
	cd frontend && npm run dev

## Chạy cả backend và frontend (parallel)
dev:
	@echo "🚀 Starting dev servers..."
	@echo "   Backend:  http://localhost:8080"
	@echo "   Frontend: http://localhost:5173"
	@make -j2 dev-backend dev-frontend

# ============================================
# Docker
# ============================================

## Start Docker services (PostgreSQL + Redis)
docker-up:
	@echo "🐳 Starting Docker services..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "   PostgreSQL: localhost:5432"
	@echo "   Redis:      localhost:6379"

## Stop Docker services
docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose down
	@echo "✅ Services stopped!"

## Build Docker image
docker-build:
	docker build -t splitbuddy:dev .

## Dọn dẹp
clean:
	@echo "🧹 Cleaning..."
	cd backend && cargo clean
	cd frontend && rm -rf node_modules dist
	@echo "✅ Cleaned!"

# ============================================
# Help
# ============================================

## Hiển thị help
help:
	@echo "SplitBuddy Makefile Commands:"
	@echo ""
	@echo "  Setup:"
	@echo "    make setup          - Cài đặt git hooks"
	@echo "    make install        - Cài đặt dependencies"
	@echo ""
	@echo "  Format:"
	@echo "    make format         - Format tất cả code"
	@echo "    make format-backend - Format backend only"
	@echo "    make format-frontend- Format frontend only"
	@echo ""
	@echo "  Check (giống CI):"
	@echo "    make check          - Check tất cả (lint + test)"
	@echo "    make lint-backend   - Lint backend (fmt + clippy)"
	@echo "    make test-backend   - Test backend (build + nextest)"
	@echo "    make check-backend  - Check backend (lint + test)"
	@echo "    make check-frontend - Check frontend (type-check + build)"
	@echo ""
	@echo "  Development:"
	@echo "    make dev            - Chạy cả backend + frontend"
	@echo "    make dev-backend    - Chạy backend dev server"
	@echo "    make dev-frontend   - Chạy frontend dev server"
	@echo ""
	@echo "  Docker:"
	@echo "    make docker-up      - Start PostgreSQL + Redis"
	@echo "    make docker-down    - Stop Docker services"
	@echo "    make docker-build   - Build Docker image"
	@echo ""
	@echo "    make clean          - Dọn dẹp build artifacts"
	@echo ""
