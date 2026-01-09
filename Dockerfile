# ===== Stage 1: Cargo Chef Planner =====
FROM rust:1.75-slim as planner
WORKDIR /app
RUN cargo install cargo-chef --locked
COPY backend/ .
RUN cargo chef prepare --recipe-path recipe.json

# ===== Stage 2: Cargo Chef Cook (Cache Dependencies) =====
FROM rust:1.75-slim as cacher
WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN cargo install cargo-chef --locked
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# ===== Stage 3: Build Frontend =====
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Cache npm dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build frontend
COPY frontend/ ./
RUN npm run build

# ===== Stage 4: Build Backend =====
FROM rust:1.75-slim AS backend-builder
WORKDIR /app

ENV SQLX_OFFLINE=true

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy cached dependencies
COPY --from=cacher /app/target target
COPY --from=cacher /usr/local/cargo /usr/local/cargo

# Copy source
COPY backend/.sqlx ./.sqlx
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
COPY backend/migrations ./migrations

# Build with cached dependencies
RUN cargo build --release --locked

# ===== Stage 5: Runtime =====
FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
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
