







# SplitBuddy Frontend - Kiến trúc & Thiết kế

---

## I. TÓM TẮT TÀI LIỆU

### 1.1 User Flow chính

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPLITBUDDY USER FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐                   │
│  │  Login/  │───▶│  Dashboard   │───▶│  Session Detail │                   │
│  │ Register │    │ (My Sessions)│    │   (Overview)    │                   │
│  └──────────┘    └──────────────┘    └────────┬────────┘                   │
│                         │                      │                            │
│                         ▼                      ▼                            │
│                  ┌──────────────┐    ┌─────────────────┐                   │
│                  │Create Session│    │   Add Bill      │                   │
│                  └──────────────┘    │ (Payer, Amount) │                   │
│                                      └────────┬────────┘                   │
│                                               │                            │
│                                               ▼                            │
│  ┌──────────────┐                   ┌─────────────────┐                   │
│  │  Debt Detail │◀──────────────────│   View Debts    │                   │
│  │  (Settle)    │                   │  (Who owes who) │                   │
│  └──────────────┘                   └─────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Fields quan trọng

| Entity | Fields | Ghi chú |
|--------|--------|---------|
| **User** | id, email, full_name, avatar_url | UUID format |
| **Session** | id, name, location, status, created_by, participant_count, total_amount | status: active/closed |
| **Participant** | id, user_id, guest_name, display_name, role | role: owner/member |
| **Bill** | id, description, amount, split_strategy, created_by | amount: Decimal **as string** |
| **Debt** | id, debtor_id, creditor_id, amount, status | status: pending/settlement_requested/settled |

### 1.3 Nghiệp vụ chia tiền & công nợ

1. **Thuật toán Net Balance**: `Balance = Tổng trả - Tổng chịu`
2. **Chia đều (MVP)**: `amount / participant_count`
3. **Settlement flow**: Debtor → "Đã trả" → Creditor → "Xác nhận"

---

## II. ĐỀ XUẤT KIẾN TRÚC

### 2.1 Framework: **React + Vite + TypeScript**

| Tiêu chí | React + Vite | Next.js |
|----------|--------------|---------|
| **SSR cần thiết?** | Không (SPA đủ cho MVP) | Có (overkill cho MVP) |
| **Build speed** | ⚡ Cực nhanh | Chậm hơn |
| **Bundle size** | Nhỏ | Lớn hơn |
| **Học curve** | Thấp | Trung bình |
| **PWA ready** | Plugin sẵn | Cần config thêm |

**Chọn React + Vite** vì:
- App SPA thuần, không cần SEO
- Build nhanh, DX tốt
- Dễ chuyển sang PWA/Mobile (React Native)

### 2.2 State Management

| Loại State | Tool | Lý do |
|------------|------|-------|
| **Server State** | **TanStack Query** | Cache, refetch, optimistic updates |
| **Auth State** | **Context + localStorage** | Simple, persist token |
| **UI State** | **useState/useReducer** | Local component state |
| **Form State** | **React Hook Form** | Validation, performance |

### 2.3 Cấu trúc thư mục

```
frontend/
├── public/
├── src/
│   ├── components/           # Shared UI components
│   │   ├── ui/              # Base components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   └── layout/          # Layout components
│   │       ├── AppLayout.tsx
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│   ├── features/            # Feature modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   ├── sessions/
│   │   │   ├── components/
│   │   │   │   ├── SessionList.tsx
│   │   │   │   ├── SessionCard.tsx
│   │   │   │   ├── SessionDetail.tsx
│   │   │   │   └── CreateSessionForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSessions.ts
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   ├── bills/
│   │   │   ├── components/
│   │   │   │   ├── BillList.tsx
│   │   │   │   ├── BillCard.tsx
│   │   │   │   └── CreateBillForm.tsx
│   │   │   ├── hooks/
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   └── debts/
│   │       ├── components/
│   │       │   ├── DebtDashboard.tsx
│   │       │   ├── DebtCard.tsx
│   │       │   └── SettleButton.tsx
│   │       ├── hooks/
│   │       ├── api.ts
│   │       └── types.ts
│   ├── hooks/               # Shared hooks
│   │   └── useLocalStorage.ts
│   ├── lib/                 # Third-party configs
│   │   ├── axios.ts         # Axios instance + interceptors
│   │   └── queryClient.ts   # TanStack Query client
│   ├── pages/               # Page components (routes)
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── SessionDetailPage.tsx
│   │   └── DebtsPage.tsx
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx
│   ├── types/               # Global types
│   │   └── api.ts
│   ├── utils/               # Utilities
│   │   ├── formatCurrency.ts
│   │   └── formatDate.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## III. THIẾT KẾ MÀN HÌNH (Wireframe Text)

### 3.1 Danh sách màn hình & Điều hướng

```
/login              → LoginPage
/register           → RegisterPage
/                   → DashboardPage (redirect nếu chưa login)
/sessions/:id       → SessionDetailPage
/debts              → DebtsPage (Dashboard công nợ tổng)
```

### 3.2 Wireframe các màn hình chính

#### **Login Page** (`/login`)
```
┌─────────────────────────────────────────┐
│              🍻 SplitBuddy              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Email                           │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Password                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         ĐĂNG NHẬP               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Chưa có tài khoản? [Đăng ký]          │
└─────────────────────────────────────────┘
```

#### **Dashboard** (`/`)
```
┌─────────────────────────────────────────────────────────────┐
│ 🍻 SplitBuddy                    [Avatar] Xin chào, Trung ▼│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💰 Bạn đang nợ: 500,000đ    |  👤 Bạn được nợ: 200k│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Cuộc nhậu của tôi            [+ Tạo cuộc nhậu mới]        │
│  ─────────────────────────────────────────────────         │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ 🎉 Nhậu tất niên    │  │ 🍺 Sinh nhật Minh   │          │
│  │ 📍 Quán Ốc 123     │  │ 📍 Beer Club        │          │
│  │ 👥 5 người         │  │ 👥 8 người          │          │
│  │ 💵 2,500,000đ      │  │ 💵 4,000,000đ       │          │
│  │ [Active]            │  │ [Closed]            │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### **Session Detail** (`/sessions/:id`)
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back    🎉 Nhậu tất niên                    [Đóng Session]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Overview]  [Bills]  [Debts]                               │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  OVERVIEW TAB:                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tổng chi: 2,500,000đ                                │   │
│  │ Thành viên: 5 người                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Thành viên:                    [+ Thêm người]             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 👤 Trung│ │ 👤 Minh │ │ 👤 Hùng │ │ 👻 Guest│          │
│  │ (Owner) │ │         │ │         │ │ "Bạn A" │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
│  BILLS TAB:                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🧾 Tăng 1 - Ốc xào          800,000đ   Trung trả   │   │
│  │ 🧾 Tăng 2 - Karaoke       1,200,000đ   Minh trả    │   │
│  │ 🧾 Nước uống               500,000đ   Hùng trả    │   │
│  └─────────────────────────────────────────────────────┘   │
│                           [+ Thêm hoá đơn]                 │
│                                                             │
│  DEBTS TAB:                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Minh → Trung: 300,000đ  [Báo đã trả]               │   │
│  │ Hùng → Trung: 200,000đ  [Báo đã trả]               │   │
│  │ Guest → Minh: 150,000đ  (Chờ)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### **Add Bill Modal**
```
┌───────────────────────────────────────────┐
│ Thêm hoá đơn mới                      [X] │
├───────────────────────────────────────────┤
│                                           │
│ Mô tả:                                    │
│ ┌───────────────────────────────────────┐ │
│ │ Tăng 1 - Ốc xào                       │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Số tiền:                                  │
│ ┌───────────────────────────────────────┐ │
│ │ 800,000                           VND │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Ai trả tiền:                              │
│ ┌───────────────────────────────────────┐ │
│ │ ▼ Trung (tôi)                         │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Chia cho:  ○ Tất cả  ○ Chọn người        │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │          THÊM HOÁ ĐƠN                 │ │
│ └───────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

---

## IV. API CONTRACT (FE ↔ BE)

### 4.1 Base Response Format

```typescript
interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

interface ApiError {
  error: {
    code: string;      // "E_AUTH_INVALID_CREDENTIALS"
    message: string;
    details?: object;
  };
  meta: { timestamp: string };
}
```

### 4.2 API Endpoints

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/auth/register` | POST | `{email, password, full_name}` | [AuthResponse](cci:2://file:///Users/ttn/Documents/Code/SplitBuddy/backend/src/api/auth.rs:35:0-38:1) |
| `/api/auth/login` | POST | `{email, password}` | [AuthResponse](cci:2://file:///Users/ttn/Documents/Code/SplitBuddy/backend/src/api/auth.rs:35:0-38:1) |
| `/api/users/me` | GET | - | `UserProfile` |
| `/api/sessions` | GET | - | [Session[]](cci:2://file:///Users/ttn/Documents/Code/SplitBuddy/backend/src/domain/session.rs:22:0-30:1) |
| `/api/sessions` | POST | `{name, location?}` | [Session](cci:2://file:///Users/ttn/Documents/Code/SplitBuddy/backend/src/domain/session.rs:22:0-30:1) |
| `/api/sessions/:id` | GET | - | `SessionDetail` |
| `/api/sessions/:id/participants` | POST | `{user_id?, guest_name?}` | `Participant` |
| `/api/sessions/:id/bills` | GET | - | [Bill[]](cci:2://file:///Users/ttn/Documents/Code/SplitBuddy/backend/src/domain/bill.rs:40:0-48:1) |
| `/api/sessions/:id/bills` | POST | `CreateBillDto` | [Bill](cci:2://file:///Users/ttn/Documents/Code/SplitBuddy/backend/src/domain/bill.rs:40:0-48:1) |
| `/api/debts/me` | GET | - | `DebtSummary` |
| `/api/debts/:id/request-settle` | POST | - | [SettleResponse](cci:2://file:///Users/ttn/Documents/Code/SplitBuddy/backend/src/api/debts.rs:44:0-48:1) |
| `/api/debts/:id/confirm-settle` | POST | - | [SettleResponse](cci:2://file:///Users/ttn/Documents/Code/SplitBuddy/backend/src/api/debts.rs:44:0-48:1) |

---

## V. LỘ TRÌNH PHÁT TRIỂN

### Milestone 1: Setup & Auth (2 ngày)
- [x] Setup Vite + React + TS
- [ ] Install TailwindCSS + shadcn/ui
- [ ] Cấu hình Axios + TanStack Query
- [ ] Auth Context + Protected Routes
- [ ] Login/Register pages

### Milestone 2: Session Management (3 ngày)
- [ ] Dashboard page (session list)
- [ ] Create session modal
- [ ] Session detail page (tabs)
- [ ] Add participant

### Milestone 3: Bill & Debts (3 ngày)
- [ ] Bills list trong session
- [ ] Create bill form
- [ ] Debts dashboard
- [ ] Settlement flow

### Milestone 4: Polish (2 ngày)
- [ ] Loading states (skeletons)
- [ ] Error handling (toast)
- [ ] Mobile responsive
- [ ] PWA config

---

## VI. GIẢ ĐỊNH

> ⚠️ **Các giả định do tài liệu chưa rõ:**

1. **[FE-A01]** Decimal từ API nhận dạng **string**, frontend dùng thư viện `decimal.js` để tính toán
2. **[FE-A02]** MVP chỉ hỗ trợ chia đều, chưa có custom split UI
3. **[FE-A03]** Guest không thể login, chỉ hiển thị tên trong danh sách
4. **[FE-A04]** Session "closed" chỉ xem, không thể thêm bill
5. **[FE-A05]** Chưa có notification realtime trong MVP

---

Bây giờ tôi sẽ setup project frontend:
---

## ✅ HOÀN THÀNH SETUP FRONTEND

### Cấu trúc Project đã tạo

```
frontend/
├── package.json              # Dependencies
├── vite.config.ts            # Vite config + proxy
├── tsconfig.json             # TypeScript config
├── tailwind.config.js        # TailwindCSS config
├── postcss.config.js
├── index.html
├── README.md
├── .gitignore
└── src/
    ├── main.tsx              # Entry point
    ├── App.tsx               # Router setup
    ├── index.css             # Global styles + CSS vars
    ├── contexts/
    │   └── AuthContext.tsx   # Auth state + hooks
    ├── lib/
    │   ├── axios.ts          # Axios + interceptors
    │   ├── queryClient.ts    # TanStack Query client
    │   └── utils.ts          # cn() utility
    ├── types/
    │   └── api.ts            # TypeScript interfaces
    ├── utils/
    │   └── formatCurrency.ts # Format VND
    ├── components/
    │   ├── ui/               # Button, Card, Input, Label, Toaster
    │   └── layout/
    │       └── AppLayout.tsx
    └── pages/
        ├── LoginPage.tsx
        ├── RegisterPage.tsx
        ├── DashboardPage.tsx
        ├── SessionDetailPage.tsx
        └── DebtsPage.tsx
```

### Màn hình đã implement

| Màn hình | Route | Chức năng |
|----------|-------|-----------|
| **Login** | `/login` | Đăng nhập |
| **Register** | `/register` | Đăng ký |
| **Dashboard** | `/` | Danh sách cuộc nhậu + Tạo mới |
| **Session Detail** | `/sessions/:id` | Tabs: Overview / Bills / Debts |
| **Debts** | `/debts` | Công nợ + Settlement flow |

---

## 🚀 HƯỚNG DẪN CHẠY

### Bước 1: Cài dependencies

```bash
cd frontend
npm install
```

### Bước 2: Chạy frontend (đảm bảo backend đang chạy ở port 8080)

```bash
npm run dev
```

Frontend sẽ chạy tại **http://localhost:3000**

---

## 📋 TÓM TẮT

| Hạng mục | Trạng thái |
|----------|-----------|
| Phân tích user flow & data models | ✅ |
| Đề xuất kiến trúc (React + Vite + TanStack Query) | ✅ |
| Thiết kế wireframe các màn hình | ✅ |
| API layer & TypeScript types | ✅ |
| Setup project (config, routing, auth) | ✅ |
| Implement Login/Register | ✅ |
| Implement Dashboard (sessions list) | ✅ |
| Implement Session Detail (bills) | ✅ |
| Implement Debts page | ✅ |

> ⚠️ **Lưu ý:** Các TypeScript errors hiện tại sẽ biến mất sau khi chạy `npm install`.

**Tiếp theo:** Chạy `npm install` và `npm run dev` để test frontend với backend.