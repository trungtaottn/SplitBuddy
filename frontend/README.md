# SplitBuddy Frontend

Ứng dụng web chia tiền nhậu - Ghi nhận chi tiêu nhóm và quản lý công nợ.

## Tech Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **State Management:** TanStack Query v5 (server state)
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Form:** React Hook Form + Zod
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Design System

Ứng dụng sử dụng **Vintage Paper Monochrome** theme:
- Font: JetBrains Mono (monospace)
- Palette: Sepia/parchment tones
- Style: Typewriter-on-aged-paper aesthetic

Chi tiết xem trong `src/index.css` và memory design system.

## Cấu trúc thư mục

```
src/
├── components/           # Shared UI components
│   ├── ui/              # Base components (shadcn/ui customized)
│   │   ├── button.tsx   # Button variants (typewriter, stamp, etc.)
│   │   ├── card.tsx     # Card variants (paper, note, receipt)
│   │   ├── input.tsx    # Vintage input styles
│   │   └── ...
│   ├── layout/          # Layout components
│   │   └── AppLayout.tsx
│   ├── FunTooltip.tsx   # Fun tooltips with random messages
│   └── PageTransition.tsx
├── pages/               # Page components
│   ├── DashboardPage.tsx    # Danh sách cuộc nhậu
│   ├── SessionDetailPage.tsx # Chi tiết session + bills
│   ├── DebtsPage.tsx        # Công nợ cá nhân
│   ├── GroupsPage.tsx       # Quản lý nhóm
│   ├── GroupDebtsPage.tsx   # Công nợ nhóm
│   ├── GamesPage.tsx        # Mini games
│   ├── ProfilePage.tsx      # Profile & avatar
│   ├── AdminPage.tsx        # Admin dashboard
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state
├── hooks/               # Custom hooks
├── lib/                 # Third-party configs
│   ├── axios.ts         # Axios instance with interceptors
│   └── utils.ts         # cn() utility
├── types/               # TypeScript types
│   └── api.ts           # API response types
├── utils/               # Utility functions
│   └── formatCurrency.ts
├── App.tsx              # Router setup
└── main.tsx             # Entry point
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

Frontend sẽ chạy tại **http://localhost:5173**

### 3. Build production

```bash
npm run build
```

## Routes

| Route | Page | Mô tả |
|-------|------|-------|
| `/login` | LoginPage | Đăng nhập |
| `/register` | RegisterPage | Đăng ký tài khoản |
| `/` | DashboardPage | Danh sách cuộc nhậu, tạo session mới |
| `/sessions/:id` | SessionDetailPage | Chi tiết session, quản lý bills & participants |
| `/debts` | DebtsPage | Công nợ cá nhân (tổng hợp, theo session) |
| `/groups` | GroupsPage | Quản lý nhóm bạn nhậu |
| `/groups/:id/debts` | GroupDebtsPage | Công nợ trong nhóm |
| `/games` | GamesPage | Mini games (Truth or Dare, NHIE, Dice, Spin) |
| `/profile` | ProfilePage | Thông tin cá nhân, avatar, achievements |
| `/admin` | AdminPage | Admin dashboard (stats, users) |

## Key Features

### Dashboard
- Danh sách cuộc nhậu với filter (status, month, search)
- Tạo session mới (với group hoặc không)
- Quick stats (tổng nợ, được nợ)

### Session Detail
- Quản lý participants (thêm user từ group hoặc guest)
- CRUD bills với split strategies (equal, custom, weighted)
- Real-time debt calculation
- Close/Reopen session
- Export data
- Spin wheel game

### Debts Page
- Tab "Theo Session" - Chi tiết từng khoản nợ
- Tab "Tổng hợp" - Cấn trừ nợ thông minh (netting)
- Request settle / Confirm settle workflow
- Auto-settle cho guest debts

### Groups
- Quản lý thành viên nhóm
- Xem công nợ trong nhóm
- Simplified debts (cấn trừ tối ưu)

### Games
- Truth or Dare
- Never Have I Ever
- Challenges
- Dice rolling
- Spin wheel (lucky wheel)
- Custom questions
- Game history & stats

### Profile
- Avatar customization
- Achievements & badges
- XP & levels
- Wrapped stats (yearly summary)

## State Management

### TanStack Query
```typescript
// Fetch data
const { data, isLoading } = useQuery({
  queryKey: ['sessions'],
  queryFn: () => api.get('/sessions')
})

// Mutations with cache invalidation
const mutation = useMutation({
  mutationFn: (data) => api.post('/sessions', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
  }
})
```

### Auth Context
```typescript
const { user, login, logout, isAuthenticated } = useAuth()
```

## API Integration

API calls được wrap trong `lib/axios.ts`:
- Base URL từ env hoặc relative `/api`
- Auto attach JWT token từ localStorage
- Response/Error interceptors
- Token refresh handling

## Environment Variables

```env
VITE_API_URL=http://localhost:8080    # Backend API URL (optional, defaults to /api)
```

## Scripts

```bash
npm run dev       # Start dev server (port 5173)
npm run build     # Build for production
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
npm run type-check # Run TypeScript compiler check
```

## Code Conventions

### Components
- Functional components với TypeScript
- Props interface định nghĩa rõ ràng
- Use `cn()` utility cho conditional classes

### Styling
- TailwindCSS utilities
- Custom CSS variables trong `index.css`
- Responsive design với Tailwind breakpoints

### Data Fetching
- TanStack Query cho server state
- Mutations có onSuccess invalidate cache
- Loading states với Skeleton components

### Forms
- React Hook Form + Zod validation
- Controlled inputs
- Error display inline

## Troubleshooting

### CORS Issues
Đảm bảo backend cho phép origin `http://localhost:5173`

### Token Expired
App auto redirect về `/login` khi 401

### Build Errors
```bash
npm run type-check  # Check TypeScript errors
npm run lint        # Check ESLint errors
```
