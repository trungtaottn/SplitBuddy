# SplitBuddy Project Roadmap (Living Document)

**Last Updated:** 2026-05-31 (sau triệt để toàn bộ codebase)  
**Phương châm:** Fix debt P0 trước, sau đó mới scale feature. Không thêm tính năng mới khi nền tảng còn rủi ro tiền + maintainability 0.

**Nguồn:** Tổng hợp từ CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md (Section 10 P0-P2 exact file:line) + 3 standard docs + exhaustive audit (god objects, recurring f64, any frontend, 40+ dead_code, docs drift, security surface).

## 1. Current State (2026-05-31)
- **Strengths:** Decimal excellence ở split_calculator, WS ticket protection, magic-byte uploads (strong), CI path-filter + caching tối ưu (sccache/mold/nextest), pool tuning, RealIp rate limit, admin bootstrap Argon2, N+1 batch fixes trong repo.
- **Critical Risks (P0):**
  - Recurring expenses dùng f64 toàn bộ (domain, repo, api, scheduler) → sai lệch tiền thật khi chạy production.
  - 52+ unwrap/expect trong prod paths (recurring 21, main 7...).
  - 46+ `any` trong frontend, đặc biệt SessionDetailPage core bill/debt optimistic (parseFloat + any = money risk).
  - 2 god objects >1800 LOC (vi phạm CLAUDE guideline >200 LOC phải modularize).
  - 40+ #[allow(dead_code)] + docs lie (15+ obsolete plans, branch drift).
- **Feature Maturity:** Core (sessions/bills/debts) ổn; recurring/feed/payments/personas/social/Wrapped/AI/admin partial + buggy.

**Không nên:** Thêm payments mở rộng, analytics sâu, multi-group, AI nâng cao, social feed đầy đủ... trước khi P0 fix.

## 2. Phased Plan (P0 → P2 → Features)

### Phase 0: Stabilization (1-2 tuần ngay lập tức) – P0 Critical
**Mục tiêu:** Loại bỏ rủi ro tiền + crash + type safety. Make check pass sạch.

**Tasks (exact file:line từ audit):**
1. **Money Safety Recurring (Highest Priority)**
   - domain/recurring_expense.rs:35,50 → đổi f64 thành Decimal (custom_amounts HashMap<Uuid, Decimal>).
   - recurring_expense_repo.rs:29,164 + queries → Decimal.
   - api/recurring_expenses.rs (20+ chỗ f64 + .unwrap_or(false)) → Decimal + proper validation.
   - scheduler.rs:116 (RecurringExpenseRow), 324-325 (from_str hack + 1.0 rate) → Decimal + inject forex service thật.
   - Update tests, responses, snapshots JSONB handling.
   - Data migration script nếu cần (DECIMAL schema đã đúng).

2. **Unwrap/Expect Elimination**
   - recurring_expense.rs:80,82 (date .unwrap() trong is_expired).
   - scheduler.rs:379 (participants.first()...unwrap()).
   - main.rs (7 places: parse headers, expect governor/metrics/signals).
   - push_service.rs (VAPID .expect 106,117 + build).
   - split_calculator.rs (5 to_i128 unwrap_or).
   - Thay bằng AppError + proper ? + logging + request_id.

3. **Frontend Type Safety + Decimal Adoption (Core Money UI)**
   - SessionDetailPage.tsx:134,143,162,164,167,169,179,196,219,224,238,240,243,245,257,304,313,394 (any trong createBill/update optimistic + parseFloat total).
   - lib/api.ts:13-14,54-55,70 (any DTOs).
   - RecurringExpenses.tsx + ImportExportModal (5+ onError any).
   - Adopt Decimal từ 'decimal.js' cho **tất cả** amount handling (bill creation, optimistic total, debt maps, recurring UI) – không chỉ formatCurrency.ts.
   - Update types/api.ts cho strict (amount: string từ backend).

4. **Dead Code Quick Wins**
   - Audit & xóa/implement 40+ allow (bắt đầu recurring domain 5+, cache/, session submodules, bills.rs stub, personas partial).
   - Xóa hoặc feature-flag rõ ràng các WIP (templates, một số admin, feed stubs).

**Verification Phase 0:**
- `make check` (backend clippy -D warnings + nextest + frontend type-check + build) sạch.
- Manual test recurring với 0.01 / 123.45 / fractional VND.
- Tạo bill optimistic trong UI → check total/debt chính xác (không any, dùng Decimal).
- Load test scheduler + WS basic.

**Deliverable:** PR vào dev, 1 review, CI pass, update CODEBASE_DEEP_REVIEW + 3 standard docs.

### Phase 1: Foundation & Modularization (2-4 tuần)
**Mục tiêu:** Tăng maintainability, security surface closure, consistent patterns.

1. **Modularize God Objects (theo pattern sessions/ subdir đã có)**
   - Tách session_repo.rs 2059 LOC → bills, debts, participants, export, pagination modules (kebab-case descriptive).
   - Tách api/sessions/mod.rs ~1886 LOC.
   - Enforce file size limit trong CI (script hoặc clippy custom).

2. **Decouple Scheduler**
   - Loại api DTO leak (PayerInput...).
   - Inject forex/http client.
   - Thêm jitter, metrics, better error isolation (không crash toàn bộ job).
   - Hardcoded 1.0 rate → real forex hoặc config rõ ràng.

3. **Security & Infra Hardening**
   - CORS: loại bỏ Any fallback, enforce origins trong prod (config + panic nếu empty?).
   - VAPID: validation startup (không expect trong push_service).
   - Rate limit: xem xét per-user + IP (hiện tại chỉ IP).
   - Uploads: authz trên GET static serve, deletion endpoint + ownership, size limits enforce ở middleware.
   - Admin: enforce role claims + audit mọi action.
   - Feature flags: backend enforcement (nếu critical).

4. **WS & Real-time Polish**
   - Update deprecated redis calls trong ws.rs.
   - RwLock contention → better concurrency.
   - Ticket replay window rõ ràng hơn.
   - Full push integration từ recurring/scheduler.

5. **HybridCache + Duplication**
   - Complete adoption + central invalidation helper.
   - Xóa duplication authz/participant checks (tạo helper domain hoặc middleware).

**Verification:** make check + manual flows (recurring full + WS + push + admin) + load test.

### Phase 2: Feature Completion & Polish (sau P0/P1 ổn định)
- Hoàn thiện recurring (exceptions UI, editing, history).
- Social feed + payments VietQR đầy đủ (UI + backend).
- Personas editor + Wrapped + Analytics sâu (thay f64 bằng Decimal).
- Games mở rộng + custom questions tốt hơn.
- AI chat nâng cao + context.
- Templates + import/export cải tiến.
- PWA offline + haptics + install prompt đầy đủ.
- Test coverage: scheduler edges, money property tests, FE integration.

### Phase 3+: Scale & Long-term (6+ tháng)
- Money newtype (Amount) thay vì raw Decimal.
- Distributed scheduler lock (nếu scale nhiều instance).
- Per-user rate limiting + advanced observability (cache hit rates, scheduler metrics, error budgets).
- Upload virus/malware scan.
- Multi-currency thật (forex service production).
- Mobile app (React Native?) hoặc PWA first-class.
- Admin dashboard đầy đủ + user impersonation (audit trail).
- Internationalization (nếu mở rộng).

## 3. Milestones & Gates
- **M0 (ngay):** P0 money + unwrap + any FE fix → "Stabilization complete" tag.
- **M1 (4-6 tuần):** God objects <500 LOC mỗi file, scheduler decoupled, security surface closed → "Foundation solid".
- **M2 (3 tháng):** 80% feature completeness theo original vision (recurring + feed + payments + personas + wrapped đầy đủ).
- **M3 (6 tháng):** Production-ready scale (Redis Heroku, metrics, rollback drills).

**Gates trước mỗi phase:**
- make check 100% pass.
- Manual critical flows test (money, recurring, WS, admin).
- Update all 4 docs (deep review + 3 standard).
- At least 1 review + CI green.
- No new major debt introduced.

## 4. Resource & Risk
- **Risk cao nhất:** Dev tiếp tục thêm feature mà không fix P0 → bug tiền thật + technical debt không kiểm soát.
- **Mitigation:** Enforce "P0 gate" trong PR template + CLAUDE.md update.
- **Team:** 1-2 dev focus debt 1-2 sprint, sau đó feature song song với refactor nhỏ.

## 5. Documentation & Process
- Mọi thay đổi lớn → update CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md + 3 standard docs.
- Commit: conventional (feat/fix/refactor/docs).
- Branch: feature/xxx từ dev → PR → dev → main (Heroku auto).
- Pre-commit + make check bắt buộc.

---

**Call to Action:** 
Sau khi Phase 0 hoàn thành, chúng ta mới có nền tảng vững chắc để phát triển SplitBuddy thành sản phẩm tốt nhất cho cộng đồng nhậu Việt Nam.

Xem chi tiết violations + file:line tại CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md.

Báo cáo này living – review lại mỗi sprint.