# SplitBuddy System Architecture (Living Document)

**Last Updated:** 2026-05-31 (sau triệt để deep review toàn bộ)  
**Aligned with:** CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md + 33 migrations + all source + AGENTS.md + PROJECT_GUIDELINES.md

## 1. High-Level Architecture
SplitBuddy là monolithic web app (SPA + API) với real-time và background jobs, optimized cho nhóm bạn nhậu Việt Nam.

```
Users (Mobile/Desktop Browser + PWA)
    ↓ (HTTPS + JWT)
Frontend (React 18 + Vite + TanStack Query + WS native)
    ↓ (Axios + optimistic + WS invalidation)
Backend (Rust Axum 0.7)
    ├── HTTP Layer (tower-http: CORS configurable, rate governor RealIp, request_id, compression)
    ├── Auth Middleware (JWT + Argon2, role claims)
    ├── API Handlers (api/ - 27 files, sessions/ subdir)
    ├── Domain Logic (domain/ - 7 files, Decimal core in split_calculator)
    ├── Repository (repository/ - 13 files + session/ sub)
    ├── Scheduler (recurring expenses background)
    ├── Services (push_service VAPID)
    ├── Cache (HybridCache local + Redis)
    ├── WS Manager (ticket single-use + events)
    └── DB (PostgreSQL via SQLx + .sqlx offline 74 queries)
```

**Deployment:** Docker 5-stage (chef) → Heroku container. Postgres + Redis (optional for WS scale).

## 2. Layering (Intended DDD vs Reality 2026)
**Intended (PROJECT_GUIDELINES + AGENTS + Architecture Plan 2024-2025):**
- api/ : thin handlers + DTOs only
- domain/ : pure business logic + models (Decimal cho money, no DB)
- repository/ : SQLx queries per entity, no business logic
- File <200 LOC, clear boundaries

**Reality (triệt để audit):**
- **Heavy drift** → pragmatic growth:
  - 2 god objects (session_repo.rs 2059 LOC chứa bills/debts/participants/export/pagination/batch; api/sessions/mod.rs ~1886 LOC handlers + leaked logic).
  - Logic rò rỉ: scheduler import api DTOs (PayerInput), recurring business ở nhiều layer.
  - sessions/ subdir đã bắt đầu tách (bills/debts/participants) – positive pattern cần nhân rộng.
- **Money Layer (Critical):**
  - Good: domain/split_calculator.rs (rust_decimal + MidpointAwayFromZero + remainder distribution + tests).
  - Bad: recurring toàn f64 (domain:50, repo, api, scheduler:116) → DB DECIMAL bị taint.
  - Frontend: decimal.js chỉ formatCurrency.ts; SessionDetailPage dùng any + parseFloat (P0 UI money risk).
- **Real-time Layer:**
  - Backend: api/ws.rs (ticket consume single-use, events to Redis? deprecated calls noted).
  - Frontend: WebSocketContext.tsx (reconnect exponential, handleEvent invalidate TanStack keys on BillUpdated/DebtsRecalculated/ParticipantChanged/Presence... + optimistic sync).
  - Positive: strong invalidation strategy cho optimistic.
- **Background Jobs:**
  - scheduler.rs (cron-like recurring, per-item tx, snapshots JSONB, exceptions table, idempotency via last_run, FOR UPDATE).
  - Spawn từ main.rs.
  - Risk: f64 + .first().unwrap() + hardcoded fx rate 1.0 + no jitter.
- **Caching:**
  - HybridCache (local in-memory + Redis optional) – design tốt nhưng adoption không nhất quán + nhiều dead_code.
- **Auth & Security:**
  - JWT (7d refresh, SHA256 hash DB), Argon2.
  - Rate: tower-governor + custom RealIpKeyExtractor (CF/Nginx/Heroku aware) – excellent.
  - Uploads: magic bytes (jpg/png/gif/webp) + size (5MB avatar/QR, 10MB receipt) + user-prefixed – very strong.
  - CORS: configurable from env, fallback Any + warn (risk).
  - Admin bootstrap: Argon2 on startup from ADMIN_DEFAULT_PASSWORD (prod must set).
  - Feature flags: DB + polling FE (client-only enforcement – bypassable).
- **Error & Response:**
  - AppError + thiserror + structured codes (E_...).
  - ApiResponse envelope (data + meta) – nhưng report chỉ ra mismatch với GUIDELINES (request_id trên success?).

## 3. Critical Data Flows (End-to-End)
1. **Bill → Debt → Netting:**
   - Create bill (optimistic any in FE → Decimal backend → split_calculator → bill_payers + bill_split_details + debts insert).
   - WS event → TanStack invalidate → debt recalc (netting logic ở repo?).
   - Close session → finalise debts.

2. **Recurring (Highest Risk Flow):**
   - Config (api/recurring + domain f64) → DB (DECIMAL + JSONB snapshots + exceptions).
   - Scheduler (every X s) → query active + next_run ≤ now → FOR UPDATE → calculate (f64 hack + 1.0 rate) → create bill/debts → update last_run/next_run + snapshot.
   - Trigger WS + push? (incomplete in current audit).
   - Idempotency + exceptions good on paper.

3. **Real-time + Push:**
   - Ticket issued (single-use consume).
   - Client WS connect + subscribe session → server broadcast events.
   - Events invalidate RQ + update presence.
   - Push (VAPID) for offline (subscriptions table, clean 410/404).

4. **Authz:**
   - Claims in JWT (role).
   - Per-handler checks (ownership user_id vs participant, admin role).
   - Duplication nhiều (4-5x participant/session ownership) – cần central helper.

## 4. Key Tradeoffs & Decisions
- **Monolithic + God Objects:** Speed of feature delivery ban đầu → hiện tại maintainability thấp. Cần refactor theo sessions/ subdir pattern.
- **Decimal ở core nhưng f64 recurring:** Technical debt từ phase mở rộng 2026-01.
- **Native WS + RQ invalidation:** Đơn giản, hiệu quả cho SPA; không cần GraphQL/ subscription phức tạp.
- **Redis optional:** Local dev dễ, scale WS cần Redis pubsub (Heroku addon).
- **Client feature flags:** Tốt cho rollout nhanh, rủi ro bypass (cần backend enforcement nếu critical).
- **Magic bytes uploads:** Rất tốt so với chỉ content-type.

## 5. Gaps & Recommendations (từ Deep Review)
- P0: Fix recurring money + unwraps + FE any/Decimal adoption.
- P1: Modularize god objects, decouple scheduler, full authz pass, WS hardening, HybridCache consistent.
- Long-term: Money newtype, distributed scheduler lock, per-user rate + observability, virus scan uploads, backend feature flag enforcement.

## 6. Diagrams (Text-based)
**Recurring Execution (simplified):**
Scheduler → query active → tx (FOR UPDATE) → calc (f64 risk) → insert bill + debts + snapshot → update next_run → WS event + push?

**WS + Optimistic:**
FE mutate optimistic (any risk) → API (Decimal) → WS broadcast → all clients invalidate → consistent.

---

**References:** 
- CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md (P0-P2 + violations exact file:line)
- codebase-summary.md (feature status table)
- All 33 migrations + .sqlx
- PROJECT_GUIDELINES.md (ideal DDD + Decimal + no unwrap/any)

Báo cáo này living – cập nhật sau mỗi refactor lớn hoặc thay đổi architecture.