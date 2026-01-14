# SplitBuddy 2–6 Month Execution Plan

## Mục tiêu
- Mở rộng sản phẩm theo 6 hướng: multi-currency, recurring, default share/disable member, debt minimization toggle, import/export, UX “who pays next” + quick actions.
- Tối ưu trải nghiệm chia tiền cho nhóm đi du lịch, nhóm cố định và nhóm ăn nhậu thường xuyên.
- Giữ dữ liệu ổn định, tránh sai số tiền tệ và hạn chế thay đổi lịch sử.

## Quyết định đã chốt
- Base currency theo session; default lấy từ group nếu có, nếu không theo user, fallback `VND`.
- FX provider: `exchangerate.host` (khong can API key) + cho phép override thủ công từng bill; lưu `rate_source` + `rate_timestamp`.
- Rounding: dùng minor units ISO‑4217; half-up; phân bổ phần dư theo fractional lớn nhất để tổng = bill total.
- Timezone: lưu `sessions.timezone` (IANA), default group → user → `Asia/Ho_Chi_Minh`; timestamps lưu UTC.
- Import format: SplitBuddy CSV v1 (equal/weighted); custom split để v2.

## Phạm vi
- In scope (2–6 tháng): 6 hướng phát triển đã liệt kê + tài liệu + tối ưu DB.
- Out of scope (v2): custom split import, advanced FX rules, payment integrations.

## Định nghĩa trạng thái
- Not started: chưa triển khai.
- In progress: đang thực hiện.
- Blocked: phụ thuộc hoặc bị chặn.
- Done: hoàn tất, đã test và cập nhật docs.

## Definition of Done (DoD)
- DB migration chạy ổn, có rollback plan.
- API có test cơ bản, logic tiền tệ có unit test.
- UI có xử lý lỗi và copy giải thích rõ ràng.
- Docs cập nhật và có ví dụ cho trường hợp mới.

## Cách cập nhật tiến độ
- Cập nhật cột Status, Owner, Notes và Done date khi hoàn tất.
- Nếu thay đổi phạm vi, cập nhật phần Change log.
- Mỗi sprint cập nhật milestone và sprint status.

## Milestones
| Milestone | Nội dung | Target | Điều kiện hoàn thành | Status |
|---|---|---|---|---|
| M1 | Multi-currency + weighted/disable + minimization toggle + archiving | End S3 | MC/WS/DS/AR core done | Not started |
| M2 | Recurring expenses | End S5 | RE1–RE6 done | Not started |
| M3 | Import/Export + Who pays next + Quick actions | End S7 | IM + UX core done | Not started |
| M4 | Optional enhancements (CSV v2, FX override, auto-archive) | End S12 | Optional backlog done | Not started |

## Sprint Schedule
| Sprint | Weeks | Focus | Target SP | Status |
|---|---|---|---|---|
| S1 | 1–2 | MC/WS/DS/AR foundations | 18–24 | In progress |
| S2 | 3–4 | MC core + DS/AR | 18–24 | Done |
| S3 | 5–6 | MC UI + WS + DS UI + AR UI | 18–24 | In progress |
| S4 | 7–8 | Recurring core | 18–24 | Not started |
| S5 | 9–10 | Recurring + export + UX1 | 18–24 | Not started |
| S6 | 11–12 | Import SplitBuddy + UI wizard | 18–24 | Not started |
| S7 | 13–14 | Import Splitwise + Quick actions | 18–24 | Not started |
| S8 | 15–16 | UX polish + docs + stabilization | 16–20 | Not started |
| S9–S12 | 17–24 | Optional enhancements | 18–24 | Not started |

## Backlog chi tiết

### Multi-currency (MC)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| MC1 | DB migrations: currency fields + exchange_rates | 5 | - | S1 | Done | TBD | Includes sessions.timezone; migrations added. |
| MC2 | FX service + cache + manual override | 5 | MC1 | S2 | Done | TBD | |
| MC3 | Bill CRUD + debt calc dùng base currency | 8 | MC1 | S2 | Done | TBD | |
| MC4 | UI: currency selector + show original/converted | 5 | MC3 | S3 | Done | TBD | |
| MC5 | Tests + docs multi-currency | 3 | MC3 | S3 | Not started | TBD | |
| MC6 | Rounding engine ISO‑4217 + phân bổ dư | 3 | MC1 | S1 | Done | TBD | Split calculator updated + tests. |

### Default share/weight + Disable member (WS)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| WS1 | DB: default_weight + is_active | 3 | - | S1 | Done | TBD | Migration added. |
| WS2 | Weighted split logic | 5 | WS1, MC6 | S3 | Not started | TBD | |
| WS3 | UI: weight input + active toggle | 3 | WS1 | S3 | Not started | TBD | |
| WS4 | Tests + docs | 2 | WS2 | S7 | Not started | TBD | |

### Debt minimization toggle (DS)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| DS1 | DB: sessions.debt_strategy/minimize_debts | 2 | - | S1 | Done | TBD | Migration added (minimize_debts). |
| DS2 | Direct vs minimized debt calc | 5 | DS1 | S2 | Done | TBD | |
| DS3 | UI toggle + copy giải thích | 3 | DS2 | S3 | Done | TBD | |
| DS4 | Tests | 2 | DS2 | S3 | Not started | TBD | |

### Archiving groups/sessions (AR)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| AR1 | DB: archived_at cho group/session | 2 | - | S1 | Done | TBD | Migration added. |
| AR2 | API filter include_archived | 3 | AR1 | S2 | Done | TBD | |
| AR3 | UI archive/restore + restrictions | 3 | AR2 | S3 | Done | TBD | |
| AR4 | Tests + docs | 1 | AR3 | S7 | Not started | TBD | |

### Recurring expenses (RE)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| RE1 | DB: recurring_expenses + snapshot weights | 3 | WS1 | S4 | Not started | TBD | |
| RE2 | API CRUD + next_run theo timezone | 5 | RE1 | S4 | Not started | TBD | |
| RE3 | Scheduler + idempotency | 8 | RE2 | S4 | Not started | TBD | |
| RE4 | UI recurring list + pause/skip | 5 | RE2 | S4 | Not started | TBD | |
| RE5 | Notifications khi recurring tạo bill | 3 | RE3 | S5 | Not started | TBD | |
| RE6 | Tests | 3 | RE3 | S5 | Not started | TBD | |

### Import/Export (IM)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| IM1 | Export SplitBuddy CSV v1 (equal/weighted) | 5 | MC3 | S5 | Not started | TBD | |
| IM2 | Import SplitBuddy CSV v1 + preview | 8 | IM1 | S6 | Not started | TBD | |
| IM3 | Import Splitwise CSV + mapping | 8 | IM2 | S7 | Not started | TBD | |
| IM4 | UI wizard import/export | 5 | IM2 | S6 | Not started | TBD | |
| IM5 | Error report + audit log | 3 | IM2 | S6 | Not started | TBD | |

### UX “who pays next” + quick actions (UX)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| UX1 | Backend: suggestion “who pays next” | 3 | DS2 | S5 | Not started | TBD | |
| UX2 | UI card + quick create bill prefill | 3 | UX1 | S6 | Not started | TBD | |
| UX3 | Quick actions/long‑press + context menu | 5 | UX2 | S7 | Not started | TBD | |
| UX4 | UX copy/tooltips tránh hiểu nhầm | 2 | DS3 | S8 | Not started | TBD | |

### Platform/Docs (PL)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| PL1 | Docs cập nhật cho tính năng mới | 2 | MC3, RE3, IM2 | S8 | Not started | TBD | |
| PL2 | Indexing/Perf cho bảng mới | 3 | MC1, RE1 | S5 | Not started | TBD | |
| PL3 | Migration safety checklist | 2 | MC1 | S1 | Done | TBD | Added docs/MIGRATION_CHECKLIST.md. |
| PL4 | Release notes + rollout checklist | 2 | PL1 | S8 | Not started | TBD | |

## Optional Backlog (S9–S12)
| ID | Story | SP | Dependencies | Target Sprint | Status | Owner | Notes |
|---|---|---|---|---|---|---|---|
| MC7 | FX override UI + rate history | 5 | MC2 | S9 | Not started | TBD | |
| IM6 | SplitBuddy CSV v2 (custom splits) | 8 | IM2 | S10 | Not started | TBD | |
| RE7 | Recurring skip rules + exceptions UI | 5 | RE4 | S10 | Not started | TBD | |
| AR5 | Auto-archive khi settled + bulk archive | 5 | AR3 | S11 | Not started | TBD | |

## Rủi ro và giảm thiểu
- Sai số tiền tệ: lưu original + rate + converted; không recompute lịch sử.
- Recurring trùng bill: idempotency theo recurring_id + run_date.
- Import dữ liệu lỗi: preview + validation + error report.
- Minimization gây hiểu nhầm: copy giải thích + toggle rõ ràng.

## Change log
| Date | Version | Changes | Author |
|---|---|---|---|
| 2026-01-12 | v1 | Initial execution plan | TBD |
| 2026-01-12 | v1.1 | S1 kickoff: migrations, rounding engine, migration checklist | TBD |
| 2026-01-12 | v1.2 | S2: FX service, bill CRUD conversion, debt strategy, archive filter | TBD |
| 2026-01-12 | v1.3 | S3 UI: currency selector + debt toggle + archive UI | TBD |
