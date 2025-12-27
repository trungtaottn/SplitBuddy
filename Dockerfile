# ===== Stage 1: Build Frontend =====
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ===== Stage 2: Build Backend =====
FROM rust:1.75-slim-bookworm AS backend-builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY backend/src ./src
COPY backend/migrations ./migrations
RUN touch src/main.rs
RUN cargo build --release

# ===== Stage 3: Runtime =====
FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend binary
COPY --from=backend-builder /app/target/release/splitbuddy ./splitbuddy
COPY --from=backend-builder /app/migrations ./migrations

# Copy frontend static files
COPY --from=frontend-builder /app/frontend/dist ./static

# Create non-root user
RUN useradd -r -s /bin/false splitbuddy
USER splitbuddy

# Heroku uses PORT env variable
ENV PORT=8080
EXPOSE $PORT

CMD ["./splitbuddy"]
