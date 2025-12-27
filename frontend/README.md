# SplitBuddy Frontend

Ứng dụng web chia tiền nhậu - Ghi nhận chi tiêu nhóm và quản lý công nợ.

## Tech Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **State Management:** TanStack Query (server state)
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Form:** React Hook Form + Zod

## Cấu trúc thư mục

```
src/
├── components/         # Shared UI components
│   ├── ui/            # Base components (shadcn/ui)
│   └── layout/        # Layout components
├── features/          # Feature modules (future)
├── pages/             # Page components
├── contexts/          # React contexts
├── lib/               # Third-party configs
├── types/             # TypeScript types
├── utils/             # Utility functions
├── App.tsx
└── main.tsx
```

## Setup

### 1. Cài đặt dependencies

```bash
cd frontend
npm install
```

### 2. Chạy development server

```bash
npm run dev
```

Frontend sẽ chạy tại **http://localhost:3000**

### 3. Build production

```bash
npm run build
```

## Màn hình chính

| Route | Màn hình | Mô tả |
|-------|----------|-------|
| `/login` | Login | Đăng nhập |
| `/register` | Register | Đăng ký tài khoản |
| `/` | Dashboard | Danh sách cuộc nhậu |
| `/sessions/:id` | Session Detail | Chi tiết cuộc nhậu |
| `/debts` | Debts | Công nợ tổng hợp |

## API Endpoints (Backend)

Frontend kết nối với backend qua proxy `/api` → `http://localhost:8080`

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập

### Sessions
- `GET /api/sessions` - Danh sách cuộc nhậu
- `POST /api/sessions` - Tạo cuộc nhậu
- `GET /api/sessions/:id` - Chi tiết cuộc nhậu
- `POST /api/sessions/:id/participants` - Thêm người
- `GET /api/sessions/:id/bills` - Danh sách hoá đơn
- `POST /api/sessions/:id/bills` - Thêm hoá đơn

### Debts
- `GET /api/debts/me` - Công nợ của tôi
- `POST /api/debts/:id/request-settle` - Báo đã trả
- `POST /api/debts/:id/confirm-settle` - Xác nhận đã nhận

## Environment

Tạo file `.env` (optional):

```env
VITE_API_URL=http://localhost:8080
```

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```
