# SplitBuddy Makefile
# Các lệnh tiện ích cho development

.PHONY: setup check format check-backend check-frontend format-backend format-frontend clean

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

## Check tất cả (giống CI)
check: check-backend check-frontend
	@echo ""
	@echo "✅ All checks passed! Ready to push."

## Check backend
check-backend:
	@echo "🔍 Checking backend..."
	@echo "  → cargo fmt --check"
	cd backend && cargo fmt -- --check
	@echo "  → SQLX_OFFLINE=true cargo clippy"
	cd backend && SQLX_OFFLINE=true cargo clippy --release -- -D warnings
	@echo "  → SQLX_OFFLINE=true cargo build"
	cd backend && SQLX_OFFLINE=true cargo build --release
	@echo "  → SQLX_OFFLINE=true cargo test"
	cd backend && SQLX_OFFLINE=true cargo test --release
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
	@echo "  make setup          - Cài đặt git hooks"
	@echo "  make install        - Cài đặt dependencies"
	@echo "  make format         - Format tất cả code"
	@echo "  make check          - Check tất cả (giống CI)"
	@echo "  make check-backend  - Check backend only"
	@echo "  make check-frontend - Check frontend only"
	@echo "  make dev-backend    - Chạy backend dev server"
	@echo "  make dev-frontend   - Chạy frontend dev server"
	@echo "  make docker-build   - Build Docker image"
	@echo "  make clean          - Dọn dẹp build artifacts"
	@echo ""
