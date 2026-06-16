Tài liệu **User Stories (US)**, **Roadmap** và **Tasklist kỹ thuật**


---

# PHẦN 1: USER STORIES (DANH SÁCH TÍNH NĂNG)

Chúng ta sẽ chia các User Story (US) theo các Module nghiệp vụ (Epics).

### Epic 1: Authentication & User Profile

* **US-01:** Là User mới, tôi muốn đăng ký tài khoản bằng email/password để bắt đầu sử dụng hệ thống.
* **US-02:** Là User, tôi muốn đăng nhập và duy trì phiên làm việc để không phải nhập lại mật khẩu nhiều lần.
* **US-03:** Là User, tôi muốn cập nhật Avatar và Tên hiển thị để bạn bè dễ nhận ra tôi trong danh sách.

### Epic 2: Session Management (Quản lý cuộc nhậu)

* **US-04:** Là User, tôi muốn tạo một "Session" (Cuộc nhậu) mới với Tên và Địa điểm.
* **US-05:** Là Chủ phòng (Owner), tôi muốn thêm bạn bè (đã có tài khoản) vào Session để cùng chia tiền.
* **US-06:** Là Chủ phòng, tôi muốn thêm một "Khách lạ" (Guest - chưa có tài khoản) vào Session để vẫn chia tiền được cho họ.

### Epic 3: Expense Tracking (Ghi chép chi tiêu)

* **US-07:** Là User, tôi muốn thêm một Bill mới (ví dụ: Tăng 1 ăn ốc), nhập tổng tiền và chọn ai là người đã trả tiền (Payer).
* **US-08 (MVP):** Là User, tôi muốn hệ thống tự động chia đều tiền Bill đó cho tất cả thành viên trong Session.
* **US-09 (Advanced):** Là User, tôi muốn chỉnh sửa cách chia tiền (ví dụ: A uống ít, B uống nhiều) hoặc loại bỏ ai đó ra khỏi Bill này (ví dụ: C về sớm không đi Tăng 2).

### Epic 4: Debt Settlement (Thanh toán & Công nợ)

* **US-10:** Là User, tôi muốn xem Dashboard hiển thị rõ: "Tôi đang nợ ai bao nhiêu?" và "Ai đang nợ tôi bao nhiêu?".
* **US-11:** Là Người nợ, sau khi chuyển khoản trả tiền, tôi muốn bấm nút "Đã trả" để thông báo cho chủ nợ.
* **US-12:** Là Chủ nợ, tôi muốn xác nhận "Đã nhận tiền" để xoá khoản nợ đó khỏi hệ thống.

---

# PHẦN 2: ROADMAP TRIỂN KHAI

Chia làm 3 giai đoạn (Sprints), mỗi giai đoạn khoảng 2-3 tuần tuỳ tốc độ team.

### 📅 Phase 1: MVP Core (Tuần 1-3)

* **Mục tiêu:** Chạy được luồng cơ bản: Tạo Session -> Thêm người -> Thêm Bill (chia đều) -> Xem ai nợ ai.
* **Phạm vi:** Chỉ Web, Auth cơ bản, chưa có Guest, chưa có chia tiền nâng cao.

### 📅 Phase 2: Advanced Logic & UX (Tuần 4-6)

* **Mục tiêu:** Xử lý các trường hợp thực tế phức tạp.
* **Phạm vi:** Thêm Guest, Chia tiền theo trọng số/số tiền cụ thể, Sửa/Xoá Bill, Activity Log.

### 📅 Phase 3: Stabilization & Pre-Mobile (Tuần 7-8)

* **Mục tiêu:** Ổn định hệ thống, tài liệu hoá API, chuẩn bị cho Mobile App.
* **Phạm vi:** Swagger Docs, Optimization, Notification (Email/Zalo basic), Deployment Production.

---

# PHẦN 3: DETAILED TASKLIST (KỸ THUẬT)

Dưới đây là danh sách việc cần làm (To-do list) chi tiết cho Dev Team.

## 🚀 Giai đoạn 1: MVP Core

### 1. Setup & Infra (Backend + Frontend)

* [ ] **S-01:** Khởi tạo Git Repository (Monorepo hoặc 2 repos riêng).
* [ ] **S-02:** Setup môi trường Dev Backend: Rust cargo init, cài `sqlx-cli`, cấu hình `axum`.
* [ ] **S-03:** Setup môi trường Dev Frontend: Vite + React + TS, cài TailwindCSS, ShadcnUI, TanStack Query.
* [ ] **S-04:** Setup Docker Compose cho PostgreSQL (Local DB).
* [ ] **S-05:** Thiết kế DB Schema v1 (Users, Sessions, Participants, Bills, BillSplits, Debts) và viết file Migration (`sqlx migrate`).

### 2. Backend (Rust - Axum)

* [ ] **BE-01:** Implement Module `Auth`: Hash password (argon2), Generate JWT, Middleware xác thực (Protect Route).
* [ ] **BE-02:** Implement Module `User`: API get profile `Me`.
* [ ] **BE-03:** Implement Module `Session`: CRUD (Create, Read, Update). API Add Participant (check user exist).
* [ ] **BE-04:** Implement Module `Bill` (Basic): API tạo Bill, lưu vào DB.
* [ ] **BE-05:** Implement **Logic Chia Tiền (Core)**:
* Viết hàm `calculate_debt`: Khi có bill mới -> tính chia đều -> update bảng `Debts`.
* Dùng `rust_decimal` để tính toán.


* [ ] **BE-06:** Implement API `Dashboard`: Trả về danh sách nợ của User hiện tại trong Session.

### 3. Frontend (React)

* [ ] **FE-01:** Dựng Layout chung (Navbar, Sidebar), tích hợp Axios Interceptor (gắn Token vào Header).
* [ ] **FE-02:** Màn hình Login / Register.
* [ ] **FE-03:** Màn hình "My Sessions" (List các cuộc nhậu).
* [ ] **FE-04:** Màn hình "Session Detail":
* Tab Overview: Hiển thị tổng tiền, danh sách thành viên.
* Tab Bills: List các hoá đơn, nút "Thêm hoá đơn".


* [ ] **FE-05:** Form "Thêm Hoá Đơn" (Basic): Nhập tên, số tiền, chọn người trả.
* [ ] **FE-06:** Màn hình "Công nợ": Hiển thị ai nợ ai (lấy từ API BE-06).

---

## 🚀 Giai đoạn 2: Advanced Logic

### 1. Backend (Rust)

* [ ] **BE-07:** Nâng cấp Schema: Thêm bảng/cột cho `Guests` và `SplitStrategy` (Equal, Share, Exact).
* [ ] **BE-08:** Refactor API `Bill`:
* Nhận vào danh sách `split_details` (Ai chịu bao nhiêu).
* Validate tổng tiền split == tổng tiền Bill.


* [ ] **BE-09:** Nâng cấp Logic Chia Tiền: Thuật toán Simplify Debts (Tối ưu hoá đồ thị nợ để giảm số lượng giao dịch).
* [ ] **BE-10:** API Settlement: Endpoint `POST /settle` (Xác nhận đã trả tiền). Sử dụng Database Transaction (`sqlx::Transaction`) để đảm bảo an toàn.

### 2. Frontend (React)

* [ ] **FE-07:** Nâng cấp Form "Thêm Hoá Đơn":
* UI phức tạp hơn: Toggle chọn người tham gia bill, nhập số tiền riêng cho từng người (nếu cần).


* [ ] **FE-08:** UI xử lý Guest: Cho phép nhập tên Guest khi add member, hiển thị Guest trong danh sách nợ.
* [ ] **FE-09:** Flow Thanh toán: Nút "Báo đã trả tiền" -> Hiển thị trạng thái "Chờ xác nhận" -> Chủ nợ bấm "Confirm".

---

## 🚀 Giai đoạn 3: Pre-Mobile & Deploy

### 1. Backend & DevOps

* [ ] **BE-11:** Tích hợp `utoipa` hoặc `swagger-ui` để sinh tài liệu API tự động cho team Mobile sau này.
* [ ] **BE-12:** Error Handling chuẩn: Trả về mã lỗi thống nhất (VD: `E_USER_NOT_FOUND`, `E_BILL_INVALID`) để Client dễ handle.
* [ ] **OPS-01:** Viết Dockerfile tối ưu (Multi-stage build) cho Rust binary (nhắm mục tiêu image size < 100MB).
* [ ] **OPS-02:** Thiết lập CI (GitHub Actions): Tự động chạy `cargo test` và `cargo clippy`.
* [ ] **OPS-03:** Deploy lên Cloud (Render/Railway). Setup biến môi trường (ENV) an toàn.

### 2. Frontend

* [ ] **FE-10:** Mobile Responsiveness: Kiểm tra kỹ giao diện trên màn hình điện thoại (CSS Flexbox/Grid).
* [ ] **FE-11:** Loading State & Error UI: Thêm Skeleton loading, thông báo lỗi đẹp (Toast notification).

---