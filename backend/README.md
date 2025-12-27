# SplitBuddy Backend

Backend API cho ứng dụng chia tiền nhậu SplitBuddy, được xây dựng với **Rust** và **Axum**.

## Tech Stack

- **Framework:** Axum 0.7
- **Database:** PostgreSQL 16
- **ORM/Query Builder:** SQLx (compile-time checked SQL)
- **Authentication:** JWT + Argon2
- **Decimal Handling:** rust_decimal (tránh floating point errors)

## Prerequisites

- Rust 1.75+ (cài đặt qua [rustup](https://rustup.rs/))
- Docker & Docker Compose (cho PostgreSQL)
- SQLx CLI: `cargo install sqlx-cli --no-default-features --features postgres`

## Quick Start

### 1. Clone và setup environment

```bash
cd backend
cp .env.example .env
```

### 2. Khởi động PostgreSQL

```bash
# Từ thư mục root của project
docker-compose up -d
```

### 3. Chạy migrations

```bash
cd backend
sqlx database create
sqlx migrate run
```

### 4. Chạy server

```bash
cargo run
```

Server sẽ chạy tại `http://localhost:8080`

## Development

### Chạy với hot reload (sử dụng cargo-watch)

```bash
cargo install cargo-watch
cargo watch -x run
```

### Chạy tests

```bash
cargo test
```

### Linting & Formatting

```bash
# Format code
cargo fmt

# Run clippy (linter)
cargo clippy -- -D warnings
```

### SQLx Offline Mode

Để build mà không cần kết nối database (CI/CD):

```bash
# Generate sqlx-data.json
cargo sqlx prepare

# Build với offline mode
SQLX_OFFLINE=true cargo build
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập, lấy JWT token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Lấy profile hiện tại |
| PUT | `/api/users/me` | Cập nhật profile |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Danh sách sessions |
| POST | `/api/sessions` | Tạo session mới |
| GET | `/api/sessions/:id` | Chi tiết session |
| POST | `/api/sessions/:id/participants` | Thêm người tham gia |
| GET | `/api/sessions/:id/bills` | Danh sách bills |
| POST | `/api/sessions/:id/bills` | Tạo bill mới |

### Debts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/debts/me` | Dashboard công nợ |
| POST | `/api/debts/:id/request-settle` | Báo đã trả tiền |
| POST | `/api/debts/:id/confirm-settle` | Xác nhận đã nhận |

## Project Structure

```
src/
├── main.rs          # Entry point
├── config.rs        # Environment configuration
├── error.rs         # AppError enum
├── api/             # HTTP handlers
│   ├── mod.rs
│   ├── auth.rs      # Login, Register
│   ├── users.rs     # Profile
│   ├── sessions.rs  # Session CRUD, Bills
│   ├── debts.rs     # Debt queries
│   └── response.rs  # Response types
├── domain/          # Business logic
│   ├── user.rs
│   ├── session.rs
│   ├── bill.rs
│   ├── debt.rs
│   └── split_calculator.rs
├── repository/      # Database layer
│   ├── user_repo.rs
│   ├── session_repo.rs
│   └── debt_repo.rs
└── middleware/
    └── auth.rs      # JWT verification
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret key cho JWT | Required |
| `JWT_EXPIRATION_HOURS` | Token expiration | 24 |
| `HOST` | Server host | 127.0.0.1 |
| `PORT` | Server port | 8080 |
| `RUST_LOG` | Log level | debug |

## License

MIT
