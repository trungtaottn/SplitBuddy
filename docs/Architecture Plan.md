

# ARCHITECTURE & PLAN: APP CHIA TIỀN NHẬU - SplitBuddy

## 1. Phân tích yêu cầu & Use Case

### Các Use Case chính (Core User Journey)

1. **Quản lý phiên (Session):** User tạo một cuộc nhậu mới (tên, ngày, địa điểm).
2. **Quản lý người tham gia:**
* Add User có sẵn trong hệ thống (qua email/username).
* Add "Guest" (người chưa có tài khoản, ví dụ: "Bạn của A").


3. **Ghi nhận chi tiêu (Expenses):**
* User A trả tiền tăng 1 (ăn uống).
* User B trả tiền tăng 2 (karaoke).
* Hỗ trợ nhiều người cùng trả cho một hoá đơn (Split payment).


4. **Chia tiền (Splitting):** Hệ thống tự động tính toán ai nợ ai dựa trên tổng chi và quy tắc chia (mặc định chia đều).
5. **Xem công nợ (Dashboard):** User xem được tổng quan: "Tôi nợ ai bao nhiêu?" và "Ai nợ tôi bao nhiêu?".
6. **Thanh toán (Settlement):** User xác nhận đã trả tiền cho chủ nợ -> Cập nhật trạng thái nợ về 0.

### Luồng nghiệp vụ (Business Flow)

`User Login` -> `Tạo Session` -> `Thêm Người tham gia` -> `Thêm Bill (Ai trả, bao nhiêu)` -> `Hệ thống tính toán Transaction (Nợ)` -> `Hiển thị Dashboard` -> `User bấm "Đã trả tiền"` -> `Chủ nợ xác nhận` -> `Kết thúc`.

---

## 2. Kiến trúc tổng thể & Công nghệ

### Mô hình kiến trúc

Chúng ta sẽ sử dụng mô hình **Monolithic Modular** (nguyên khối nhưng chia module rõ ràng).

* **Lý do:** Dự án đang ở giai đoạn đầu, chưa cần microservices gây phức tạp việc deployment và data consistency. Rust compile ra 1 binary duy nhất rất nhẹ và nhanh.
* **Giao tiếp:** Client-Server qua **REST API** (JSON). Đây là chuẩn phổ biến nhất, dễ dàng tích hợp với cả Web (React) và Mobile (Flutter/React Native) sau này.

### Technology Stack (Lựa chọn & Giải thích)

#### **Backend (Rust)**

* **Framework:** **Axum**.
* *Lý do:* Hiện đại, được phát triển bởi đội ngũ Tokio (runtime async chuẩn của Rust), hiệu năng cực cao, API ergonomic (dễ viết), community đang tăng trưởng mạnh nhất.


* **Database ORM:** **SQLx**.
* *Lý do:* Không phải là ORM thuần tuý mà là query builder có *compile-time check* (kiểm tra câu SQL ngay khi code). Hiệu năng cao hơn Diesel trong môi trường Async, viết SQL thuần giúp tối ưu query phức tạp cho logic chia tiền.


* **Authentication:** `jsonwebtoken` (JWT) + `argon2` (hashing pass).
* *Lý do:* Stateless, phù hợp cho mobile scaling sau này.


* **Serialization:** `serde` & `serde_json` (Tiêu chuẩn của Rust).
* **Data Type:** `rust_decimal` (Quan trọng).
* *Lý do:* **Tuyệt đối không dùng float/double cho tiền tệ**. Cần dùng Decimal để tránh sai số làm tròn.



#### **Frontend (Web)**

* **Framework:** **React** + **Vite** + **TypeScript**.
* **State Management:** **TanStack Query (React Query)**.
* *Lý do:* Quản lý server state cực tốt (cache, re-fetch dữ liệu khi switch tab), rất cần thiết cho app real-time như chia tiền.


* **UI Library:** **TailwindCSS** + **ShadcnUI**.
* *Lý do:* Xây dựng giao diện nhanh, đẹp, component nhẹ.



#### **Project Structure (Backend)**

```text
src/
├── api/            # Controller/Handlers (Router, Request/Response structs)
├── domain/         # Business Logic (Tính toán chia tiền, validation)
├── repository/     # Database interaction (SQLx queries)
├── infra/          # Config, DB connection, Email service
├── utils/          # Error handling, JWT helpers
└── main.rs         # Entry point

```

---

## 3. Thiết kế Database (PostgreSQL)

Chúng ta cần thiết kế Schema để xử lý được việc: 1 cuộc nhậu có nhiều Bill, 1 Bill có thể do nhiều người trả, và công nợ được tính toán từ đó.

**Các bảng chính:**

1. **`users`**:
* `id` (UUID), `email`, `password_hash`, `full_name`, `avatar_url`.


2. **`sessions`** (Cuộc nhậu):
* `id` (UUID), `name`, `status` (active/closed), `created_by` (user_id), `created_at`.


3. **`session_participants`** (Người tham gia):
* `session_id`, `user_id` (nullable - nếu là guest), `guest_name` (nếu user_id null), `joined_at`.


4. **`bills`** (Hoá đơn):
* `id`, `session_id`, `amount` (Decimal), `description`, `created_at`.


5. **`bill_payers`** (Ai trả tiền cho bill này?):
* `bill_id`, `participant_id`, `amount_paid`.
* *Note:* Tách bảng này để hỗ trợ trường hợp 2 người cùng góp tiền trả 1 bill to.


6. **`bill_splits`** (Chi tiết ai chịu bao nhiêu trong bill này):
* `bill_id`, `participant_id`, `amount_owed` (Số tiền người này phải gánh).


7. **`debts`** (Bảng Cache/Snapshot công nợ tổng kết):
* `session_id`, `debtor_id` (người nợ), `creditor_id` (chủ nợ), `amount`, `is_settled` (đã trả chưa).
* *Lý do:* Bảng này được tính toán lại mỗi khi có Bill mới được thêm/sửa, giúp query hiển thị nhanh hơn.



---

## 4. Thiết kế API (RESTful)

### Auth

* `POST /api/auth/register`: Đăng ký.
* `POST /api/auth/login`: Trả về JWT Access Token.

### Session

* `GET /api/sessions`: Lấy danh sách cuộc nhậu của user.
* `POST /api/sessions`: Tạo cuộc nhậu mới.
* *Body:* `{ "name": "Nhậu tất niên", "location": "Quán Ốc" }`


* `POST /api/sessions/{id}/participants`: Thêm người.

### Bill & Calculation (Quan trọng)

* `POST /api/sessions/{session_id}/bills`: Thêm hoá đơn.
* *Request Body:*
```json
{
  "description": "Tăng 1",
  "total_amount": 1000000,
  "payers": [
    { "user_id": "uuid-cua-A", "amount": 1000000 }
  ],
  "split_strategy": "EQUAL", // Hoặc "CUSTOM"
  "custom_splits": [] // Nếu custom thì điền vào đây
}

```


* *Response:* Trả về thông tin Bill và trigger việc tính lại nợ.



### Debt

* `GET /api/sessions/{session_id}/debts`: Lấy bảng công nợ của cuộc nhậu đó.
* `GET /api/users/me/debts`: Xem tổng nợ trên tất cả các cuộc nhậu (Dashboard chính).
* `POST /api/debts/{id}/settle`: Xác nhận đã trả tiền.

---

## 5. Logic Chia tiền & Công nợ (Algorithm)

### Quy tắc chia tiền mặc định

Sử dụng thuật toán **"Net Balance"** (Cân bằng ròng) để tối ưu hoá số lượng giao dịch.

1. **Bước 1: Tính Net Balance cho mỗi người trong 1 Session.**
* `Balance = (Tổng tiền đã trả) - (Tổng tiền phải chịu)`
* Ví dụ: Bill 300k, 3 người A, B, C. A trả 300k.
* A: Trả 300k, Chịu 100k -> Balance = +200k (Dương: Cần thu về).
* B: Trả 0, Chịu 100k -> Balance = -100k (Âm: Phải trả).
* C: Trả 0, Chịu 100k -> Balance = -100k.




2. **Bước 2: Ghép cặp (Reconciliation).**
* Sắp xếp danh sách người có Balance Dương và Balance Âm.
* Lấy người nợ nhiều nhất trả cho người cần thu nhiều nhất. Lặp lại cho đến khi Balance về 0.



### Xử lý Ledger (Sổ cái)

Hệ thống sẽ không chỉ lưu số dư cuối cùng, mà lưu **Log** (Transaction Log) để minh bạch.
Khi Bill được tạo -> Tạo các record vào bảng `bill_splits`.
Sau đó chạy một hàm `calculate_session_debt(session_id)` để update bảng `debts`.

---

## 6. Kế hoạch triển khai (Roadmap)

### Giai đoạn 1: MVP (Web Only) - 4 Tuần

* **Backend:** Setup Axum, DB Schema, Auth, CRUD Session/Bill, Logic chia đều (Equal Split).
* **Frontend:** Login page, Dashboard list session, Form tạo Bill đơn giản, View nợ cơ bản.
* **Goal:** Một nhóm bạn có thể dùng link web để tạo bill và biết ai nợ ai.

### Giai đoạn 2: Advanced Features - 3 Tuần

* **Logic:** Thêm chia theo tỉ lệ (Weight), chia thủ công (Custom Amount). Xử lý Guest (người không có acc).
* **UX:** Thêm comment vào bill, upload ảnh hoá đơn (lưu link s3).
* **Stats:** Thống kê ai là "chủ xị" (trả tiền trước nhiều nhất).

### Giai đoạn 3: Mobile Preparation - 3 Tuần

* **API:** Refactor API để chuẩn hoá response code, error handling cho Mobile.
* **Notification:** Tích hợp Telegram Bot hoặc Email để báo nợ ("A ơi trả tiền đi").
* **Mobile App:** Bắt đầu code React Native/Flutter gọi vào API đã có.

---

## 7. DevOps & Vận hành

* **Docker:** Viết `Dockerfile` Multi-stage build cho Rust. Build ra image cực nhẹ (~20-50MB).
* **Deploy:**
* *Database:* Thuê managed DB (ví dụ: Railway Postgres, Supabase, hoặc AWS RDS).
* *Backend:* Deploy Docker container lên Render / Railway / Fly.io (Dễ dàng cho start-up).


* **CI/CD:** GitHub Actions. Tự động chạy `cargo test` và `cargo clippy` (linting) khi push code.
* **Logging:** Dùng crate `tracing` và `tracing-subscriber` để log structured (JSON format), dễ debug.

---

## 8. Rủi ro & Điểm cần lưu ý (Tech Debt Prevention)

1. **Vấn đề làm tròn số (Floating Point Error):**
* *Giải pháp:* Bắt buộc dùng `DECIMAL` trong DB và crate `rust_decimal` trong code. Luôn làm tròn ở bước hiển thị cuối cùng, không làm tròn trong lúc tính toán trung gian.


2. **Concurrency (Đồng thời):**
* *Rủi ro:* 2 người cùng update 1 session (thêm bill) cùng lúc gây sai lệch số dư.
* *Giải pháp:* Sử dụng **Database Transaction** (trong SQLx là `tx.commit()`) cho cụm thao tác thêm bill + tính lại nợ.


3. **Sửa Bill sau khi đã chốt:**
* *Rủi ro:* Rất phức tạp nếu ai đó sửa bill cũ mà mọi người đã thanh toán xong.
* *Giải pháp:* Trong MVP, chỉ cho sửa bill khi trạng thái nợ là "Chưa thanh toán". Nếu đã thanh toán, phải revert trạng thái mới được sửa.


4. **Khách lạ (Guest Users):**
* Cần thiết kế bảng `session_participants` khéo léo để handle việc một Guest sau này đăng ký tài khoản thật thì merge dữ liệu vào kiểu gì (Mapping by email/phone).

