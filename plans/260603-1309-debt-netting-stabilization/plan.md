# Debt Netting Stabilization

## Context

- User focus: cấn trừ nợ.
- Backend core: `backend/src/repository/session/session_debt_repo.rs`.
- Domain core: `backend/src/domain/split_calculator.rs`.

## Scope

- Fix minimized debt balance aggregation.
- Use domain netting logic for minimized debts.
- Preserve settled payment history as offsets during recalculation.
- Clear stale settlement requests when bills change and debts are recalculated.
- Treat `settlement_requested` as still outstanding for session/user debt totals.
- Serialize debt recalculation per session to avoid concurrent delete/insert races.
- Turn settled overpayment into reverse residual debt after bill edits.
- Make settlement status transitions atomic at the database update boundary.
- Serialize settlement mutations with debt recalculation for the same session.
- Keep session debt advisory locking in one shared helper.
- Keep optimized debt UI from firing gross settlement actions when it displays netted/offset amounts.
- Net global registered-user debt rows by stable user id instead of session participant id.
- Route group simplified debts through the shared deterministic netting calculator.
- Apply settled session transfers in group member balances before group simplified debt netting.
- Ignore settled group-session transfers involving users outside the current group membership.
- Add tests for duplicate payer/split rows and deterministic netting behavior.
- Keep direct-mode debt reduction output deterministic.
- Keep API contracts unchanged.

## Todo

- [x] Add regression tests for duplicated payer/split balance inputs.
- [x] Replace joined minimized-debt aggregation with separate paid/owed aggregation.
- [x] Route minimized debt creation through `SplitCalculator`.
- [x] Subtract settled transfers from recalculated pending debt.
- [x] Clear stale `settlement_requested` rows during recalculation.
- [x] Include `settlement_requested` in outstanding debt totals/lists/stats.
- [x] Add transaction-scoped session lock for debt recalculation.
- [x] Emit reverse residual debt when a settled transfer exceeds recalculated same-pair debt.
- [x] Sort direct-mode reduced debts deterministically.
- [x] Guard settlement request/confirm/guest-settle updates with current-status predicates.
- [x] Guard settlement request/confirm/guest-settle with the same session advisory lock as recalculation.
- [x] Extract shared session debt advisory lock helper.
- [x] Gate optimized debt UI settlement actions to exact non-offset cases.
- [x] Add `counterpart_user_id` to debt summaries and group registered counterparties by it.
- [x] Replace group simplified debt local greedy logic with `SplitCalculator`.
- [x] Subtract settled group-session transfers in group member balances before simplified debt netting.
- [x] Restrict group settled offsets to transfers where both sides are current group members.
- [x] Run backend format/build/test and money guardrail.

## Success Criteria

- [x] Multiple payer rows and multiple split rows for the same participant do not multiply balances.
- [x] Minimized debts preserve total creditor/debtor amounts.
- [x] Later recalculations do not resurrect already settled debt as pending debt.
- [x] Settlement requests are invalidated by recalculation instead of staying stale.
- [x] Requested settlements remain visible as outstanding debt until confirmed.
- [x] Concurrent recalculations for one session are serialized.
- [x] Overpaid direct-mode debt can become refund/reverse debt instead of disappearing.
- [x] Direct-mode reduced debt output is deterministic.
- [x] Double-click/racing settlement transitions cannot update stale debt state.
- [x] Bill edits and settlement actions cannot interleave on one session's debt rows.
- [x] Netted UI does not submit full gross debt actions for offset aggregate rows.
- [x] Global optimized debt rows merge the same registered counterparty across sessions.
- [x] Group simplified debts use shared deterministic netting logic.
- [x] Group member balances and simplified debts do not resurrect already settled session transfers.
- [x] Removed/non-member participants do not skew current group member debt offsets.
- [x] `SQLX_OFFLINE=true cargo build` passes.
- [x] `cargo test` passes.
- [x] `make check-money` passes.
