# SplitBuddy Autonomous Upgrade Scout

Date: 2026-06-01

## Feature Inventory

| Area | Current Surface | Upgrade Direction |
|---|---|---|
| Auth/account | Register, login, JWT refresh, profile | tighten error typing, passkeys later, stronger session/device UX |
| Sessions | session detail, participants, bills, import/export, closure | split god page/API/repo, improve optimistic consistency, reduce stale totals |
| Bills/splits | equal/custom/weighted-ish UI, multi-payer | Decimal everywhere, clearer validation, stronger edit flow |
| Debts | personal debts, settlement, QR | settlement proof lifecycle, Decimal-safe netting everywhere |
| Groups | groups, group debts, simplified debts | Decimal-safe analytics, cleaner ranking/table UX, backend authz pass |
| Recurring | CRUD, exceptions, scheduler | production QA, history/exception UI, scheduler metrics |
| Payments | payment proof and transactions | reconciliation state machine, attachment lifecycle |
| Feed/social | activity feed, comments, likes | privacy/moderation, pagination polish |
| Games | multiple drinking games | extract game modules, reduce page bloat, persist history consistently |
| Music/mood | context-driven player and mood UI | split heavy contexts, reduce effects/polling, better mobile controls |
| Analytics/wrapped/personas | stats, year recap, gamification | Decimal-safe stats, faster charts, clearer empty states |
| Templates/import/export | session templates and import/export | typed import errors, preview before destructive import |
| Admin/flags | admin users, feature flags, music/audit | backend enforcement matrix, safer flag rollout |
| PWA/push/offline | SW, install prompt, push service | offline mutation states, push reliability, notification settings |
| Uploads | avatars/receipts/bank QR | deletion/ownership semantics, virus scanning later |

## Current Priority Stack

1. Money trust: every displayed/calculated money path must use string + Decimal helpers.
2. Core flow reliability: session -> bill -> debt -> settlement -> group debt must not drift between optimistic/client/server values.
3. Maintainability: split `session_repo.rs`, `api/sessions/mod.rs`, `SessionDetailPage`, `BillInput`, `GamesPage`.
4. UX quality: mobile touch targets, visible loading/empty/error states, no table overflow traps, no color-only meaning.
5. Runtime safety: remove remaining prod `expect`/`unwrap`, tighten config startup errors, authz matrix.
6. Product depth after core safety: recurring history, payments proof workflow, feed privacy, games polish.

## Completed This Slice

- `GroupDebtsPage.tsx` no longer uses `parseFloat`/`any` in group debt money calculations.
- Group debt totals, averages, ranking tie-breakers, member owed totals, and table totals use Decimal helpers.
- CI/make money guard now includes `GroupDebtsPage.tsx`.
- Docs now mark group-debt money as covered by core frontend money guardrails.

## Next Best Slices

1. `ImportExportModal` + Dashboard error typing: remove remaining core-flow `any` warnings.
2. `GroupDebtsPage` component split: extract filters, summary cards, ranking, matrix table.
3. Backend authz audit for groups/debts/recurring mutating endpoints.
4. `SessionDetailPage` split into query/mutation hook + layout sections.
5. `MusicContext`/`MoodContext` split to reduce rerenders and effect coupling.

## Verification

- `npm run type-check`: pass.
- `npm test`: pass, 5 money tests.
- `npm run build`: pass.
- `npm run lint`: pass with 53 existing warnings.
- `make check-money`: pass.

## Unresolved Questions

- Manual QA still needed on real group debt data with fractional non-VND currency.
- Legacy lint warnings remain outside this slice.
