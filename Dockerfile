# ===== Stage 1: Build Frontend =====
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Cache npm dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build frontend
COPY frontend/ ./
RUN npm run build

# ===== Stage 2: Build Backend =====
# Use nightly Rust because some transitive dependencies require edition2024
FROM rustlang/rust:nightly-slim AS backend-builder
WORKDIR /app

# Enable offline SQLx (uses pre-generated .sqlx metadata)
ENV SQLX_OFFLINE=true

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend sources
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/.sqlx ./.sqlx
COPY backend/src ./src
COPY backend/migrations ./migrations

# Build backend in release mode
RUN cargo build --release --locked

# ===== Stage 3: Runtime =====
FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -r -s /bin/false splitbuddy

# Copy backend binary
COPY --from=backend-builder /app/target/release/splitbuddy ./splitbuddy
COPY --from=backend-builder /app/migrations ./migrations

# Copy frontend static files
COPY --from=frontend-builder /app/frontend/dist ./static

# Set permissions and user
RUN chown -R splitbuddy:splitbuddy /app
USER splitbuddy

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# Port configuration
ENV PORT=8080
EXPOSE $PORT

CMD ["./splitbuddy"]
