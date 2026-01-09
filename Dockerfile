# ===== Stage 1: Build Frontend =====
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Cache npm dependencies (separate layer)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund --prefer-offline

# Build frontend
COPY frontend/ ./
RUN npm run build

# ===== Stage 2: Cargo Chef Planner =====
# Plan Rust dependencies for better caching
FROM rustlang/rust:nightly-slim AS planner
WORKDIR /app

RUN cargo install cargo-chef --locked

COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
RUN cargo chef prepare --recipe-path recipe.json

# ===== Stage 3: Cargo Chef Cook (Cache Dependencies) =====
FROM rustlang/rust:nightly-slim AS cacher
WORKDIR /app

ENV SQLX_OFFLINE=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN cargo install cargo-chef --locked

# Copy recipe and SQLx metadata for offline mode
COPY --from=planner /app/recipe.json recipe.json
COPY backend/.sqlx ./.sqlx

# Build ONLY dependencies (cached layer)
RUN cargo chef cook --release --recipe-path recipe.json

# ===== Stage 4: Build Backend =====
FROM rustlang/rust:nightly-slim AS backend-builder
WORKDIR /app

ENV SQLX_OFFLINE=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy cached dependencies from cacher (only target, not cargo)
COPY --from=cacher /app/target target

# Copy backend sources
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/.sqlx ./.sqlx
COPY backend/src ./src
COPY backend/migrations ./migrations

# Build backend (dependencies already cached, only compile app code)
RUN cargo build --release --locked

# ===== Stage 5: Runtime (Minimal) =====
FROM debian:bookworm-slim AS runtime
WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
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
