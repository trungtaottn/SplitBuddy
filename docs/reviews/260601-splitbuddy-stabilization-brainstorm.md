# Brainstorm Ổn Định Nền Tảng SplitBuddy

---
date: 2026-06-01
status: proposed
scope: P0/P1 stabilization
output: brainstorm report
---

## Tóm Tắt

SplitBuddy chưa triển khai production, vì vậy quyết định đúng lúc này là **chấp nhận refactor mạnh trong 2-4 tuần để khóa nền tảng tiền, vận hành, realtime và maintainability**. Không nên vá nhỏ để tiếp tục feature. Vá nhỏ sẽ giữ được tốc độ ngắn hạn nhưng để lại rủi ro sai tiền, panic nền, session god objects và authz/WS mơ hồ.

Ghi chú sau red-team: README có Heroku deploy URL, nên câu “chưa triển khai production” không được suy từ code. Đây là **ràng buộc do anh xác nhận trong buổi brainstorm**: chưa có user/data thật, có thể refactor mạnh. Nếu trạng thái này đổi, toàn bộ phần recurring/data compatibility phải được review lại.

Hướng khuyến nghị:

1. Khóa money contract end-to-end.
2. Làm scheduler và startup không panic trong runtime bình thường.
3. Sửa CI gate đang thủng để lỗi type/build thật sự fail.
4. Chốt authz matrix cho bill/recurring trước khi viết test.
5. Hardening WebSocket server-side subscribe authz.
6. Sau P0 mới tiếp tục session repo/API modularization.

Không mở rộng payments, feed, games, analytics, AI, PWA trong giai đoạn này.

## Bối Cảnh Đã Scout

| Khu vực | Hiện trạng |
|---|---|
| Backend | Rust 2021, Axum 0.7, SQLx, PostgreSQL, `rust_decimal`, JWT, Redis optional. |
| Frontend | React 18, Vite, TypeScript strict, TanStack Query, Axios, Tailwind, `decimal.js`. |
| Database | 33 migrations, recurring schema dùng DECIMAL đúng nhưng code map về `f64`. |
| Docs | Living docs đã có tại `docs/`, deep review tại `docs/reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md`. |
| Plans | Chưa có `plans/` đang active. |
| Deploy docs | README có Heroku URL; không dùng README để kết luận không có data thật. |

Điểm nóng đã xác nhận:

| File | Vấn đề chính |
|---|---|
| `backend/src/domain/recurring_expense.rs` | `amount: f64`, `custom_amounts: f64`, unwrap date, dead code allowances. |
| `backend/src/api/recurring_expenses.rs` | DTO request/response recurring dùng `f64`. |
| `backend/src/repository/recurring_expense_repo.rs` | DB DECIMAL bị map về `f64`. |
| `backend/src/scheduler.rs` | recurring row `f64`, parse Decimal từ string, `unwrap`, coupling API DTO. |
| `backend/src/main.rs` | header parse unwrap, Prometheus/rate limiter/signal expect. |
| `backend/src/services/push_service.rs` | VAPID/message build expect. |
| `backend/src/repository/session_repo.rs` | 2059 LOC, quá nhiều trách nhiệm. |
| `backend/src/api/sessions/mod.rs` | 1886 LOC, route/handler/DTO/business logic trộn. |
| `frontend/src/components/BillInput.tsx` | 954 LOC, money preview dùng `parseFloat`, rounding client-side không đồng nhất backend. |
| `frontend/src/pages/SessionDetailPage.tsx` | optimistic update dùng `any` và `parseFloat` trên session totals. |
| `frontend/src/lib/api.ts` | API wrapper nhận `any` cho bill/participant/persona. |
| `frontend/src/types/api.ts` | phần core dùng string money tốt, nhưng analytics/feed còn number/any; recurring type cần kiểm lại. |
| `Makefile` | `make check` hiện chưa phải hard gate vì frontend type-check đang được allow-fail. |
| `backend/src/api/ws.rs` | WS subscribe session cần server-side authz, không chỉ ticket auth. |

## Mục Tiêu 2-4 Tuần

### Mục Tiêu Chính

Tạo nền đủ sạch để tiếp tục phát triển sản phẩm mà không phải sợ lỗi tiền, lỗi runtime nền, hoặc mỗi feature mới đụng vào session đều thành phẫu thuật.

Không nên gom toàn bộ nội dung này vào một `/ck:plan --tdd` duy nhất. Red-team đúng: scope này gồm nhiều subsystem độc lập. Nên tách thành ít nhất hai plan:

1. **Plan P0 TDD:** money, recurring, runtime safety, CI hard gate tối thiểu.
2. **Plan P1 Foundation:** session modularization, authz matrix implementation, WS hardening.

### Phạm Vi Trong Round Này

| Trong scope | Ngoài scope |
|---|---|
| Money safety backend/frontend. | Feature mới cho payments/feed/games/AI. |
| Recurring refactor mạnh. | Mobile app/native. |
| Scheduler runtime safety. | Redesign UI lớn. |
| Session repo/API modularization. | Multi-org/multi-tenant. |
| Authz mutating endpoints. | Advanced observability platform. |
| WebSocket ticket/reconnect hardening. | Scale nhiều instance đầy đủ, trừ chuẩn bị lock later. |
| CI guardrails. | Perf tuning sâu khi chưa có traffic thật. |

### Tiêu Chí Thành Công

- Không còn `f64`/`f32` trong money domain, recurring, bill/debt/session money path.
- Frontend core money không còn `any`, `parseFloat`, `number` trong calculation/optimistic path.
- Recurring amount đi qua API dưới dạng string, backend parse thành Decimal.
- Scheduler xử lý từng recurring item độc lập; một item lỗi không làm dừng cả loop.
- Không còn production `unwrap/expect` ở startup/scheduler/push/date paths, trừ invariant có proof rõ.
- Session repo/API được tách theo capability, không còn sửa mọi thứ trong một file khổng lồ.
- Mutating endpoints có ownership/role check nhất quán.
- WebSocket subscribe trái quyền bị reject ở server.
- `make check` hoặc command gate thay thế fail thật khi frontend type-check/build fail.

## Lựa Chọn Chiến Lược

### Cách 1: Vá P0 Tối Thiểu

Nội dung:

- Sửa recurring `f64 -> Decimal`.
- Sửa vài `unwrap` dễ thấy.
- Sửa frontend `parseFloat` trong `BillInput` và `SessionDetailPage`.

Ưu điểm:

- Nhanh nhất.
- Ít file bị động chạm.
- Phù hợp nếu cần demo gấp.

Nhược điểm:

- Không giải quyết session god objects.
- Authz/WS vẫn mơ hồ.
- Mỗi feature sau vẫn chậm vì repo/API quá lớn.
- Dễ tái phát `any`/float nếu CI chưa khóa.

Kết luận: không khuyến nghị. Repo chưa production nên không nên chọn phương án nửa vời.

### Cách 2: Stabilization Foundation

Nội dung:

- Phase 0 money trust.
- Phase 1 runtime safety.
- Phase 2 modularization.
- Phase 3 authz/WS hardening.
- Phase 4 CI guardrails.

Ưu điểm:

- Tập trung đúng rủi ro thật.
- Tận dụng việc chưa có production data để refactor mạnh.
- Giữ API/product surface tương đối ổn, không rebuild toàn bộ.
- Tạo nền cho 3 tháng vận hành tốt.

Nhược điểm:

- Cần freeze feature 2-4 tuần.
- Sửa nhiều file, cần test chặt.
- Một số UI có thể phải chỉnh lại do API money contract đổi sang string nghiêm ngặt.

Kết luận: khuyến nghị.

Điều chỉnh sau red-team: chọn cách này ở cấp roadmap 2-4 tuần, nhưng **không chuyển nguyên khối thành một plan TDD**. P0 phải nhỏ hơn:

- Recurring Decimal/string.
- Frontend money critical path.
- Runtime panic removal ở scheduler/startup/push.
- Recurring API envelope decision.
- CI gate thật.
- Test harness tối thiểu cho recurring/scheduler/authz.

Session modularization, full authz pass và WS hardening là P1 ngay sau P0, không nhét vào cùng acceptance gate đầu tiên.

### Cách 3: Re-Architecture Rộng

Nội dung:

- Tạo `Amount` newtype ngay.
- Rebuild DDD layer rõ hơn toàn backend.
- Tách hầu hết file >200 LOC.
- Chuẩn hóa toàn bộ API wrapper/types frontend.

Ưu điểm:

- Sạch nhất về lâu dài.
- Giảm nhiều debt cùng lúc.

Nhược điểm:

- 4-8+ tuần.
- Regression risk lớn.
- Dễ sa đà kiến trúc trước khi product được validate.
- Không cần thiết để đạt mục tiêu vận hành 3 tháng tới.

Kết luận: chỉ lấy vài nguyên tắc, không chọn full scope.

## Kiến Trúc Đích Cho Giai Đoạn Ổn Định

```text
Frontend
  Money input string
  Decimal helpers
  Typed API DTOs
  Typed optimistic snapshots
  TanStack invalidation

API
  Request money string
  Validate/parse Decimal at boundary
  Authz explicit
  Thin handlers

Domain
  Decimal-only business rules
  Recurring schedule logic pure
  Split/debt calculation deterministic

Repository
  SQLx DECIMAL <-> Decimal
  No business branching beyond persistence mapping

Scheduler
  Uses domain/repo contracts
  Per-item transaction
  Per-item failure isolation
  Metrics/logging
  No API DTO coupling
```

## Phần 1: Money Safety Backend

### Vấn Đề

Backend core split/debt đã dùng `Decimal`, nhưng recurring đi đường riêng và dùng `f64`.

Ví dụ đã xác nhận:

- `backend/src/domain/recurring_expense.rs`: `amount: f64`, `custom_amounts: Option<HashMap<Uuid, f64>>`.
- `backend/src/api/recurring_expenses.rs`: request/response `amount: f64`.
- `backend/src/scheduler.rs`: row `amount: f64`, sau đó `Decimal::from_str(&amount.to_string())`.

Đây là lỗi nền, không phải style. Recurring expense có thể tự sinh bill/debt. Nếu amount sai, debt sai. Với app chia tiền, sai tiền là lỗi sản phẩm nghiêm trọng nhất.

### Tại Sao Nguy Hiểm

- `f64` không biểu diễn chính xác decimal money.
- Convert `f64 -> string -> Decimal` chỉ che lỗi, không sửa nguồn.
- DB schema đã là DECIMAL, nhưng code hạ cấp precision khi đọc/ghi.
- Scheduler chạy background nên lỗi có thể tạo bill sai mà user không biết ngay.
- Snapshot JSONB nếu chứa float sẽ làm audit/history không đáng tin.

### Hướng Xử Lý Đề Xuất

1. Đổi recurring domain sang `Decimal`.
2. Đổi repository row/query binding sang `Decimal`.
3. Đổi API request/response amount thành string.
4. Parse string tại API boundary, trả lỗi validation nếu invalid.
5. Snapshot recurring lưu string amount, không lưu float.
6. Scheduler nhận Decimal trực tiếp, không parse từ `f64`.
7. Test recurring với case `0.01`, `0.1`, `123.45`, VND zero-decimal, weighted split.

### Không Nên Làm

- Không giữ `f64` trong DTO vì “frontend gửi number tiện hơn”.
- Không chỉ round về 2 chữ số.
- Không dùng `Decimal::from_f64`.
- Không tạo `Amount` newtype ngay nếu làm chậm toàn bộ stabilization.

### Trade-Off

| Lựa chọn | Đánh giá |
|---|---|
| Decimal trực tiếp trong backend, string ở API | Tốt nhất cho round này. |
| Amount newtype toàn hệ thống | Đúng dài hạn nhưng quá rộng. |
| Giữ number ở frontend, backend parse Decimal | Vẫn rủi ro vì client đã làm float math trước khi gửi. |

### Tiêu Chí Đạt

- `rg "\bf64\b" backend/src/domain backend/src/api/recurring_expenses.rs backend/src/repository/recurring_expense_repo.rs backend/src/scheduler.rs` không còn match money-related.
- API recurring amount request/response là string.
- Scheduler không còn `Decimal::from_str(&amount.to_string())`.
- Recurring tests chứng minh split không mất cent.

## Phần 2: Money Safety Frontend

### Vấn Đề

Frontend có `decimal.js` nhưng gần như chỉ dùng ở formatting. Core input/preview/optimistic vẫn dùng `parseFloat`, `number`, `any`.

Điểm nóng:

- `BillInput.tsx`: split preview và custom total dùng `parseFloat`, `Math.round`, `toFixed`.
- `SessionDetailPage.tsx`: optimistic create/update/delete bill cộng trừ total bằng `parseFloat`.
- `DebtsPage.tsx`, `DebtBreakdown.tsx`, `GroupDebtsPage.tsx`: aggregate money bằng number.
- `lib/api.ts`: `createBill`, `updateBill`, `addParticipant`, `updateParticipant`, `updateMe` nhận `any`.

### Tại Sao Nguy Hiểm

- Backend đúng Decimal nhưng UI preview/optimistic sai sẽ gây mất niềm tin.
- User thấy tổng tiền thay đổi tức thời rồi refetch sửa lại, tạo cảm giác app lỗi.
- `any` làm DTO drift không bị TypeScript bắt.
- Càng thêm feature payments/settlement sau này càng khó biết field nào là string money.

### Hướng Xử Lý Đề Xuất

1. Tạo money helper frontend dùng `decimal.js` cho:
   - parse input string.
   - cộng/trừ/tổng.
   - split equal với remainder deterministic.
   - weighted split.
   - compare custom split total.
   - format output string theo currency.
2. Chuẩn hóa type alias:
   - `type MoneyString = string`.
   - `type CurrencyCode = string`.
   - DTO amount field dùng `MoneyString`.
3. Sửa API wrapper:
   - `createBill(data: CreateBillRequest)`.
   - `updateBill(data: UpdateBillRequest)`.
   - `addParticipant(data: AddParticipantRequest)`.
   - không nhận `any`.
4. Sửa optimistic update:
   - query data typed.
   - snapshot typed.
   - total amount cộng trừ bằng Decimal helper.
   - rollback typed.
5. Sửa `BillInput`:
   - internal state vẫn string.
   - preview output string hoặc Decimal-derived string.
   - không dùng `number` làm source of truth.
6. Chỉ cho phép `Number(...)` ở chart/display cuối cùng nếu chart library bắt number, không dùng cho business calculation.

### Không Nên Làm

- Không ép tất cả frontend money về number rồi format lại.
- Không tự viết decimal math bằng integer cents khi app đang có multi-currency; dễ sai scale.
- Không siết `no-explicit-any` toàn repo ngay từ đầu nếu sẽ làm vỡ nhiều vùng không critical. Siết theo critical path trước, sau đó nâng global.

### Trade-Off

| Lựa chọn | Đánh giá |
|---|---|
| Helper Decimal nhỏ, dùng ngay trong money paths | KISS, đủ mạnh, khuyến nghị. |
| Full money domain package frontend | Có thể tốt sau, nhưng round này dễ overbuild. |
| Chờ backend làm hết, frontend chỉ refetch | UX yếu, optimistic vẫn sai hoặc phải bỏ optimistic. |

### Tiêu Chí Đạt

- `BillInput`, `SessionDetailPage`, `DebtBreakdown`, `DebtsPage` không còn money `parseFloat`.
- `lib/api.ts` không còn `any` ở bill/session participant/persona critical API.
- Optimistic session total không lệch với response sau refetch trong manual QA.
- Manual case: 100 chia 3, 0.1 + 0.2, VND zero-decimal, USD 2 decimals, weighted split.

## Phần 3: Recurring Refactor Mạnh

### Vấn Đề

Recurring hiện là feature partial: schema khá đầy đủ nhưng code chưa đạt chuẩn money/runtime. Vì chưa có user production, ta có thể sửa mạnh thay vì migration compatibility phức tạp.

### Hướng Xử Lý Đề Xuất

1. Treat recurring như feature đang hoàn thiện, không phải legacy cần preserve.
2. Sửa contract:
   - amount string qua API.
   - Decimal trong domain/repo/scheduler.
   - snapshot JSONB versioned tối thiểu: `version: 1`, money strings.
3. Sửa split strategy:
   - `EQUAL`: scheduler tự chia bằng Decimal.
   - `WEIGHTED`: dùng participant weights.
   - `CUSTOM`: hoặc implement đầy đủ custom amounts Decimal, hoặc tạm reject rõ bằng validation. Không silently default sang EQUAL.
4. Sửa created_by:
   - không lấy first participant bằng `unwrap`.
   - dùng `created_by` của recurring expense.
   - nếu user không còn quyền hoặc không tồn tại, mark execution failed, không tạo bill.
5. Sửa exception/end date:
   - date conversion không unwrap.
   - timezone invalid trả validation error.
6. Sửa scheduler result:
   - mỗi execution ghi success/failure.
   - failure có reason.
   - không retry vô hạn cùng tick.
7. Chuẩn hóa response envelope:
   - hiện recurring endpoints có path trả raw JSON thay vì envelope.
   - khi đổi amount sang string, nên sửa luôn contract response để frontend type không drift tiếp.
   - nếu sợ blast radius, ít nhất phải ghi rõ endpoint nào giữ raw response và vì sao.

### Điểm Cần Quyết Định

`CUSTOM` recurring nên làm ngay hay reject tạm?

Khuyến nghị: **làm ngay nếu schema đã có custom amounts; nếu chưa có UI rõ thì reject tạm bằng validation**. Không được silently đổi CUSTOM thành EQUAL vì đó là sai dữ liệu ngầm.

Recurring API envelope nên normalize ngay hay giữ raw?

Khuyến nghị: **normalize về `ApiResponse<T>` ngay trong P0** nếu số call sites ít. Đây là lúc đang đổi DTO money, sửa contract một lần sạch hơn. Giữ raw response chỉ hợp lý nếu frontend đang phụ thuộc nhiều nơi và cần giảm blast radius.

### Tiêu Chí Đạt

- Recurring không dùng float.
- CUSTOM không bị degrade âm thầm.
- Scheduler tạo bill từ recurring có created_by đúng.
- Một recurring lỗi không ảnh hưởng recurring khác.
- Có test end-date/timezone/month-end.

## Phần 4: Runtime Safety Và Panic Removal

### Vấn Đề

Production paths còn `unwrap/expect` trong:

- `main.rs`: header parse, Prometheus recorder, rate limiter config, signal handlers.
- `scheduler.rs`: exchange rate parse, first participant.
- `push_service.rs`: VAPID signature builder, message build.
- recurring date logic.

Một số `expect` ở startup config có thể chấp nhận nếu fail-fast có message rõ, nhưng hiện tại đang lẫn runtime paths và recoverable paths.

### Phân Loại Đúng

| Loại lỗi | Cách xử lý |
|---|---|
| Config bắt buộc thiếu khi app start | fail-fast bằng `Result` có context rõ. |
| Header constant parse | dùng `HeaderValue::from_static`, không unwrap. |
| Metrics recorder fail | startup return error hoặc degrade có log, tùy yêu cầu. |
| Scheduler item lỗi | log + mark failed + continue item khác. |
| Push notification lỗi | fail per subscription, không panic batch. |
| Timezone/date invalid | validation error hoặc skip recurring with reason. |

### Hướng Xử Lý Đề Xuất

1. Audit `unwrap/expect` theo nhóm:
   - test-only: giữ.
   - static invariant: đổi sang static API nếu có.
   - startup required: convert to `anyhow::Context`.
   - runtime recoverable: convert to `AppError` hoặc logged skip.
2. Tạo rule nội bộ:
   - `unwrap/expect` trong production chỉ được giữ nếu cùng dòng/khối có proof bất biến, nhưng vẫn nên hạn chế.
3. Scheduler:
   - `process_single_expense` trả result có enum outcome.
   - loop collect metrics: processed/skipped/failed.
4. Push:
   - invalid subscription nên mark stale hoặc log, không fail toàn batch.

### Tiêu Chí Đạt

- `rg "unwrap\\(|expect\\(" backend/src` chỉ còn test hoặc invariant đã được chấp nhận.
- Scheduler không panic nếu recurring thiếu participant/creator/timezone.
- Push service không panic vì VAPID/message build.

## Phần 5: Modularize Session Repository

### Vấn Đề

`backend/src/repository/session_repo.rs` 2059 LOC đang là điểm nghẽn lớn nhất backend. Nó gom quá nhiều capability: session CRUD, bills, debts, participants, import/export, pagination, batch queries.

### Tại Sao Nguy Hiểm

- Review khó.
- Merge conflict cao.
- Dễ tạo circular business logic giữa repo và API.
- Test theo capability khó.
- Feature nào chạm session cũng phải đọc file khổng lồ.

### Hướng Tách Đề Xuất

Không rebuild repository architecture. Tách theo capability đang có sẵn pattern `backend/src/repository/session/`.

```text
backend/src/repository/session/
  mod.rs
  session_read_repo.rs
  session_write_repo.rs
  session_bill_repo.rs
  session_debt_repo.rs
  session_participant_repo.rs
  session_import_export_repo.rs
  session_stats_repo.rs
```

`SessionRepository` có thể còn là facade tạm để giữ call sites ổn định:

```text
SessionRepository
  -> bills()
  -> debts()
  -> participants()
  -> import_export()
```

### Thứ Tự Tách

1. Tách read/list/detail queries ít rủi ro.
2. Tách participant operations.
3. Tách bill operations.
4. Tách debt recalculation/persistence.
5. Tách import/export.
6. Xóa dead wrappers.

### Không Nên Làm

- Không vừa tách vừa đổi behavior debt calculation.
- Không đổi public API trong phase modularization nếu không bắt buộc.
- Không tạo abstraction generic repository phức tạp.

### Tiêu Chí Đạt

- `session_repo.rs` giảm còn facade hoặc biến mất.
- Mỗi module session repository có trách nhiệm rõ.
- Existing tests/manual flow vẫn pass.
- SQLx offline cache được refresh nếu query đổi.

## Phần 6: Modularize Session API

### Vấn Đề

`backend/src/api/sessions/mod.rs` 1886 LOC trộn routing, DTO, handlers, validation, business orchestration.

### Hướng Tách Đề Xuất

Tách route family theo behavior:

```text
backend/src/api/sessions/
  mod.rs                  # route wiring + shared exports
  dto.rs                  # shared request/response types
  session_handlers.rs     # create/read/update/archive/close
  bill_handlers.rs
  participant_handlers.rs
  debt_handlers.rs
  import_export_handlers.rs
  stats_handlers.rs
  authz.rs                # session ownership helpers nếu local
```

`mod.rs` chỉ giữ:

- `router(state)`.
- route nesting.
- module exports.

### Tại Sao Làm Sau Money

Money bugs là correctness. API split là maintainability. Nếu làm API split trước, có thể kéo theo refactor lớn trong khi recurring/front money vẫn sai.

### Tiêu Chí Đạt

- `mod.rs` chủ yếu là wiring.
- Handler files không chứa unrelated route family.
- DTO shared không bị duplicate.
- Không đổi URL/response shape trừ phần money contract đã quyết định.

## Phần 7: Scheduler Decoupling

### Vấn Đề

Scheduler hiện:

- Coupled API DTO như `PayerInput`, `SplitDetailInput`.
- Tự query SQL raw nhiều phần.
- Hardcode exchange rate `1.0`.
- Convert money qua `f64`.
- Có `unwrap`.
- CUSTOM split bị default sang EQUAL.

### Hướng Xử Lý

1. Tạo domain-level input cho bill creation, không dùng API DTO.
2. Scheduler gọi service/domain operation kiểu:

```text
RecurringExecutionService
  -> load_due_expenses
  -> build_bill_from_recurring
  -> create_bill_and_recalculate_debts
  -> record_execution_result
```

3. Inject dependencies:
   - pool/repositories.
   - FX provider/config.
   - clock nếu test cần.
4. Per-item isolation:
   - transaction theo recurring item.
   - fail item thì rollback item đó.
   - loop tiếp tục.
5. Metrics:
   - due_count.
   - processed_count.
   - skipped_count.
   - failed_count.
   - duration.

### FX Quyết Định

Vì mục tiêu vận hành tốt nhưng chưa production:

- Short-term: nếu recurring currency khác session base thì reject validation hoặc require explicit exchange_rate.
- Không silent dùng `1.0`.
- External FX tự động để sau, khi product cần multi-currency recurring thật.

### Deployment Quyết Định

Red-team bắt đúng điểm thiếu: nếu scheduler có thể chạy ở nhiều dyno/process, `FOR UPDATE` theo item chưa đủ để biến thiết kế thành rõ ràng ở cấp vận hành. Vì hiện mục tiêu là vận hành tốt nhưng chưa scale nhiều instance, cần chốt một trong hai:

| Lựa chọn | Đánh giá |
|---|---|
| Single scheduler process/dyno | Đơn giản nhất cho P0; phải ghi rõ vào deploy docs/config. |
| PostgreSQL advisory lock quanh scheduler tick | Tốt hơn nếu có khả năng nhiều process; thêm ít complexity, đáng cân nhắc. |
| Redis distributed lock | Chưa cần nếu Postgres đã có và Redis optional. |

Khuyến nghị: **dùng PostgreSQL advisory lock nếu scheduler vẫn nằm trong web process có thể scale >1**. Nếu chắc chắn chỉ một process, document hard constraint và để distributed lock sang sau.

### Tiêu Chí Đạt

- Scheduler không import API session DTO.
- Không hardcode `1.0` khi currency khác base.
- CUSTOM behavior explicit.
- Test scheduler bằng fake clock/repo hoặc integration DB.

## Phần 8: Authz Pass

### Vấn Đề

JWT role claims có, auth middleware có, nhưng enforcement per operation cần audit. Với app tiền, lỗi authz có thể cho user sửa bill/session/debt không thuộc quyền.

### Hướng Xử Lý

1. Liệt kê toàn bộ mutating endpoints:
   - sessions create/update/delete/archive/restore/close/reopen.
   - bills create/update/delete.
   - participants add/update/delete.
   - debts settle/request.
   - groups update/member changes.
   - recurring CRUD/pause/resume/skip/exception.
   - payments.
   - uploads.
   - admin.
2. Chuẩn hóa helper:

```text
require_session_owner_or_admin(user, session_id)
require_session_participant(user, session_id)
require_group_member(user, group_id)
require_group_owner_or_admin(user, group_id)
require_admin(user)
```

3. Đặt rule:
   - Read session: participant/member/admin.
   - Mutate bill/participant/session settings: owner/admin.
   - Settle own debt: payer/payee hoặc owner/admin tùy business rule.
   - Recurring: session owner/admin.
   - Admin endpoints: admin only, backend-enforced.
4. Thêm tests unauthorized/forbidden.

### Red-Team Correction

Report ban đầu nói “mutate bill/participant/session settings: owner/admin” như thể đó là hiển nhiên. Code hiện tại có dấu hiệu cho participant mutate bill/recurring. Đây không chỉ là bug kỹ thuật; đây là quyết định sản phẩm.

Phải chốt rule trước khi viết test:

| Operation | Option A | Option B | Khuyến nghị |
|---|---|---|---|
| Create bill | participant active được tạo | owner/admin only | Participant active được tạo bill, nhưng chỉ sửa/xóa bill của mình hoặc owner/admin. |
| Update/delete bill | creator hoặc owner/admin | owner/admin only | Creator hoặc owner/admin. |
| Add/remove participant | owner/admin | participant self-service | Owner/admin. |
| Create recurring | participant active | owner/admin only | Owner/admin, vì recurring tự sinh bill tương lai. |
| Pause/resume/delete recurring | creator hoặc owner/admin | owner/admin only | Owner/admin. |
| Settle debt | payer/payee involved | owner/admin | Payer request, payee confirm, owner/admin override nếu cần. |

Không chốt matrix này thì `/ck:plan --tdd` sẽ viết test sai business.

### Authz Brainstorm Sâu Hơn

Authz của SplitBuddy không nên đơn giản hóa thành “owner làm hết, member chỉ xem”. App chia tiền nhóm cần cho người tham gia nhập hóa đơn của chính họ; nếu khóa mọi bill mutation cho owner thì UX sẽ gượng và làm owner thành bottleneck. Nhưng recurring, participant management và destructive actions phải chặt hơn vì ảnh hưởng tương lai hoặc ảnh hưởng người khác.

Các actor thực tế:

| Actor | Ý nghĩa |
|---|---|
| Anonymous | Chưa login; không được vào protected API. |
| Authenticated non-participant | User login nhưng không thuộc session/group. |
| Session participant | Người đang trong session, có thể là registered user. |
| Bill creator | Participant đã tạo bill cụ thể. |
| Session owner | Người tạo/quản lý session. |
| Group admin/member | Role trong group nếu session thuộc group. |
| Debt payer | Người nợ tiền trong debt. |
| Debt payee | Người được nhận tiền trong debt. |
| Admin | System admin. |

Nguyên tắc đề xuất:

1. **Read không được public.** Session/debt/bill chỉ participant hoặc admin đọc được. Nếu session thuộc group, group member có thể đọc summary nếu product muốn, nhưng chi tiết bill vẫn nên participant/session member.
2. **Create bill nên mở cho active participant.** Đây là core collaboration. Không nên bắt owner nhập hết bill.
3. **Update/delete bill nên giới hạn creator hoặc owner/admin.** Participant khác không được sửa bill người khác.
4. **Participant management nên owner/admin.** Add/remove/deactivate participant ảnh hưởng debt graph toàn session.
5. **Recurring nên owner/admin.** Recurring tự sinh bill tương lai, có scheduler side effect; không nên để mọi participant tạo automation.
6. **Debt settlement nên theo role trong debt.** Payer request, payee confirm. Owner/admin chỉ override khi cần vận hành.
7. **Session close/reopen/archive/delete nên owner/admin.** Đây là lifecycle-level action.
8. **Group management theo group role.** Group admin quản lý member/group settings; group member chỉ xem/tạo session nếu product cho phép.
9. **Admin endpoints không dựa frontend flag.** Backend phải enforce admin role.

Matrix đề xuất chi tiết:

| Resource/Action | Non-participant | Participant | Creator | Owner | Group admin | Admin | Khuyến nghị |
|---|---:|---:|---:|---:|---:|---:|---|
| Read session detail | Deny | Allow | Allow | Allow | Deny nếu không phải participant | Allow | Group admin không được quản lý/xem session chỉ vì là group admin. |
| Create bill | Deny | Allow | Allow | Allow | Deny nếu không phải participant | Allow | Active participant được tạo bill. |
| Update own bill khi session active | Deny | Deny | Allow | Allow | Deny nếu không phải participant | Allow | Creator/owner/admin. |
| Delete own bill khi session active | Deny | Deny | Allow | Allow | Deny nếu không phải participant | Allow | Creator/owner/admin. |
| Update/delete bill khi session closed | Deny | Deny | Deny | Deny hoặc reopen trước | Deny | Allow | Bill creator không được sửa/xóa sau khi closed. |
| Update/delete others' bill | Deny | Deny | Deny | Allow nếu active | Deny nếu không phải participant | Allow | Owner/admin. |
| Add participant | Deny | Deny | Deny | Allow | Deny nếu không phải participant | Allow | Owner/admin. |
| Remove participant | Deny | Deny | Deny | Allow | Deny nếu không phải participant | Allow | Remove luôn theo quyết định anh; cần recalc/audit/notification. |
| Close/reopen session | Deny | Deny | Deny | Allow | Deny nếu không phải participant | Allow | Owner/admin. |
| Archive/delete session | Deny | Deny | Deny | Allow | Deny nếu không phải participant | Allow | Owner/admin. |
| Create recurring | Deny | Deny | Deny | Allow | Deny nếu không phải participant | Allow | Owner/admin only. |
| Update/pause/resume/delete recurring | Deny | Deny | Deny | Allow | Deny nếu không phải participant | Allow | Owner/admin only. |
| Add recurring exception | Deny | Deny | Deny | Allow | Deny nếu không phải participant | Allow | Owner/admin only. |
| Request settlement | Deny | Debt payer only | N/A | Optional | N/A | Allow | Payer requests. |
| Confirm settlement | Deny | Debt payee only | N/A | Optional | N/A | Allow | Payee confirms. |
| Force settle debt | Deny | Deny | N/A | Allow + notify members | Deny nếu không phải participant | Allow + notify members | Owner/admin override phải phát notification. |
| Guest settlement | Deny | N/A | N/A | Allow | Deny nếu không phải participant | Allow | Owner/admin xử lý thay guest. |
| Subscribe WS session | Deny | Allow | Allow | Allow | Deny nếu không phải participant | Allow | Must verify before adding subscription. |
| Upload receipt for bill | Deny | Deny | Bill creator nếu active | Allow nếu active | Deny nếu không phải participant | Allow | Match bill update permission; closed thì không sửa. |
| Upload avatar | Own user only | Own user only | Own user only | Own user only | Own user only | Allow | User owns own avatar. |

Quyết định đã chốt từ anh:

1. **Group admin không được quản lý session trong group nếu họ không phải participant.**
   - Hệ quả: session authz dựa trên session participant/owner/admin, không dựa vào group admin mặc định.
   - Nếu muốn group-level oversight sau này, phải là feature riêng.

2. **Active participant được tạo bill.**
   - Hệ quả: create bill không owner-only.
   - Update/delete vẫn phải giới hạn creator/owner/admin.

3. **Bill creator không được sửa/xóa bill sau khi session closed.**
   - Hệ quả: mutation bill phải check session status.
   - Muốn sửa thì owner/admin reopen session trước.

4. **Owner được force settle debt nhưng phải thông báo cho các member khác.**
   - Hệ quả: force settle phải tạo notification/event.
   - Nên audit log action này.

5. **Remove participant đã có bill/debt: remove luôn.**
   - Hệ quả kỹ thuật lớn: phải định nghĩa rõ remove là hard delete hay semantic remove.
   - Khuyến nghị triển khai: dùng semantic remove/deactivate dưới hood nếu DB cần giữ bill/debt history, nhưng UI/API gọi là remove.
   - Nếu hard delete thật, phải xử lý FK, bill payer/split detail/debt history và audit trail. Đây là rủi ro dữ liệu cao.

6. **Guest participant settlement xử lý qua owner/admin.**
   - Hệ quả: guest không có self-service settlement.
   - Owner/admin action phải ghi rõ actor thực hiện thay guest.

### Critical Trade-Off

Không nên overbuild RBAC table lúc này. Role/ownership helper đủ. Permission matrix động để sau.

### Tiêu Chí Đạt

- Mỗi mutating endpoint có authz check đọc được.
- Test 401/403 cho core money endpoints.
- Feature flag admin không chỉ guard ở frontend.

## Phần 9: WebSocket Hardening

### Vấn Đề

WebSocket model hiện tốt: ticket single-use + TanStack invalidation. Red-team kiểm tra cho thấy client đã lấy ticket mới trong `connect()`, nên trọng tâm không phải “client luôn dùng ticket cũ”. Trọng tâm đúng là server-side subscribe authz và cách báo lỗi WS auth/subscription.

- Server subscribe session chưa chứng minh có ownership/participant check.
- Client error path dựa vào HTTP status không đủ cho lỗi xảy ra sau upgrade.
- Redis path/deprecated calls.
- Event ordering/duplicate invalidation.
- Presence/re-render pressure.
- Authz khi subscribe session/group.

### Hướng Xử Lý

1. Ticket lifecycle:
   - Client lấy ticket mới trước mỗi connect/reconnect.
   - Nếu auth/subscription fail sau upgrade, server gửi close code/message rõ.
   - Ticket TTL rõ trong response và client honor TTL.
2. Subscribe authorization:
   - Server verify user có quyền session/group trước khi subscribe.
   - Không cho client tự gửi `session_id` bất kỳ rồi push vào subscription set.
3. Event semantics:
   - Bill mutation phát `BillUpdated` + `DebtsRecalculated`.
   - Client invalidate query keys đúng, không tự tính debt phức tạp.
4. Staleness:
   - Optimistic update chỉ cho immediate UX.
   - Server event/refetch là source of truth.
5. Redis:
   - Update deprecated calls.
   - Nếu Redis absent, local mode behavior rõ.

### Không Nên Làm

- Không build full event sourcing.
- Không cố đảm bảo total ordering toàn hệ thống khi chưa multi-instance production.
- Không dùng WS để thay thế API state; TanStack vẫn là source cache.

### Tiêu Chí Đạt

- Reconnect luôn dùng fresh ticket.
- Subscribe session trái quyền bị reject.
- WS auth/subscription failure có close code hoặc event lỗi mà client xử lý được.
- Bill/debt mutation trên một tab cập nhật tab khác qua invalidate.
- Redis off local dev vẫn hoạt động.

## Phần 10: CI Guardrails

### Vấn Đề

Standards mạnh hơn enforcement. Nếu không siết CI, cùng loại lỗi sẽ quay lại.

### Guardrails Đề Xuất

1. Frontend:
   - Ban `any` trong critical paths trước.
   - Sau khi fix hot paths, nâng `@typescript-eslint/no-explicit-any` lên error toàn repo hoặc theo override.
   - `npm run type-check`.
   - `npm run build`.
2. Backend:
   - grep guard `f64|f32` trong money modules.
   - grep report `unwrap|expect` trong `backend/src`, exclude tests.
   - `SQLX_OFFLINE=true cargo build`.
   - `cargo test`.
3. File size:
   - Ban cứng ngay có thể gây nhiễu vì repo hiện nhiều file lớn.
   - Round này nên report top files.
   - Hard fail chỉ với files touched vượt thêm ngưỡng hoặc new files >200 LOC.
4. Manual QA:
   - money matrix.
   - recurring run.
   - WS two-tab invalidation.
   - authz negative cases.

### Tiêu Chí Đạt

- CI bắt được float money regression.
- CI bắt được explicit any sau khi hot paths fixed.
- CI không bị biến thành noise làm dev ignore.
- Không còn `|| true` trên frontend type-check/build trong gate được dùng để merge.

## Thứ Tự Thực Hiện Khuyến Nghị

### Tuần 1: P0 Money Trust + Gate Thật

1. Backend recurring Decimal.
2. API money string contract.
3. Frontend Decimal helper.
4. Fix `BillInput`, `SessionDetailPage`, `DebtBreakdown`, `DebtsPage`.
5. Decide recurring envelope normalization.
6. Fix `make check` hoặc tạo gate command fail thật.
7. Recurring tests + manual money QA.

Lý do: nếu tiền chưa đúng, mọi thứ khác chỉ là trang trí.

### Tuần 2: P0 Runtime Safety + Scheduler

1. Remove runtime unwrap/expect.
2. Scheduler per-item isolation.
3. Scheduler no API DTO coupling.
4. Explicit recurring CUSTOM/FX behavior.
5. Decide scheduler single-process vs advisory lock.
6. Push graceful failure.
7. Minimal integration test harness.

Lý do: nền phải không tự chết khi data/config edge case xuất hiện.

### Tuần 3: P1 Session Modularization

1. Continue existing partial split; do not restart from scratch.
2. Reduce wrappers that delegate back to god object.
3. Split `session_repo.rs`.
4. Split `api/sessions/mod.rs`.
5. Giữ route/response shape.
6. Chạy regression flow.

Lý do: sau money/runtime, maintainability là blocker lớn nhất cho feature tiếp.

### Tuần 4: P1 Authz + WS + CI Hardening

1. Chốt authz matrix trước khi sửa.
2. Mutating endpoint checks.
3. WS server-side subscribe authz.
4. WS close/error semantics.
5. CI guardrails mở rộng.
6. Docs update.

Lý do: trước khi quay lại product feature, cần khóa quyền và realtime consistency.

## Rủi Ro Và Cách Giảm

| Rủi ro | Mức | Giảm rủi ro |
|---|---:|---|
| Refactor money làm vỡ DTO frontend/backend | Cao | Làm contract table trước, update types cùng API, test build cả hai. |
| Decimal rounding frontend khác backend | Cao | Dùng cùng nguyên tắc remainder deterministic, backend là source of truth. |
| Session modularization tạo regression | Cao | Tách mechanical trước, không đổi behavior cùng lúc. |
| CI siết quá nhanh làm block toàn repo | Trung bình | Siết critical paths trước, report-only cho file size. |
| Authz thay đổi UX hiện tại | Trung bình | Matrix rõ owner/member/admin trước khi sửa. |
| Scheduler refactor kéo dài | Trung bình | Cắt FX external ra khỏi phase này, chỉ explicit reject/require rate. |
| Giả định không có data thật sai | Cao | Xác nhận trạng thái Heroku/data trước plan; nếu có data thật, thêm migration/backfill policy. |
| `make check` không fail thật | Cao | Sửa gate trước khi dùng làm exit criterion. |
| WS subscribe trái quyền | Cao | Server-side authz khi subscribe, không chỉ auth ticket. |
| TDD thiếu integration harness | Cao | Tạo test DB/factory tối thiểu trước recurring/scheduler/authz tests. |
| Remove participant “remove luôn” làm mất lịch sử tiền | Cao | Dùng semantic remove/deactivate dưới hood hoặc thiết kế hard delete rất kỹ với debt/bill history. |
| Force settle bị lạm dụng | Trung bình | Notification tới members + audit log bắt buộc. |

## Quyết Định Kỹ Thuật Đề Xuất

| Chủ đề | Quyết định |
|---|---|
| Money API | String. |
| Backend money | `Decimal`. |
| Frontend money calc | `decimal.js`. |
| Amount newtype | Để sau Phase 0/1. |
| Recurring compatibility | Không cần preserve production data; refactor mạnh. |
| CUSTOM recurring | Implement đúng hoặc reject rõ, không default EQUAL. |
| FX recurring | Không hardcode 1.0; require same currency hoặc explicit rate. |
| Recurring envelope | Normalize về `ApiResponse<T>` trong P0 nếu blast radius nhỏ. |
| Scheduler deployment | Single-process documented hoặc Postgres advisory lock. |
| Session repo/API | Tiếp tục partial split hiện có, giữ facade tạm, không restart. |
| Authz | Chốt business matrix trước; ownership helper, chưa cần permission engine. |
| WS | Server-side subscribe authz + close/error semantics. |
| CI file size | Report trước, hard fail cho new/touched offenders sau. |
| Plan split | P0 TDD trước, P1 foundation sau. |

## Quyết Định Đã Chốt Từ Anh

| Câu hỏi | Quyết định |
|---|---|
| Recurring `CUSTOM` | Implement đầy đủ ngay. |
| Recurring khác currency session base | Reject tạm, không hardcode FX, không tự dùng `1.0`. |
| Recurring API envelope | Normalize luôn về `ApiResponse<T>` trong P0. |
| Scheduler deployment | Thêm PostgreSQL advisory lock ngay. |
| TypeScript `no-explicit-any` | Siết toàn repo ngay sau khi hot paths được fix. |
| P0 plan scope | Loại session modularization khỏi TDD scope đầu tiên. |
| `/ck:plan --tdd` | Chưa làm; tiếp tục brainstorm sâu trước. |
| Group admin quản lý session nếu không phải participant | Không. |
| Active participant tạo bill | Có. |
| Bill creator sửa/xóa bill sau khi session closed | Không được. |
| Owner force settle debt | Được, nhưng phải thông báo cho các member khác. |
| Remove participant đã có bill/debt | Remove luôn. |
| Guest participant settlement | Owner/admin xử lý. |

Impact:

- P0 không còn chỉ là “fix money”, mà là **contract reset cho recurring**: Decimal/string, custom split đầy đủ, envelope chuẩn, scheduler lock.
- P1 session modularization vẫn quan trọng nhưng không được kéo vào P0.
- CI phải đi theo thứ tự: fix hot paths trước, sau đó bật no-explicit-any toàn repo; không bật trước khi code có đường sửa rõ.
- Authz đã có business decision đủ rõ để chuyển thành test matrix sau khi hoàn tất brainstorm.

## Acceptance Checklist

- [ ] Recurring backend không dùng float money.
- [ ] Recurring API request/response dùng string amount.
- [ ] Scheduler không parse Decimal từ float string.
- [ ] Scheduler xử lý lỗi từng item độc lập.
- [ ] Scheduler deployment rule được chốt: single process hoặc advisory lock.
- [ ] Recurring API envelope được chốt và types frontend khớp.
- [ ] Frontend core money không còn `parseFloat` trong calculation path.
- [ ] Frontend core API wrapper không còn `any`.
- [ ] Optimistic update typed và Decimal-safe.
- [ ] Production `unwrap/expect` được audit và xử lý.
- [ ] Session repo được tách khỏi god object.
- [ ] Session API được tách khỏi god object.
- [ ] Mutating endpoints có authz rõ.
- [ ] Authz matrix đã được chốt trước khi viết tests.
- [ ] Active participant được tạo bill, nhưng chỉ creator/owner/admin sửa/xóa khi session active.
- [ ] Bill mutation bị chặn khi session closed, trừ flow reopen/admin rõ ràng.
- [ ] Owner force settle tạo notification cho members và audit log.
- [ ] Remove participant giữ được money history hoặc có chiến lược hard delete an toàn.
- [ ] Guest settlement được owner/admin xử lý với actor rõ.
- [ ] WebSocket subscribe trái quyền bị reject ở server.
- [ ] WS auth/subscription failure client xử lý được.
- [ ] CI guardrails bắt float money và any critical path.
- [ ] Gate được dùng để merge không còn allow-fail type-check/build.
- [ ] `make check` hoặc gate thay thế pass và fail thật khi có lỗi.
- [ ] Manual QA money/session/recurring/WS/authz pass.

## Red-Team Findings

### Findings Được Chấp Nhận

1. **Giả định chưa production phải là quyết định đã xác nhận, không phải suy luận từ repo.** README có Heroku URL, nên nếu sau này có data thật thì recurring refactor phải thêm compatibility/backfill.
2. **Scope ban đầu quá rộng cho một plan TDD.** Tách P0 money/runtime/CI và P1 modularization/authz/WS.
3. **Session modularization đã bắt đầu một phần.** Vấn đề là refactor dang dở và wrappers delegate về god object, không phải chưa có structure.
4. **Authz nghiêm trọng hơn mô tả ban đầu.** Code hiện tại cho participant làm một số mutation; cần chốt business rule trước khi test/fix.
5. **WS trọng tâm là server subscribe authz.** Client đã lấy ticket mới trong connect path; lỗi còn lại là server cho subscribe session_id và client chưa xử lý tốt failure sau upgrade.
6. **`make check` chưa phải gate thật.** Type-check allow-fail thì không được dùng làm exit gate.
7. **Recurring response envelope drift.** Đổi money contract nên xử lý luôn hoặc ghi rõ giữ raw response.
8. **Scheduler deployment model chưa rõ.** Nếu nhiều process, cần lock hoặc hard constraint single scheduler.
9. **TDD thiếu integration harness.** Cần test DB/factory tối thiểu, không chỉ unit tests.

### Findings Không Đảo Chiều Quyết Định

- Red-team không bác bỏ hướng money Decimal/string.
- Red-team không bác bỏ freeze feature 2-4 tuần.
- Red-team không bác bỏ refactor recurring mạnh, với điều kiện xác nhận không có production data thật.
- Red-team không bác bỏ modularization, chỉ yêu cầu chuyển sang P1 và mô tả đúng là tiếp tục partial split.

## Câu Hỏi Còn Lại

1. Với recurring `CUSTOM`, anh muốn implement đầy đủ ngay hay reject tạm bằng validation cho đến khi UI rõ?
2. Với recurring khác currency session base, anh muốn reject tạm hay bắt user nhập explicit exchange rate?
3. Recurring API có normalize luôn về `ApiResponse<T>` trong P0 không?
4. Scheduler deployment chốt single process hay thêm PostgreSQL advisory lock ngay?
5. Authz matrix chọn thế nào cho create/update/delete bill và recurring?
6. Với CI `no-explicit-any`, anh muốn siết toàn repo ngay sau hot path hay chỉ critical paths trong 1-2 sprint?
7. P0 plan có loại session modularization khỏi TDD scope đầu tiên không? Khuyến nghị: có.
8. Sau report này, bước tiếp theo nên là `/ck:plan --tdd` cho P0 trước, không plan toàn bộ P0/P1 chung một lần.

Đã chốt trong trao đổi sau:

- Recurring `CUSTOM`: implement đầy đủ ngay.
- Recurring khác currency session base: reject tạm.
- Recurring API: normalize luôn về `ApiResponse<T>` trong P0.
- Scheduler: thêm PostgreSQL advisory lock ngay.
- Authz:
  - Group admin không quản lý session nếu không phải participant.
  - Active participant được tạo bill.
  - Bill creator không được sửa/xóa sau khi session closed.
  - Owner được force settle nhưng phải thông báo members.
  - Remove participant đã có bill/debt: remove luôn, nhưng cần thiết kế dữ liệu an toàn.
  - Guest settlement qua owner/admin.
- TypeScript `no-explicit-any`: siết toàn repo ngay sau hot path.
- P0 plan: loại session modularization khỏi TDD scope đầu tiên.
- Chưa chuyển sang `/ck:plan --tdd`; tiếp tục brainstorm sâu.
