# SplitBuddy Codebase Summary (Living Document)

**Last Updated:** 2026-05-31 (triệt để deep review)  
**Status:** Current single source of truth for project state  
**Source:** Synthesized from CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md + exhaustive direct tooling + subagent audits (god objects, 33 migrations, 74 .sqlx, 19 docs, all api/domain/repo, frontend contexts/pages/components, security/infra/CI).

## 1. Project Overview
SplitBuddy là ứng dụng web chia tiền nhậu cho nhóm bạn Việt Nam (real-time sessions, debts, VietQR payments, gamification, recurring expenses, social feed, AI chat, personas/wrapped analytics, PWA).

- **Core Value:** Minh bạch công nợ, cấn trừ tự động, vui vẻ khi nhậu.
- **Tech Stack:** 
  - Backend: Rust (Axum 0.7, SQLx, rust_decimal, Argon2, web_push, tower-governor, jemalloc optional).
  - Frontend: React 18 + TypeScript + Vite + TanStack Query 5 + Axios + shadcn/ui (vintage paper theme) + decimal.js (hiện tại chỉ display).
  - DB: PostgreSQL 16 (33 migrations).
  - Cache/WS: HybridCache (local + Redis), native WS + ticket.
  - Infra: Docker 5-stage, Heroku (Postgres + Redis optional), GitHub Actions path-filter.
- **Key Features Status (2026-05-31):**
  | Feature              | Backend | Frontend | Notes / Debt |
  |----------------------|---------|----------|--------------|
  | Sessions + Bills + Debts + Netting | Good (Decimal core) | Good (optimistic heavy any) | God objects |
  | Recurring Expenses   | Partial (f64 critical bug) | Partial | P0 money safety |
  | Real-time WS + Push  | Good (ticket) | Good (invalidation) | VAPID expects, Redis deprecated |
  | VietQR Payments      | Partial | Partial | transactions table exists |
  | Games + Gamification | Good | Good | Many dead_code |
  | Personas + Wrapped + Analytics | Partial | Partial | f64 in wrapped |
  | Social Feed          | Exists (20260118 migration) | Partial | UI incomplete? |
  | AI (Gemini)          | Exists | Exists | Stub level? |
  | Admin + Feature Flags| Exists | Polling | Client-only enforcement |
  | Uploads (avatar/receipt/QR) | Strong (magic bytes + size) | Good | GET authz? deletion? |
  | Templates            | Exists | Exists | Low adoption |

## 2. Current Architecture Reality vs Ideal
- **Intended (AGENTS + PROJECT_GUIDELINES + Architecture Plan):** DDD (api thin handlers, domain business + Decimal models, repository per-entity), files <200 LOC, no unwrap/any/f64 money, Envelope response + request_id everywhere, strict TS, Context chỉ UI global.
- **Reality (triệt để audit):** 
  - 2 god objects: backend/src/repository/session_repo.rs (2059 LOC), backend/src/api/sessions/mod.rs (~1886 LOC) – vi phạm nặng modularize rule.
  - Recurring money: toàn f64 (domain:50, repo, api, scheduler) dù DB DECIMAL – P0 financial risk.
  - Frontend: 46+ `any` (SessionDetailPage 18+ in core bill optimistic flow), decimal.js chỉ dùng format (không calc).
  - 40+ #[allow(dead_code)] trên 25 files (WIP + stubs + refactor dang dở).
  - Docs drift khổng lồ (15+ obsolete plans, branch "develop" vs "dev", missing standard docs).
  - CORS fallback Any khi thiếu config.
  - VAPID .expect/.unwrap trong push_service.
  - Positive: RealIp rate limit (proxy-aware), magic-byte uploads (5/10MB), WS ticket replay protection, N+1 batch fixes, pool tuning, admin bootstrap Argon2, CI path-filter + sccache/mold/nextest.

## 3. Critical Tech Debt (P0)
1. Recurring f64 → Decimal (domain/recurring_expense.rs:35,50 + scheduler + repo + api + tests) + fix .unwrap() date (80,82) + .first().unwrap() (scheduler:379).
2. Eliminate any trong SessionDetailPage.tsx bill/debt optimistic (134,143,162,164,167,169,179,196...) + adopt Decimal từ decimal.js cho money calc.
3. Unwrap/expect prod (52 instances, 11 files – recurring 21, main 7, split_calculator 5...).
4. Start modularize 2 god objects.
5. Fix CORS Any fallback + VAPID validation startup + uploads GET authz/deletion.

## 4. Key Modules & Entry Points
- **Backend Entry:** main.rs (middleware stack: RealIp + governor rate, CORS configurable, request_id, compression, static SPA, admin bootstrap, recurring scheduler spawn, WS manager, HybridCache).
- **Core Money:** domain/split_calculator.rs (Decimal excellence + tests).
- **Recurring Heart:** scheduler.rs + domain/recurring_expense.rs + recurring_expense_repo.rs + api/recurring_expenses.rs.
- **Real-time:** api/ws.rs + frontend WebSocketContext.tsx (ticket, invalidation on BillUpdated/DebtsRecalculated...).
- **Frontend Money UI Risk:** pages/SessionDetailPage.tsx + lib/api.ts (any + parseFloat).
- **Security Strong:** uploads.rs (magic bytes + per-type size + user prefix).
- **Admin:** api/admin.rs (users, feature flags toggle, music 50MB, audit logs).

## 5. Data & Migrations
- 33 migrations (202312 initial → 20260118000003_social_feed).
- Heavy 2026-01 expansion: recurring (DECIMAL correct), payments/transactions, social_feed, personas, audit, templates, uploads enhancements, currency, participant flags.
- .sqlx/ 74 queries (offline build ok, cần verify freshness post-20260118 migrations).
- Snapshots JSONB mismatch với code structs ở recurring.

## 6. Testing & Quality
- Backend: cargo test / nextest (split_calculator + recurring dates + repos tốt; handlers thin).
- Frontend: npm run type-check + build (pass dù any 'warn' trong ESLint).
- CI: path-filter, parallel lint/test, Trivy on main, revert sync.
- Gaps: scheduler edges, recurring money fractional, FE integration/e2e, handler coverage.

## 7. Deployment & Ops
- Local: docker-compose (Postgres + Redis), make dev-*
- Prod: Heroku (container), Postgres addon, Redis optional (WS pubsub/cache).
- Health: /api/health.
- Monitoring: Prometheus (main), structured logging + request_id.
- Rollback: revert branch auto-sync.

## 8. Risks for Future Development (Highest First)
- Money precision bugs từ recurring f64 + FE parseFloat/any.
- Unmaintainable monoliths (god objects) → bug escape + slow feature.
- Docs lie → wrong assumptions khi dev.
- Client-only feature flags + CORS fallback → security surface.
- Scheduler panic risk + VAPID expects → background job crash.

**Recommendation:** Fix P0 (money + unwrap + any in core UI) + begin god object modularization BEFORE adding payments mở rộng, analytics sâu, multi-group, AI nâng cao, v.v.

---

**Next:** Xem CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md (P0-P2 exact file:line + full findings) + system-architecture.md + project-roadmap.md (đang tạo).

Báo cáo này là living document – cập nhật sau mỗi phase refactor hoặc feature lớn.