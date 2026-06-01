# SplitBuddy Project Roadmap

**Last Updated:** 2026-06-01  
**Status:** Current  
**Principle:** stabilize money and maintainability before feature expansion.

## Phase 0: Stabilization

Target: 1-2 weeks.

| Work | Priority | Done When |
|---|---:|---|
| Recurring `f64` -> Decimal | P0 | Done: domain, repo, API, scheduler, DTOs, snapshots, tests use Decimal/string money. |
| Frontend money typing | P0 | Done for core paths: no `any`/`parseFloat` in bill/debt/recurring optimistic paths. |
| Production unwrap/expect removal | P0 | Done for target paths: scheduler/startup/push/recurring date paths return errors or log-and-skip safely. |
| Manual money QA | P0 | Uneven split, fractional values, recurring run, debt netting verified. |
| CI policy prep | P0 | Done: type-check is enforced and money guard blocks recurring floats plus core frontend `any`/`parseFloat`. |

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
| Modularize `session_repo.rs` | P1 | Bills, debts, participants, export/import, listing live in separate repository modules. |
| Modularize session API | P1 | Handlers split by route family; `mod.rs` only wires routes/shared DTOs. |
| Decouple scheduler | P1 | Scheduler uses domain/repo contracts, injected FX/config, metrics, jitter, error isolation. |
| Authz pass | P1 | Mutating endpoints and admin flows have explicit ownership/role checks. |
| WebSocket hardening | P1 | Reconnect/ticket expiry semantics and Redis paths verified. |
| Upload lifecycle | P1 | Ownership-aware static access/deletion policy decided and implemented if needed. |

Exit gate:
- Largest touched modules below practical file-size threshold.
- No new money-path `any`, `number`, `f64`, `parseFloat`.
- Scheduler failure of one recurring item cannot stop the loop.

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
- Distributed scheduler lock for multi-instance deployment.
- Per-user and per-route rate limiting.
- Observability for scheduler, cache hit rate, WS fanout, API errors, money mutation latency.
- Upload malware scanning if receipts/QR become high-risk.
- Internationalization and first-class multi-currency.
- Mobile app only after PWA metrics justify it.

## Five Core Development Focus Points

1. **Money integrity:** Decimal/string contracts, no float math, typed optimistic updates, property/edge tests.
2. **Core flow reliability:** sessions, bills, debts, settlement, recurring, WebSocket invalidation.
3. **Modular maintainability:** split god objects before expanding feature surface.
4. **Security/ops hardening:** authz, CORS, VAPID, uploads, feature-flag enforcement, scheduler resilience.
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
