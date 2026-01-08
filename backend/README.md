# SplitBuddy Backend

Backend API cho ứng dụng chia tiền nhậu SplitBuddy, được xây dựng với **Rust** và **Axum**.

## Tech Stack

- **Framework:** Axum 0.7
- **Database:** PostgreSQL 16
- **ORM/Query Builder:** SQLx (compile-time checked SQL)
- **Authentication:** JWT + Argon2
- **Decimal Handling:** rust_decimal (tránh floating point errors)
- **AI Integration:** Google Gemini API

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
# Generate query cache trong thư mục .sqlx/
cargo sqlx prepare

# Build với offline mode
SQLX_OFFLINE=true cargo build --release

# Test với offline mode
SQLX_OFFLINE=true cargo test --release
```

**Lưu ý:** Mỗi khi thêm/sửa SQL query mới, cần chạy `cargo sqlx prepare` và commit thư mục `.sqlx/`.

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

### Groups (Nhóm bạn nhậu)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | Danh sách nhóm |
| POST | `/api/groups` | Tạo nhóm mới |
| GET | `/api/groups/:id` | Chi tiết nhóm |
| GET | `/api/groups/:id/members` | Danh sách thành viên |
| POST | `/api/groups/:id/members` | Thêm thành viên |
| DELETE | `/api/groups/:id/members/:user_id` | Xoá thành viên |
| GET | `/api/groups/:id/debts` | Công nợ trong nhóm |
| GET | `/api/groups/:id/debts/simplified` | Công nợ đã cấn trừ |

### Sessions (Cuộc nhậu)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Danh sách sessions (hỗ trợ filter, pagination) |
| POST | `/api/sessions` | Tạo session mới |
| GET | `/api/sessions/:id` | Chi tiết session |
| DELETE | `/api/sessions/:id` | Xoá session |
| POST | `/api/sessions/:id/participants` | Thêm người tham gia (user hoặc guest) |
| PUT | `/api/sessions/:id/participants/:pid` | Cập nhật participant |
| DELETE | `/api/sessions/:id/participants/:pid` | Xoá participant |
| POST | `/api/sessions/:id/close` | Đóng session (finalise debts) |
| POST | `/api/sessions/:id/reopen` | Mở lại session |
| GET | `/api/sessions/:id/bills` | Danh sách bills |
| POST | `/api/sessions/:id/bills` | Tạo bill mới |
| PUT | `/api/sessions/:id/bills/:bill_id` | Cập nhật bill |
| DELETE | `/api/sessions/:id/bills/:bill_id` | Xoá bill |
| GET | `/api/sessions/:id/export` | Export session data |
| POST | `/api/sessions/:id/spin` | Quay vòng quay may mắn |
| GET | `/api/sessions/:id/spin-history` | Lịch sử quay |

### Debts (Công nợ)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/debts/me` | Dashboard công nợ cá nhân |
| GET | `/api/debts/sessions` | Công nợ theo session |
| POST | `/api/debts/:id/request-settle` | Báo đã trả tiền |
| POST | `/api/debts/:id/confirm-settle` | Xác nhận đã nhận |
| POST | `/api/debts/:id/settle-guest` | Tất toán nợ từ khách (auto-approve) |

### Games (Mini Games)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games/truth-or-dare` | Lấy câu hỏi Truth or Dare |
| GET | `/api/games/never-have-i-ever` | Lấy câu hỏi Never Have I Ever |
| GET | `/api/games/challenges` | Lấy thử thách |
| GET | `/api/games/dice` | Tung xúc xắc |
| GET | `/api/games/history/:session_id` | Lịch sử chơi game |
| POST | `/api/games/history/:session_id` | Lưu lịch sử game |
| GET | `/api/games/custom` | Câu hỏi custom của user |
| POST | `/api/games/custom` | Tạo câu hỏi custom |
| DELETE | `/api/games/custom/:id` | Xoá câu hỏi custom |
| GET | `/api/games/custom/random/:game_type` | Random câu hỏi custom |
| GET | `/api/games/stats/:session_id` | Thống kê game session |
| POST | `/api/games/stats/:session_id/drink` | Ghi nhận uống |
| GET | `/api/games/leaderboard` | Bảng xếp hạng |

### Personas (Avatar & Achievements)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personas/me` | Persona của tôi |
| PUT | `/api/personas/me` | Cập nhật persona |
| GET | `/api/personas/achievements` | Tất cả achievements |
| GET | `/api/personas/achievements/me` | Achievements của tôi |
| POST | `/api/personas/achievements/check` | Kiểm tra & unlock achievements |
| GET | `/api/personas/user/:user_id` | Persona của user khác |
| GET | `/api/personas/leaderboard` | Bảng xếp hạng persona |

### AI (Gemini Integration)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/greeting` | Lời chào AI |
| POST | `/api/ai/chat` | Chat với AI |

### Wrapped (Thống kê năm)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wrapped/me` | Wrapped stats của tôi |
| GET | `/api/wrapped/generate` | Generate wrapped mới |

### Uploads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/uploads/avatar` | Upload avatar |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Thống kê hệ thống |

## Project Structure

```
src/
├── main.rs              # Entry point, server setup
├── config.rs            # Environment configuration
├── error.rs             # AppError enum & error handling
├── api/                 # HTTP handlers (Route definitions)
│   ├── mod.rs           # Router aggregation
│   ├── auth.rs          # Login, Register
│   ├── users.rs         # Profile management
│   ├── groups.rs        # Group CRUD, members
│   ├── sessions.rs      # Session CRUD, Bills, Participants
│   ├── debts.rs         # Debt queries & settlement
│   ├── games.rs         # Mini games logic
│   ├── personas.rs      # Avatar & achievements
│   ├── ai.rs            # Gemini AI integration
│   ├── wrapped.rs       # Yearly wrapped stats
│   ├── uploads.rs       # File uploads
│   ├── admin.rs         # Admin endpoints
│   └── response.rs      # Response types & helpers
├── domain/              # Business logic & domain models
│   ├── user.rs          # User model
│   ├── session.rs       # Session, Participant models
│   ├── bill.rs          # Bill, SplitStrategy models
│   ├── debt.rs          # Debt model & status
│   └── split_calculator.rs  # Bill splitting algorithms
├── repository/          # Database layer (SQLx queries)
│   ├── user_repo.rs     # User queries
│   ├── group_repo.rs    # Group queries
│   ├── session_repo.rs  # Session, Bill, Participant queries
│   ├── debt_repo.rs     # Debt queries
│   └── game_repo.rs     # Game history & custom questions
└── middleware/
    └── auth.rs          # JWT verification middleware
```

## Database Schema

Các bảng chính:
- `users` - Tài khoản người dùng
- `groups` - Nhóm bạn nhậu
- `group_members` - Thành viên nhóm
- `sessions` - Cuộc nhậu
- `session_participants` - Người tham gia (user hoặc guest)
- `bills` - Hoá đơn
- `bill_payers` - Ai trả hoá đơn
- `bill_split_details` - Chi tiết chia tiền
- `debts` - Công nợ
- `game_contents` - Nội dung game
- `game_history` - Lịch sử chơi
- `custom_questions` - Câu hỏi custom
- `user_personas` - Avatar & XP
- `achievements` - Danh sách thành tựu
- `user_achievements` - Thành tựu đã mở khoá

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret key cho JWT | Required |
| `JWT_EXPIRATION_HOURS` | Token expiration | 24 |
| `HOST` | Server host | 0.0.0.0 |
| `PORT` | Server port | 8080 |
| `RUST_LOG` | Log level | debug |
| `GEMINI_API_KEY` | Google Gemini API key | Optional |

## Conventions

### Response Format

Tất cả API trả về format chuẩn:
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-05T10:00:00Z",
    "pagination": { "page": 1, "limit": 20, "total": 100 }
  }
}
```

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

### Decimal Handling
- Sử dụng `rust_decimal` cho tất cả tính toán tiền
- API trả về dạng string để tránh floating point errors
- Frontend parse với `parseFloat()` hoặc tương đương

## License

MIT
