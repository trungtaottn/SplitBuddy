# SplitBuddy Project Roadmap

**Last Updated:** 2026-06-04
**Status:** Current
**Principle:** stabilize money and maintainability before feature expansion.

## Phase 0: Stabilization

Target: 1-2 weeks.

| Work | Priority | Done When |
|---|---:|---|
| Recurring `f64` -> Decimal | P0 | Done: domain, repo, API, scheduler, DTOs, snapshots, tests use Decimal/string money. |
| Frontend money typing | P0 | Done for core paths: no `any`/`parseFloat` in bill/debt/group-debt/recurring plus dashboard/import/export/notification/feed/WebSocket/music/profile/sound/wrapped/greeting/chat/KingsCup/counter/offline/tooltip/install-prompt/error-boundary/onboarding/smart-suggestions/page-transition/swipe-action/button/toast/auth/feature-flag/theme/mood guarded paths; frontend lint and dependency audit are clean and enforced in local/CI gates; `BillInput` edit initializer keeps currency and weighted strategy stable; offline indicator cleanup removed duplicate status hook and dead skip-link helper. |
| Shared form validation | P0 | Done: numeric rules reject partial strings like `12abc`, accept finite trimmed numeric strings, are covered by Vitest, and are included in local/CI money guards. |
| Production unwrap/expect removal | P0 | Done for target paths: scheduler/startup config/AppState/push/recurring date/persona cutoff/AI slogan paths return errors, log-and-skip safely, or use safe fallback; backend API/config/main panic tokens are blocked by local and CI guardrails. |
| Manual money QA | P0 | Uneven split, fractional values, recurring run, debt netting verified. |
| CI policy prep | P0 | Done: type-check, zero-warning frontend lint, frontend dependency audit, money guard, and backend startup/API panic guard are enforced. |

Exit gate:

```bash
make check
```

Manual gate:
- Login.
- Create session.
- Add participants.
- Add multi-payer bill.
- Validate debt netting.
- Execute recurring sample.
- Confirm WebSocket invalidation.
- Close/reopen session.

## Phase 1: Foundation

Target: 2-4 weeks after Phase 0.

| Work | Priority | Done When |
|---|---:|---|
| Modularize `session_repo.rs` | P1 | Done: bills, debts, participants, lifecycle, minimize-debts, and listing/detail live in separate repository modules behind a facade. |
| Modularize session API | P1 | Done: handlers split by route family; `mod.rs` only wires routes/shared DTOs. |
| Decouple scheduler | P1 | Done: uses repository contracts, resolves FX through the shared FX utility, creates bill/debt/snapshot/next-run atomically, has config-injected jitter, Prometheus run metrics, and per-item error isolation. |
| Authz pass | P1 | Done for session/bill/participant/debt/recurring/import money-affecting mutations; seeded backend feature flags now gate matching session/debt/group/game/AI/notification APIs. |
| WebSocket hardening | P1 | Done for server-side session subscribe/activity authz and typed subscription rejection; Redis scale observation remains future work. |
| Upload lifecycle | P1 | Done: public static reads retained for current image rendering; app-uploaded avatar/receipt/bank QR files have owner/admin delete with path-safe filename validation. |

Exit gate:
- Largest touched modules below practical file-size threshold.
- No new money-path `any`, `number`, `f64`, `parseFloat`.
- Scheduler failure of one recurring item cannot stop the loop.
- `make check-foundation` passes authz/WS targeted tests and session split file-size guard.

## Phase 2: Product Completion

Target: after Phase 0/1.

| Area | Direction |
|---|---|
| Recurring | Exceptions UI, edit/history, push/WS integration, production FX behavior. |
| Payments/VietQR | Settlement proof, transaction lifecycle, admin/user reconciliation. |
| Feed/social | Confirm backend/frontend completeness, privacy rules, moderation/admin hooks. |
| Analytics/Wrapped/personas | Decimal-safe stats, stronger UX, clear feature flag boundaries. |
| Games | Clean dead code, improve custom questions/history/leaderboard. |
| Templates/import/export | Improve adoption and test coverage. |
| PWA | Offline states, install flows, haptics, push reliability. |

## Phase 3: Scale

Target: after product flows are stable.

- Money newtype (`Amount`) instead of raw Decimal/string scattered across layers.
- Observe distributed scheduler lock behavior under multi-instance deployment.
- Per-user and per-route rate limiting.
- Observability for scheduler, cache hit rate, WS fanout, API errors, money mutation latency.
- Upload malware scanning if receipts/QR become high-risk.
- Internationalization and first-class multi-currency.
- Mobile app only after PWA metrics justify it.

## Five Core Development Focus Points

1. **Money integrity:** Decimal/string contracts, no float math, typed optimistic updates, property/edge tests.
2. **Core flow reliability:** sessions, bills, debts, settlement, recurring, WebSocket invalidation.
3. **Modular maintainability:** split god objects before expanding feature surface.
4. **Security/ops hardening:** authz, uploads, scheduler resilience, targeted feature-flag enforcement for new gated surfaces.
5. **Product depth after stability:** payments, feed, personas, analytics, games, PWA polish.

## Do Not Start Yet

- New advanced payments.
- Deep analytics expansion.
- Multi-group/multi-org complexity.
- AI feature expansion.
- Large UI redesign.

These depend on Phase 0 money stability and Phase 1 modularity.

## Documentation Gate

Update these after each phase:
- [Project Overview & PDR](./project-overview-pdr.md)
- [Codebase Summary](./codebase-summary.md)
- [System Architecture](./system-architecture.md)
- [Code Standards](./code-standards.md)
- [Deep Review](./reviews/CODEBASE_DEEP_REVIEW_OPTIMIZATION_2026.md)
