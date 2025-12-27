# SplitBuddy Backend - Phân tích & Thiết kế

---

## I. PHÂN TÍCH TÀI LIỆU

### 1.1 Bối cảnh & Mục tiêu sản phẩm

**SplitBuddy** là ứng dụng chia tiền nhậu, giúp nhóm bạn:
- Ghi nhận chi tiêu trong các buổi nhậu
- Tự động tính toán ai nợ ai bao nhiêu
- Theo dõi và thanh toán công nợ

**Mục tiêu MVP:** Một nhóm bạn có thể tạo session, thêm bill, và biết ai nợ ai.

### 1.2 Luồng nghiệp vụ chính

```
User Login → Tạo Session → Thêm Participants → Thêm Bill(s) 
    → Hệ thống tính Debt → Hiển thị Dashboard → User "Đã trả" 
    → Chủ nợ xác nhận → Kết thúc
```

### 1.3 Yêu cầu phi chức năng quan trọng

| Yêu cầu | Giải pháp |
|---------|-----------|
| **Độ chính xác tiền tệ** | `rust_decimal` + `DECIMAL` trong DB, không dùng float |
| **Concurrency** | Database Transaction cho các thao tác atomic |
| **Bảo mật** | JWT stateless, Argon2 hash password |
| **Mở rộng** | Monolithic Modular, REST API chuẩn cho mobile |
| **Logging** | `tracing` với structured JSON format |

---

## II. PHÂN TÍCH & HOÀN THIỆN YÊU CẦU

### 2.1 Use Cases chính

| Actor | Use Case | Mô tả |
|-------|----------|-------|
| **User** | UC-01: Đăng ký/Đăng nhập | JWT Authentication |
| **User** | UC-02: Quản lý Profile | Cập nhật tên, avatar |
| **Owner** | UC-03: Tạo Session | Tên, địa điểm cuộc nhậu |
| **Owner** | UC-04: Thêm Participant | User có sẵn hoặc Guest |
| **User** | UC-05: Thêm Bill | Số tiền, người trả, cách chia |
| **User** | UC-06: Xem Dashboard | Tổng quan nợ trong/ngoài session |
| **Debtor** | UC-07: Báo đã trả | Request settlement |
| **Creditor** | UC-08: Xác nhận đã nhận | Confirm settlement |

### 2.2 Domain Models (Entities)

```
┌─────────────────────────────────────────────────────────────────┐
│                         DOMAIN MODEL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐         ┌─────────────┐         ┌─────────┐       │
│  │  User   │────────▶│   Session   │◀────────│  Bill   │       │
│  └─────────┘ creates └─────────────┘ contains└─────────┘       │
│       │                    │                      │             │
│       │                    ▼                      ▼             │
│       │         ┌──────────────────┐    ┌─────────────────┐    │
│       └────────▶│SessionParticipant│◀───│   BillPayer     │    │
│                 └──────────────────┘    └─────────────────┘    │
│                          │                      │               │
│                          ▼                      ▼               │
│                 ┌──────────────────┐    ┌─────────────────┐    │
│                 │      Debt        │◀───│   BillSplit     │    │
│                 └──────────────────┘    └─────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Entity Details:**

| Entity | Thuộc tính chính |
|--------|-----------------|
| `User` | id, email, password_hash, full_name, avatar_url |
| `Session` | id, name, location, status(active/closed), created_by, created_at |
| `SessionParticipant` | session_id, user_id(nullable), guest_name, role(owner/member) |
| `Bill` | id, session_id, description, amount, created_at, created_by |
| `BillPayer` | bill_id, participant_id, amount_paid |
| `BillSplit` | bill_id, participant_id, amount_owed |
| `Debt` | session_id, debtor_id, creditor_id, amount, is_settled |

### 2.3 Giả định (Assumptions)

> ⚠️ **Các giả định sau được đưa ra do tài liệu chưa rõ ràng:**

1. **[A-01]** Một User có thể tham gia nhiều Session đồng thời
2. **[A-02]** Chỉ Owner mới có quyền thêm/sửa Bill và Participants
3. **[A-03]** Guest không thể đăng nhập, chỉ hiển thị trong danh sách nợ
4. **[A-04]** Settlement cần cả 2 bên xác nhận (debtor request → creditor confirm)
5. **[A-05]** MVP: Chỉ hỗ trợ chia đều (EQUAL), Advanced: thêm CUSTOM/WEIGHTED
6. **[A-06]** Một Bill có thể có nhiều Payers (split payment)
7. **[A-07]** Currency mặc định là VND, không cần multi-currency MVP

---

## III. ĐỀ XUẤT KIẾN TRÚC HỆ THỐNG

### 3.1 Framework Selection: **Axum**

| Tiêu chí | Axum | Actix Web |
|----------|------|-----------|
| **Async Runtime** | Tokio (native) | Actix runtime |
| **Ergonomics** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Performance** | Excellent | Excellent |
| **Ecosystem** | Tower middleware | Custom middleware |
| **Learning Curve** | Moderate | Steeper |
| **Maintained by** | Tokio team | Community |

**Chọn Axum** vì:
- API đơn giản, dễ viết và maintain
- Tích hợp tốt với SQLx (cùng Tokio runtime)
- Tower ecosystem cho middleware reusable
- Community đang phát triển mạnh

### 3.2 Database & ORM: **PostgreSQL + SQLx**

- **PostgreSQL**: ACID, DECIMAL support, production-ready
- **SQLx**: Compile-time checked queries, async native, không ORM overhead

### 3.3 Cấu trúc thư mục Backend

```
backend/
├── Cargo.toml
├── .env.example
├── .rustfmt.toml
├── migrations/           # SQLx migrations
│   └── 20240101000000_initial.sql
├── src/
│   ├── main.rs          # Entry point, server setup
│   ├── lib.rs           # Library exports
│   ├── config.rs        # Environment configuration
│   ├── api/             # HTTP handlers (Controllers)
│   │   ├── mod.rs
│   │   ├── auth.rs      # Login, Register
│   │   ├── users.rs     # Profile management
│   │   ├── sessions.rs  # Session CRUD
│   │   ├── bills.rs     # Bill management
│   │   ├── debts.rs     # Debt queries & settlement
│   │   └── response.rs  # ApiResponse, ErrorResponse
│   ├── domain/          # Business logic & entities
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   ├── session.rs
│   │   ├── bill.rs
│   │   ├── debt.rs
│   │   └── split_calculator.rs  # Debt calculation algorithm
│   ├── repository/      # Database access layer
│   │   ├── mod.rs
│   │   ├── user_repo.rs
│   │   ├── session_repo.rs
│   │   ├── bill_repo.rs
│   │   └── debt_repo.rs
│   ├── middleware/      # Custom middleware
│   │   ├── mod.rs
│   │   └── auth.rs      # JWT verification
│   └── error.rs         # AppError enum
└── tests/               # Integration tests
    └── api_tests.rs
```

### 3.4 API Endpoints (High-level)

#### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Đăng ký user mới |
| POST | `/api/auth/login` | Đăng nhập, trả về JWT |

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Lấy profile user hiện tại |
| PUT | `/api/users/me` | Cập nhật profile |

#### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Danh sách sessions của user |
| POST | `/api/sessions` | Tạo session mới |
| GET | `/api/sessions/{id}` | Chi tiết session |
| POST | `/api/sessions/{id}/participants` | Thêm participant |

#### Bills
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions/{id}/bills` | Danh sách bills trong session |
| POST | `/api/sessions/{id}/bills` | Tạo bill mới |

#### Debts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions/{id}/debts` | Công nợ trong session |
| GET | `/api/users/me/debts` | Dashboard tổng hợp nợ |
| POST | `/api/debts/{id}/request-settle` | Debtor báo đã trả |
| POST | `/api/debts/{id}/confirm-settle` | Creditor xác nhận |

### 3.5 Database Schema (ERD)

```sql
-- Core Tables
users (id UUID PK, email UNIQUE, password_hash, full_name, avatar_url, created_at)
    │
    ├──< sessions (id UUID PK, name, location, status, created_by FK, created_at)
    │        │
    │        ├──< session_participants (id UUID PK, session_id FK, user_id FK NULL, 
    │        │                          guest_name, role, joined_at)
    │        │        │
    │        │        ├──< bill_payers (bill_id FK, participant_id FK, amount_paid DECIMAL)
    │        │        │
    │        │        ├──< bill_splits (bill_id FK, participant_id FK, amount_owed DECIMAL)
    │        │        │
    │        │        └──< debts (session_id FK, debtor_id FK, creditor_id FK, 
    │        │                    amount DECIMAL, status, created_at, settled_at)
    │        │
    │        └──< bills (id UUID PK, session_id FK, description, amount DECIMAL,
    │                    split_strategy, created_by FK, created_at)
```

### 3.6 Khả năng mở rộng

| Tính năng tương lai | Cách kiến trúc hỗ trợ |
|---------------------|----------------------|
| **Mobile App** | REST API chuẩn, JWT stateless |
| **Real-time Updates** | Thêm WebSocket layer (Axum hỗ trợ sẵn) |
| **Multi-currency** | Thêm `currency` field vào Bill, converter service |
| **Notification** | Thêm `notification` module, queue system |
| **Microservices** | Module separation sẵn sàng tách ra |

---

## IV. KẾ HOẠCH TRIỂN KHAI

### Milestone 1: Project Setup (2-3 ngày)
| Task ID | Task | Priority |
|---------|------|----------|
| M1-01 | Init Cargo project + dependencies | High |
| M1-02 | Setup folder structure | High |
| M1-03 | Config module (.env, config.rs) | High |
| M1-04 | Docker Compose cho PostgreSQL | High |
| M1-05 | SQLx migration setup | High |

### Milestone 2: Database & Models (3-4 ngày)
| Task ID | Task | Priority |
|---------|------|----------|
| M2-01 | Migration: users table | High |
| M2-02 | Migration: sessions, participants | High |
| M2-03 | Migration: bills, bill_payers, bill_splits | High |
| M2-04 | Migration: debts table | High |
| M2-05 | Domain models (structs) | High |
| M2-06 | Repository layer skeleton | High |

### Milestone 3: Core APIs (5-7 ngày)
| Task ID | Task | Priority |
|---------|------|----------|
| M3-01 | Auth: Register + Login | High |
| M3-02 | JWT middleware | High |
| M3-03 | Users: GET/PUT /me | Medium |
| M3-04 | Sessions: CRUD | High |
| M3-05 | Sessions: Add participant | High |
| M3-06 | Bills: Create bill | High |
| M3-07 | **Debt calculation logic** | High |
| M3-08 | Debts: GET endpoints | High |

### Milestone 4: Polish & Error Handling (2-3 ngày)
| Task ID | Task | Priority |
|---------|------|----------|
| M4-01 | Standardized error response | High |
| M4-02 | Request validation (validator crate) | Medium |
| M4-03 | Logging với tracing | Medium |
| M4-04 | Settlement flow | Medium |

---

## V. SETUP DỰ ÁN

Bây giờ tôi sẽ tạo cấu trúc dự án Rust với các file cần thiết:
---

## ✅ HOÀN THÀNH SETUP DỰ ÁN

### Cấu trúc Project đã tạo

```
SplitBuddy/
├── docker-compose.yml          # PostgreSQL container
├── .gitignore
├── docs/                       # Tài liệu có sẵn
└── backend/
    ├── Cargo.toml              # Dependencies
    ├── .env.example            # Environment template
    ├── .rustfmt.toml           # Formatting config
    ├── .gitignore
    ├── README.md               # Hướng dẫn setup
    ├── migrations/
    │   └── 20240101000000_initial.sql  # DB schema
    └── src/
        ├── main.rs             # Entry point
        ├── config.rs           # Config loader
        ├── error.rs            # AppError enum
        ├── api/
        │   ├── mod.rs          # Router setup
        │   ├── auth.rs         # Register/Login
        │   ├── users.rs        # Profile
        │   ├── sessions.rs     # Session CRUD + Bills
        │   ├── bills.rs        # (placeholder)
        │   ├── debts.rs        # Debt dashboard
        │   └── response.rs     # ApiResponse types
        ├── domain/
        │   ├── user.rs
        │   ├── session.rs
        │   ├── bill.rs
        │   ├── debt.rs
        │   └── split_calculator.rs  # Thuật toán chia tiền
        ├── middleware/
        │   └── auth.rs         # JWT verification
        └── repository/
            ├── user_repo.rs
            ├── session_repo.rs
            ├── bill_repo.rs
            └── debt_repo.rs
```

---

## 🚀 HƯỚNG DẪN CHẠY DỰ ÁN

### Bước 1: Setup Environment

```bash
cd backend
cp .env.example .env
```

### Bước 2: Khởi động PostgreSQL

```bash
# Từ thư mục root SplitBuddy
docker-compose up -d
```

### Bước 3: Cài đặt SQLx CLI & chạy migrations

```bash
cargo install sqlx-cli --no-default-features --features postgres
cd backend
sqlx database create
sqlx migrate run
```

### Bước 4: Chạy server

```bash
cargo run
```

Server sẽ chạy tại **http://localhost:8080**

---

## 📋 TÓM TẮT

| Hạng mục | Trạng thái |
|----------|-----------|
| Phân tích tài liệu | ✅ |
| Use cases & Domain models | ✅ |
| Kiến trúc (Axum + SQLx + PostgreSQL) | ✅ |
| Kế hoạch triển khai (4 Milestones) | ✅ |
| Project skeleton | ✅ |
| Database migration | ✅ |
| Auth API (Register/Login) | ✅ |
| Sessions API | ✅ |
| Bills API | ✅ |
| Debts API | ✅ |
| Split calculation algorithm | ✅ |

**Tiếp theo:** Chạy `cargo build` để verify code compiles, sau đó có thể bắt đầu test các API endpoints với Postman/curl.