# SplitBuddy Documentation Hub (Living Index)

**Last Reviewed / Organized:** 2026-05-31 (triệt để scout + reorganization trước /brainstorm)  
**Mục đích:** Single source of truth cho toàn bộ tài liệu dự án. Giúp developer nhanh chóng tìm living docs thay vì các plan cũ đã drift.

## Cấu trúc mới (sau reorganization)

### Living Documents (Luôn cập nhật, dùng cho development)
- **Guidelines & Standards**
  - [PROJECT_GUIDELINES.md](./guidelines/PROJECT_GUIDELINES.md) — Coding conventions, Decimal rule, no unwrap/any, DoD, API envelope, Git workflow (bắt buộc tuân thủ).

- **Architecture & Summaries (Single Source of Truth)**
  - [system-architecture.md](./architecture/system-architecture.md) — Kiến trúc layers thực tế vs ideal DDD, critical flows (recurring, WS, push, authz), tradeoffs, gaps.
  - [codebase-summary.md](./summaries/codebase-summary.md) — Tổng quan project hiện tại, feature status table, tech debt P0, key modules, risks.
  - [project-roadmap.md](./summaries/project-roadmap.md) — Phased plan P0 (money safety + any + unwraps) → P1 (modularize) → P2 (features), milestones, verification gates.

- **Deep Reviews & Audits**
  - [CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md](./reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md) — Báo cáo triệt để toàn bộ (god objects, 33 migrations, 74 .sqlx, frontend any/decimal, security, infra, P0-P2 exact file:line). Nguồn chính trước khi brainstorm hoặc implement.

- **Backend / Frontend Overviews**
  - [SplitBuddy Backend.md](./summaries/SplitBuddy Backend.md)
  - [SplitBuddy Frontend.md](./summaries/SplitBuddy Frontend.md)

- **Deployment & Operations**
  - [DEPLOYMENT.md](./deployment/DEPLOYMENT.md)
  - [SETUP.md](./deployment/SETUP.md)

- **Supporting Current Docs** (giữ flat vì nhỏ)
  - [RELEASE_NOTES.md](./RELEASE_NOTES.md)
  - [BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md)
  - [CACHE_STRATEGY.md](./CACHE_STRATEGY.md)
  - [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)
  - [ROLLOUT_CHECKLIST.md](./ROLLOUT_CHECKLIST.md)

### Historical / Archived Plans (Chỉ tham khảo, đã drift)
Tất cả file plan cũ từ 2024 – đầu 2025 đã được chuyển vào:
**`docs/archive/2024-2025-plans/`**

Bao gồm:
- SPRINT_1_PLAN.md, SPRINT_2_PLAN.md, SPRINT_3_PLAN.md
- EXECUTION_PLAN_2_6_MONTHS.md
- UI_TRANSFORMATION_VINTAGE_PAPER.md
- GAMES_ROADMAP.md
- Roadmap & Tasks.md
- TRANSITION_ANALYSIS.md
- UX_FLOWS.md
- Architecture Plan.md (cũ)

**Lý do archive:** Nội dung đã obsolete so với codebase hiện tại (33 migrations, recurring, feed, payments, personas, social, god objects, f64 recurring bug, frontend any clusters, v.v.). Dùng để lịch sử, không làm basis cho feature mới.

## Hướng dẫn sử dụng trước khi /brainstorm hoặc phát triển
1. Đọc [codebase-summary.md](./summaries/codebase-summary.md) + [CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md](./reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md) để nắm "hiểu đúng và đủ".
2. Xem [project-roadmap.md](./summaries/project-roadmap.md) cho P0 gate (không thêm feature khi còn debt tiền + god objects).
3. Tuân thủ [PROJECT_GUIDELINES.md](./guidelines/PROJECT_GUIDELINES.md) 100%.
4. Sau khi implement → cập nhật các living docs trên + deep review.

## Lịch sử thay đổi cấu trúc
- 2026-05-31: Scout triệt để lần cuối + reorganization folder (tạo subdirs, archive 10+ old plans, tạo index này, cập nhật root README). Chuẩn bị sạch sẽ cho /brainstorm và development an toàn.

---

**Liên hệ / Cập nhật:** Mọi thay đổi lớn phải cập nhật living docs và index này. Đây là tài liệu sống (living documents).

Root README.md cũng đã được cập nhật section Documentation để trỏ về đây.