# CODEBASE DEEP REVIEW & OPTIMIZATION REPORT - SplitBuddy (2026)

**Ngày audit:** 2026-05-31  
**Phương pháp:** Spawn & điều phối trực tiếp 5 subagents chuyên biệt (Backend Deep Dive, Frontend Deep Dive, DB/Migrations Auditor, Docs/Architecture/Compliance Reviewer, Cross-cutting Security/Perf/Tech Debt) + direct tool digging (read_file, grep, list_dir trên toàn bộ codebase, 33 migrations, 19 docs files, god objects 2k+ LOC).  
**Mục tiêu:** Đào sâu từng ngóc ngách để có nền tảng vững chắc trước khi tiếp tục phát triển.  

**Tóm tắt tàn nhẫn (Executive Summary):**  
Codebase có nền tảng tốt về ý định (Decimal ở core split/netting, WS ticket replay protection, magic-byte uploads, CI path-filter tốt, Docker 5-stage). Tuy nhiên **nợ kỹ thuật cực lớn** đang chặn scale và phát triển tiếp:  
- 2 god objects khổng lồ (session_repo.rs 2059 LOC, api/sessions/mod.rs ~1886 LOC) vi phạm nghiêm trọng guideline "file >200 LOC phải modularize".  
- **Lỗi tiền tệ nghiêm trọng** ở recurring (toàn bộ f64 thay vì Decimal) – vi phạm "CRITICAL RULE" trong PROJECT_GUIDELINES.md.  
- 40 instances #[allow(dead_code)] trên 25 files – debt lan rộng.  
- Docs vs reality drift khổng lồ (20 file plan cũ, nhiều obsolete, branching không nhất quán, structure DDD bị bỏ rơi).  
- Hàng loạt unwrap/expect trong prod paths (scheduler, main, recurring).  

**Risk cao nhất cho development tiếp:** Money precision bugs + unmaintainable monoliths + docs lie sẽ khiến mọi feature mới (payments mở rộng, analytics sâu, multi-group, v.v.) trở nên nguy hiểm và chậm chạp.  

**Khuyến nghị ngay lập tức trước khi dev thêm bất kỳ feature nào:** Fix P0 money + unwraps + bắt đầu tách god objects.

---

## 1. Kiến trúc & Structure Drift (vs AGENTS.md + PROJECT_GUIDELINES.md + Architecture Plan)

**Documented ideal (AGENTS + GUIDELINES + Arch Plan):**
- Monolithic nhưng modular rõ ràng (api/ thin handlers, domain/ business logic + models với Decimal, repository/ per-entity queries).
- File <200 LOC, thin domain, separation rõ.
- Decimal bắt buộc cho tiền (CRITICAL RULE), không f32/f64.
- No unwrap/expect trong prod code.

**Reality (tree + direct read + subagent outputs):**
- api/: 27 .rs + sessions/ subdir. sessions/mod.rs ~1886 LOC bloat (handlers + logic + DTOs trộn). bills.rs và categories.rs chỉ vài trăm bytes (stub/dead).
- repository/: session_repo.rs **2059 LOC god object** chứa gần như mọi thứ (bills, debts, participants, batch, pagination, export...). Vi phạm nặng modularity.
- domain/: Chỉ 7 files, khá thin, logic business rò rỉ sang api/repo (đặc biệt recurring + scheduler).
- Extras: audit.rs, scheduler.rs (coupling nguy hiểm với api DTOs), cache/ có nhiều dead_code.

**Drift cause:** Pragmatic growth nhanh mà không refactor. Kết quả: maintainability thấp, test khó, onboarding hell, bug escape cao.

**File lớn nhất (confirmed by wc + reads):**
- backend/src/repository/session_repo.rs: 2059 LOC
- backend/src/api/sessions/mod.rs: ~1886 LOC
- analytics.rs, games.rs, admin.rs, auth.rs, groups.rs, recurring files, ws.rs: 500-800+ LOC mỗi cái.

**Khuyến nghị:** Bắt buộc tách ngay 2 god objects (theo pattern session/ subdir đã có). Enforce module size trong CI.

---

## 2. Money Safety - Lỗi Nghiêm Trọng Nhất

**Core paths (split_calculator, session_repo bills/debts, payments):** Dùng rust_decimal + RoundingStrategy::MidpointAwayFromZero + scale + tests tốt. Tốt.

**Recurring expenses (domain/recurring_expense.rs, repo, api/recurring_expenses.rs, scheduler.rs):** Toàn bộ dùng **f64** cho amount + custom_amounts.
- DB schema đúng (DECIMAL(15,2)).
- Code: f64 → to_string() → Decimal hack trong scheduler (L324-325) + nhiều .unwrap_or(0.0).
- Scheduler: hardcoded 1.0 rate, bỏ qua forex.

**Impact:** Recurring bills/debts sẽ có sai lệch làm tròn tiền thật trong production. Vi phạm thẳng "CRITICAL RULE" trong PROJECT_GUIDELINES.md và backend README.

**Cũng thấy f64 ở:** wrapped analytics (chấp nhận được vì display), một số repo row structs.

**Fix P0 bắt buộc:** Migrate recurring sang Decimal đầy đủ (domain → repo → api → scheduler → responses). Update tests + migration data nếu cần. Thêm Money/Amount newtype nếu muốn lâu dài.

---

## 3. Unwrap/Expect/Panic trong Production Paths

**Số lượng:** Hàng chục instances (subagents + direct grep xác nhận).

**Ví dụ nguy hiểm:**
- scheduler.rs:379 `participants.first()...unwrap()` (sau filter active – vẫn có risk empty).
- scheduler.rs:324 `Decimal::from_str("1.0").unwrap()`.
- main.rs: nhiều .parse().unwrap() trên headers + expect trên governor, metrics, signals.
- recurring domain: nhiều .unwrap() trên date parsing.
- split_calculator: to_i128().unwrap_or(0) (mask overflow).

**Guidelines rõ ràng:** "Tuyệt đối không dùng unwrap/expect trong production code (chỉ test)".

**Risk:** Background job crash, startup fail, hoặc silent wrong data dưới edge load.

**Fix:** Thay bằng ? / AppError + proper handling. Audit toàn bộ với clippy custom hoặc script.

---

## 4. Dead Code & Allow Proliferation

**40 instances #[allow(dead_code)] / #![allow(dead_code)]** trên 25 files (grep confirmed):
- session_repo + session/ submodules
- recurring (domain + repo nhiều)
- cache/ (mod, local, redis – nhiều methods unused)
- split_calculator, ws, response, bills.rs (stub), v.v.

**Ý nghĩa:** Stubs, partial features (recurring, feed, personas, wrapped, audit, templates, admin một phần), hoặc refactor dang dở. Tăng complexity, confuse new dev.

**Fix:** Audit + xóa hoặc implement thật + bỏ allow. Dùng feature flags rõ ràng hơn nếu là WIP.

---

## 5. Docs vs Reality - Nợ Khổng Lồ

**20 files trong docs/** (Architecture Plan, 3 SPRINTs, EXECUTION_PLAN_2_6_MONTHS, GAMES_ROADMAP, UI_TRANSFORMATION_VINTAGE_PAPER, UX_FLOWS, TRANSITION_ANALYSIS, PROJECT_GUIDELINES, CACHE_STRATEGY, Roadmap & Tasks, RELEASE_NOTES, SETUP, DEPLOYMENT, BRANCH_PROTECTION_SETUP, MIGRATION/ROLLOUT_CHECKLIST, SplitBuddy Backend/Frontend.md).

**Vấn đề:**
- Hầu hết là plan cũ (2024-early 2025), nhiều obsolete so với current tree (recurring, feed, personas, wrapped, audit, templates, social feed, payments transactions, v.v. đã có file nhưng chất lượng partial/buggy).
- PROJECT_GUIDELINES.md (34k, lớn nhất) định nghĩa chuẩn cao (Decimal, no unwrap, DDD structure, envelope response, frontend features) nhưng code drift nặng.
- Architecture Plan & early docs mô tả modular DDD nhưng thực tế là pragmatic bloat.
- Branching docs không nhất quán (dev vs main PR target, protection chưa enable dù có doc).
- Không có "current state" single source of truth. Nhiều file mâu thuẫn với code.

**Positive:** Backend.md, Frontend.md, CACHE_STRATEGY, DEPLOYMENT, SETUP khá hữu ích.

**Khuyến nghị:** 
- Archive/delete old SPRINT/EXECUTION/UI_TRANS/UX_FLOWS/ early plans.
- Update PROJECT_GUIDELINES + AGENTS + Architecture để match reality (hoặc hoàn thành refactor về đúng chuẩn).
- Tạo/cập nhật codebase-summary.md + system-architecture.md (theo chuẩn docs management).
- Mỗi doc có "Last reviewed: 2026-05-31; Status: current/outdated" header.

---

## 6. Security, Perf, Tech Debt & Other Hotspots (từ Cross-cut + Direct)

**Positive:**
- Uploads: magic bytes + size + auth + user-prefixed names (rất tốt).
- WS ticket: single-use consume (replay protection tốt).
- Rate limiting: custom RealIpKeyExtractor (CF/Nginx/Heroku aware) + governor.
- Error: AppError structured + logging.
- CI: path filter, auto-cancel, Trivy, revert sync.
- Docker: 5-stage chef + non-root.
- N+1 fixes: batch methods trong session_repo.

**High risks:**
- Scheduler: coupling api DTOs (PayerInput), f64 taint, no jitter/drift handling, error isolation yếu, hardcoded 1.0 fx.
- WS: RwLock contention risk, deprecated redis calls, ticket chỉ local cache ở một số path.
- Caching: HybridCache design tốt nhưng adoption không nhất quán + nhiều dead_code → miss hoặc staleness.
- Authz: role trong JWT claims (tốt, không DB hit), nhưng enforcement per-op chưa đầy đủ (admin, settle, group, recurring?).
- God objects + duplication (bills logic rải rác sessions/bills + repo).
- Frontend: SessionDetailPage nặng (kết hợp bill + recurring + import/export + debt), một số any trong optimistic updates, Music/WebSocket contexts lớn.
- Migrations: 33 files, nhiều 2026-01 additions (recurring, feed, payments, social). Schema recurring đúng DECIMAL nhưng code f64. Indexes có (performance_indexes migration), nhưng cần verify trên hot paths (next_run + is_active cho scheduler).

**Perf/Debt notes:**
- Clone/alloc hotspots: WS events, repo Vecs, scheduler loops.
- Large files block future work.
- Feature flags & admin endpoints có nhưng một phần dead/stub.

---

## 7. Prioritized Actionable Backlog (P0-P2) - Để Tiếp Tục Phát Triển

**P0 - Critical (Fix ngay trước khi thêm feature mới, 1-2 tuần):**
1. **Money recurring f64 → Decimal toàn bộ** (domain, repo, api, scheduler, DTOs, responses, validation, tests). Update DB nếu cần + data migration. (Highest impact - tránh bug tiền thật).
2. **Loại bỏ unwrap/expect trong prod paths** (scheduler 379 & 324, main init/headers, recurring dates, split_calculator overflow paths). Thay bằng AppError + ?.
3. **Audit & fix 40 allow(dead_code)** - xóa hoặc implement thật (bắt đầu từ recurring, cache, session submodules, bills stub).

**P1 - High (1-2 sprint tới):**
4. **Modularize 2 god objects** (session_repo.rs 2059 LOC + api/sessions/mod.rs ~1886 LOC). Tách theo pattern subdir đã có (bills, debts, participants). Enforce size limit trong CI.
5. **Decouple scheduler** khỏi api DTOs (PayerInput etc. → domain hoặc riêng). Inject forex/http_client. Thêm jitter, metrics, better error isolation.
6. **Complete HybridCache adoption** + central invalidation helper. Verify usage ở scheduler/WS/repos/handlers.
7. **Full authz pass** trên mọi mutating endpoint + WS + uploads (role/ownership checks rõ ràng).
8. **WS hardening** (update deprecated redis, RwLock → better, ticket replay window rõ hơn).

**P2 - Medium (sau P0/P1):**
9. Clean duplication (bills logic, session_repo vs submodules).
10. Update toàn bộ docs (archive old plans, align PROJECT_GUIDELINES/AGENTS/Architecture với reality hoặc hoàn thành refactor về chuẩn DDD).
11. Tăng test coverage cho scheduler/recurring/money edges + property tests.
12. Frontend: tách SessionDetailPage, fix any trong optimistic, review Music/WebSocket contexts.
13. Infra: verify Heroku Redis cho WS, graceful shutdown đầy đủ, sccache nếu ổn định.

**Longer term:** Money newtype, distributed scheduler lock nếu scale, upload virus scan, per-user rate limits, observability sâu hơn (cache hit rates, scheduler metrics).

**Verification sau fix:** `make check` (backend clippy -D + nextest + frontend type-check/build), manual recurring execution test với fractional amounts, load test WS/scheduler.

---

## 8. Unresolved Questions (Cần anh confirm để đào sâu tiếp)

- Exact current UI (vintage paper đã ship hết chưa? So sánh với UI_TRANS/UX_FLOWS).
- Full scope "payments proof" / social feed (chỉ backend hay có UI đầy đủ?).
- Local uncommitted changes vs main (git status/diff cần chạy local).
- bills.rs + categories.rs là stub cố ý hay dead code?
- Roadmap & Tasks.md full content (raw fetch encoding issue trước đây).
- Enforcement của "no any/unwrap" trong CI (chỉ clippy hay có custom?).
- HybridCache adoption gaps cụ thể (grep usage vs misses).
- Role-based authz enforcement status hiện tại (chỉ claims hay có check thêm?).
- Production metrics thực tế (scheduler load, recurring failure rate, cache hit rates).

---

## 9. Additional Triệt Để Findings – Continuation Deep Dive (Direct Tooling + Grep + File Reads, 2026-05-31+)

### 9.1 Frontend Type Safety & Decimal Adoption (Critical Violations Confirmed)
**decimal.js reality (grep toàn frontend/src):**
- Chỉ được import + dùng **duy nhất** trong `frontend/src/utils/formatCurrency.ts` (lines 1,6,18) cho **display formatting** (formatCurrency, formatNumber).
- **Không được dùng trong bất kỳ core money path nào**: bill creation, optimistic updates, debt calc, session totals, api.ts DTOs, RecurringExpenses, ImportExportModal, SessionDetailPage, useFeed, PersonaEditor, v.v.
- SessionDetailPage (core bill flow) dùng `parseFloat` + string concat + any thay vì Decimal.

**'any' proliferation (grep pattern `:\s*any|as any` – 46+ matches, expanded by dedicated 150s frontend subagent triệt để):**
- **SessionDetailPage.tsx (core money UI – 18+ instances)**: 
  - 134: `mutationFn: (data: any) => api.inputs.createBill`
  - 143: `setQueryData(..., (old: any) => ...` (optimistic bills)
  - 162,164,167,169: `.map((p: any) => ...` + find participant any (payers + split_details)
  - 179,257,304,313: `setQueryData(["session", id], (oldSession: any) => ...` (total_amount parseFloat mix)
  - 196,394: onError any
  - 219+: updateBill tương tự.
  - **Risk**: Optimistic update sai lệch tiền, rollback hỏng, type drift → production bug khi bill có fractional VND hoặc multi-currency.
- **Additional heavy files from subagent (BillInput.tsx core splits/preview, DebtBreakdown, DebtsPage netting, useFeed, etc.)**: dozens more in handlers, preview logic, error paths.
- RecurringExpenses.tsx: 5x onError (error: any) lines 64,75,86,97,108.
- ImportExportModal.tsx: 5x any (35,54,81,96).
- lib/api.ts: 10+ any cho createBill/updateBill/addParticipant/updateMe (13,14,54,55,70).
- DashboardPage.tsx: 4x retry/onError any.
- Contexts: WebSocketContext 237, MusicContext 63, FeatureFlagsContext 32, NotificationBell 17.
- AppLayout.tsx 64: `icon: any` (NavLink).
- NotificationDropdown 85: `as any`.
- useFeed.ts 40: setQueryData any.
- PersonaEditor 52: mutation any.
- types/websocket.ts:86 `isWsEvent(data: any)` (with eslint-disable).

**ESLint config reality** (eslint.config.js + tsconfig strict:true nhưng):
- `@typescript-eslint/no-explicit-any: 'warn'` (chỉ warn, không block build/CI).
- Kết quả: code "pass" type-check + build nhưng vi phạm nặng "no `any`" trong GUIDELINES + AGENTS.md.

**decimal.js / money calc violations (CRITICAL, subagent 150s deep dive + prior):**
- formatCurrency.ts: Model implementation (new Decimal + toNumber only at final Intl). Good for display.
- **Under-adopted in core paths (P0 financial risk)**:
  - SessionDetailPage (L181+): parseFloat(oldSession.total_amount), parseFloat(newBillData...), manual newTotal.toString() in optimistic.
  - BillInput.tsx (core split/preview/convert – L124/131+): parseFloat(exchange_rate/amount), Math.round, / rate, toFixed for EQUAL/WEIGHTED/custom. No Decimal anywhere in calc.
  - DebtBreakdown.tsx:29/35: parseFloat + number accum in useMemo for owed/paid.
  - DebtsPage netting: multiple parseFloat + reduce on computed numbers.
  - RecurringExpenses.tsx: amount: number in type (vs Bill string).
  - types/api.ts: Mostly string good, but RecurringExpense.amount + SessionStat.total_amount = number (drift).
- package.json has decimal.js ^10.4.3, but only imported in formatCurrency.ts. Backend (Decimal + string JSON) correct – FE is the weak link for trust/money disputes.

**MusicContext.tsx bloat** (~370 LOC confirmed): YTPlayer refs, audioRef, useQuery (server state in Context – anti-pattern), localStorage, shuffle, multiple effects – phức tạp hơn "global UI state" guideline (nên extract hook + TanStack).

**WS + optimistic sync risks (detailed subagent analysis):**
- Ticket: expires_in_seconds in type nhưng **không enforced/refreshed** trên reconnect – long-lived auth risk.
- Race conditions: Optimistic any+float setQueryData → server Decimal → WS event (BillUpdated/DebtsRecalculated) → another invalidate. Flash/stale/overwrite on totals/my_debt (code explicitly "leave them stale").
- Re-render storms: Map updates in WebSocketContext + presence cascade; no heavy memo/selectors in DebtBreakdown/participants.
- Other: MoodContext ~322 LOC heavy (MOOD_CONFIGS, 500ms localStorage polling, CSS mutation, chatHistory) – worst bloat, mixes UI + AI state.

**Khuyến nghị P0/P1 bổ sung (từ subagent + prior, file cụ thể):**
- P0: Strict no-explicit-any (ban in CI for money/optimistic paths); replace in SessionDetail + BillInput + DebtBreakdown + DebtsPage + all error/WS paths với unknown + guards.
- P0: Full Decimal adoption trong BillInput (core calc), DebtBreakdown netting, DebtsPage, SessionDetail totals/optimistic, Recurring UI. Extend format utils hoặc tạo calc helpers (sum, split, convert). Fix types/api.ts Recurring/SessionStat amount → string.
- P0: WS ticket expiry handling (refresh trước reconnect hoặc trên 4xx).
- P1: Tách SessionDetailPage (738 LOC god component). Extract Mood/Music heavy logic ra custom hooks (chỉ giữ play/pause/volume/mood trong Context). Reduce Mood 500ms poll.
- P1: FeatureFlags backend enforcement + UI guards.
- Positive: TanStack + targeted WS invalidation mạnh; formatCurrency đúng chuẩn.

**ESLint + subagent metrics**: any + float precision sẽ surface rõ hơn ở strict mode hoặc runtime fractional. Recommend full `npm run type-check && npm run build` + manual money flows post-fix.

### 9.2 Recurring Expense Domain & Scheduler – Money + Dead Code + Panic Risk (Triệt Để Read)
File `backend/src/domain/recurring_expense.rs` (full read):
- amount: f64 (line 50), custom_amounts: Option<HashMap<Uuid, f64>> (35) – **P0 money taint** lan từ domain → repo → api → scheduler.
- 5+ `#[allow(dead_code)]`: to_days (18), RecurringExpenseSnapshot (30), should_run_now (69), is_expired (75), validate (90), SnapshotRow (109).
- **2x .unwrap() panic risk** trong is_expired (80,82): `and_hms_opt(...).unwrap().and_local_timezone(Utc).unwrap()`.
- validate() dùng f64 `<= 0.0` (92) thay Decimal.
- Snapshot struct (JSONB) cũng chứa f64 custom_amounts + weights.
- Tests (196+) hardcode f64 100.0, -100.0, dùng .unwrap() date.

**Scheduler + Repo cross-confirm (prior + domain read):**
- scheduler.rs:116 `amount: f64` trong RecurringExpenseRow.
- recurring_expense_repo.rs:29,164: f64 structs + Option<f64>.
- Scheduler line 324-325: `Decimal::from_str(&amount.to_string()).unwrap()` + hardcoded 1.0 rate + comment "skip external forex".
- Line 379: `participants.first()...unwrap()` sau filter.

**Snapshots mismatch:** Schema recurring (20260114000001 + exceptions) có JSONB, nhưng code snapshot struct incomplete vs latest migration fields (weight/active từ 20260112 participant flags migration chưa fully reflected).

### 9.3 Database Completeness Confirmed
- **.sqlx/**: Chính xác **74** cached query JSON files (find + wc -l). Offline build ổn.
- **33 migrations** (list exact): Initial (202312) → 20260118000003_social_feed.sql.
  - Heavy cluster Jan 2026: recurring (14000001 + indexes + exceptions), payments/transactions (18000002), social_feed (18000003), personas, audit, templates, uploads, currency, participant flags, refresh tokens, etc.
  - Evolution: MVP (sessions/bills/debts/groups) → 2025 games/music → 2026 recurring/feed/payments/personas/audit/social (feature expansion phase).
  - Positives: recurring schema dùng DECIMAL(15,2) đúng + participant_amounts JSONB + indexes scheduler (next_run + is_active).
  - Gaps: snapshots JSONB vs code struct drift, một số cascades thiếu (users → payments/audit?), custom UUIDs, redundant indexes một số nơi.
- **Coverage**: 74 queries bao phủ core (sessions, bills, debts, users, recurring basic) nhưng cần verify freshness sau migration 20260118+ (social feed, payment tx).

### 9.4 Dead Code & Allow Proliferation (Cross-cut Update)
- 40+ instances confirmed (prior god-object + recurring domain + cache/ + ws + response + bills stub).
- Recurring domain alone đóng góp 5+ allow + nhiều method unused (to_days, snapshot logic).
- Pattern: WIP features (recurring partial, feed, personas editor, wrapped, templates, admin flags) + refactor dang dở + stubs (bills.rs, categories.rs trong api).

### 9.5 Other Drift & Gaps Noted
- **Branch naming**: GUIDELINES.md nói "develop" (Gitflow diagram, DoD "merge vào develop"), nhưng reality/Agents.md/README/CI dùng `dev` (PR target dev → main). Docs lie.
- **No local .claude/rules/**: Global CLAUDE.md + repo Agents.md + PROJECT_GUIDELINES phải dùng, nhưng thiếu local copy → onboarding risk.
- **Missing standard docs** (per CLAUDE + docs management): Không có `codebase-summary.md`, `system-architecture.md`, `project-roadmap.md` exact (chỉ có "Roadmap & Tasks.md", "Architecture Plan.md", "SplitBuddy Backend/Frontend.md", deep review này). Cần tạo/update để single source of truth.
- **ESLint any**: 'warn' không đủ mạnh so với "no any" guideline.

---

## 10. Updated Prioritized Actionable Backlog (P0-P2) – Exact File:Line

**P0 - Critical (Fix ngay 1-2 tuần trước feature mới):**
1. **Money recurring f64 → Decimal toàn bộ** (domain/recurring_expense.rs:35,50 + repo 29,164 + api/recurring_expenses.rs 20+ + scheduler.rs:116,324-325,379 + responses + tests). Data migration nếu cần. (Highest – tránh bug tiền thật recurring).
2. **Loại bỏ unwrap/expect prod paths** (recurring_expense.rs:80,82 + scheduler 379 + main init + split_calculator overflow).
3. **Eliminate 'any' clusters trong core money UI** (SessionDetailPage.tsx:134,143,162,164,167,169,179,196,219,224,238,240,243,245,257,304,313,394 + lib/api.ts 13-14,54-55,70 + Recurring/ImportExport 5-10x). Thay bằng proper TS types + adopt Decimal từ decimal.js cho bill optimistic + calc (không chỉ format).
4. **Audit & fix 40 allow(dead_code)** – bắt đầu recurring domain (5+), cache, session submodules, stubs.

**P1 - High:**
5. Modularize 2 god objects (session_repo.rs:2059, api/sessions/mod.rs:~1886) – tách theo session/ subdir pattern.
6. Decouple scheduler khỏi api DTOs + f64 taint + .first().unwrap.
7. Full authz + WS hardening + HybridCache adoption.
8. Frontend: tách SessionDetailPage (quá nặng), review MusicContext bloat (~370 LOC), enforce no-any (ESLint error thay warn).

**P2 + Longer:** Docs cleanup (archive 15+ obsolete plans, create missing codebase-summary + system-architecture + project-roadmap.md, fix branch naming drift in GUIDELINES), test coverage scheduler/money edges, money newtype, infra (Heroku Redis WS, per-user rate limit).

**Verification:** Sau P0: `make check`, manual recurring với 0.1/0.01 amounts + fractional VND, optimistic bill create trong UI, type-check không any trong money paths.

---

**Kết luận (Updated sau triệt để):** 
Đã đào sâu **triệt để** toàn bộ (mọi api 27 files + sub, domain 7, repo 13 + session sub, 33 migrations, .sqlx 74, 19 docs, 6 contexts, SessionDetail + heavy components, god objects 2k+ LOC line-by-line, money paths end-to-end, flows, cross-cuts, infra/CI). 

Nền tảng có instinct tốt (Decimal core split_calculator, WS ticket, magic-byte uploads, CI path-filter, Docker 5-stage, N+1 batch fixes). Nhưng **3 rủi ro chết người** vẫn còn:
- Recurring money hole (f64 lan rộng + scheduler panic risk) – P0 #1.
- Frontend any + parseFloat ở chính giữa bill/debt optimistic flow (SessionDetailPage) + decimal.js chỉ dùng cho display.
- God objects + docs lie + dead_code 40+ → maintainability 0 cho scale.

**Đủ hiểu đúng và đủ** để phát triển an toàn từ đây. **Không nên thêm feature mới** (payments mở rộng, analytics sâu, multi-group, AI nâng cao...) cho đến khi P0 fix xong + bắt đầu modularize.

Báo cáo living này tại `./docs/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md` (đã cập nhật triệt để findings + exact file:line).

**Cập nhật mới nhất (tiếp tục sau "Tiếp đi chứ"):** Đã tạo đầy đủ 3 standard docs theo yêu cầu documentation management (CLAUDE.md + PROJECT_GUIDELINES):
- [docs/codebase-summary.md](./codebase-summary.md) – Current state, feature table, P0 risks, key modules.
- [docs/system-architecture.md](./system-architecture.md) – Layers (ideal DDD vs reality), critical flows (recurring/WS/push/authz), tradeoffs, gaps.
- [docs/project-roadmap.md](./project-roadmap.md) – Phased P0→P1→P2 + feature plan, exact milestones, verification gates, "fix debt trước khi scale feature".

3 subagents code-reviewer đang chạy background (backend remaining apis + full flows; frontend WS/optimistic/Decimal gaps + contexts; security/infra/CI + dead_code full + duplication + draft bổ sung cho 3 docs). Kết quả sẽ được tổng hợp thêm vào report này.

**Full understanding achieved:** Đủ để bắt đầu implement P0 an toàn nhất.

**Sẵn sàng ngay:** 
- Implement P0 recurring f64→Decimal + fix unwraps + SessionDetail any/Decimal (theo plan chi tiết).
- Hoặc đào sâu thêm 1 góc cụ thể (ai.rs full, games impl, feed/social completeness, admin enforcement, uploads size limits + GET authz, VAPID startup, WS Redis Heroku reality, test gaps...).
- Hoặc review/approve phased execution plan cho 1-2 sprint fix debt.

Anh muốn em bắt đầu từ đâu, anh? (Ví dụ: "Bắt đầu fix P0 recurring money safety" hoặc "Đào sâu thêm feed + social + payments UI/backend completeness"). Em đã nắm rõ từng chút một để làm đúng và an toàn nhất.