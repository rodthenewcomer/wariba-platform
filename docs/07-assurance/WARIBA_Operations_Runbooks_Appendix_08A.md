# WARIBA Operations Runbooks — Appendix 08-A

These runbooks cover the Prompt 08 sandbox financial system. Production execution still requires approved infrastructure, providers, secrets, backup/restore evidence, and legal launch gates. Operators must preserve correlation IDs, immutable rows, ticks, fencing epochs, audit events, and reconciliation runs. Never edit ledger history; use compensating entries.

## 1. Realtime Process Crash

- **DETECTION:** process probe fails, WebSocket disconnects, or `realtime.started` disappears while DB/feed remain available.
- **IMPACT:** clients reconnect; the surviving standby should acquire a higher fencing epoch before tick-driven mutations resume.
- **IMMEDIATE SAFE ACTION:** route only to a node whose health reports `safe_to_accept_trading_traffic=true`; pause new exposure if no leader exists.
- **DIAGNOSIS:** inspect process exit, lease owner/expiry, latest epoch, feed state, DB connectivity, and outbox backlog.
- **RECOVERY:** restart the failed node as standby; never force its old epoch.
- **RECONCILIATION:** compare active pending orders, alerts, positions, fills, and notifications before/after takeover.
- **CUSTOMER/OPS COMMUNICATION:** announce temporary realtime interruption only if automatic reconnect exceeds the incident threshold.
- **POST-INCIDENT EVIDENCE:** process logs, health snapshots, epoch transition, takeover duration, reconnect count, and reconciliation result.

## 2. Leader Takeover

- **DETECTION:** `realtime.leadership_lost/acquired`, leader probe change, or takeover counter increment.
- **IMPACT:** one short processing pause; no stale leader may commit financial effects.
- **IMMEDIATE SAFE ACTION:** retain the new leader only; remove any node advertising an expired epoch from trading traffic.
- **DIAGNOSIS:** inspect lease expiry, DB clock, owner instance, epochs N/N+1, and stale-writer rejections.
- **RECOVERY:** allow normal lease acquisition; do not manually decrement or reuse an epoch.
- **RECONCILIATION:** prove one fill/alert per trigger identity and no lost active state.
- **CUSTOMER/OPS COMMUNICATION:** report degraded realtime only when takeover exceeds ten seconds or reconnect fails.
- **POST-INCIDENT EVIDENCE:** lease row, both node logs, measured takeover, stale mutation rejection, and browser resync proof.

## 3. Market-Data Outage

- **DETECTION:** feed state `OUTAGE`, market probe failure, or no valid tick beyond the locked threshold.
- **IMPACT:** new exposure, pending triggers, alerts, and price-based breaches stop; reductions wait for a fresh executable tick.
- **IMMEDIATE SAFE ACTION:** enable close-only intent/queued reduction; never substitute cached prices.
- **DIAGNOSIS:** inspect adapter connectivity, provider timestamps, ingest sequence, crossed/invalid prices, and last accepted tick.
- **RECOVERY:** enter `RECOVERING`, accept the first validated fresh sequence, then resume normal processing.
- **RECONCILIATION:** verify no fill, alert, risk floor, or breach used an outage tick.
- **CUSTOMER/OPS COMMUNICATION:** identify sandbox feed outage and explain queued safe reductions.
- **POST-INCIDENT EVIDENCE:** feed-state transitions, rejected-tick counts, last/first valid tick identities, and affected commands.

## 4. Market-Data Stale State

- **DETECTION:** tick age exceeds the policy threshold while the adapter remains connected.
- **IMPACT:** exposure increases and market-trigger actions are suspended without fabricating an outage path.
- **IMMEDIATE SAFE ACTION:** reject new exposure with `stale_market_data`; preserve cancellation and queued reduction.
- **DIAGNOSIS:** compare provider and receive timestamps, ingest sequence, DB time, and symbol-specific lag.
- **RECOVERY:** require a valid newer tick; discard duplicate/out-of-order data before leaving `RECOVERING`.
- **RECONCILIATION:** inspect every command/risk decision in the stale interval for zero price-based financial effect.
- **CUSTOMER/OPS COMMUNICATION:** show delayed-data blocking copy, not a generic order failure.
- **POST-INCIDENT EVIDENCE:** tick age, rejected commands by reason, recovery tick identity, and latency metrics.

## 5. Database Slowdown or Outage

- **DETECTION:** DB health fails, query latency rises, pool exhaustion appears, or lease renewals fail.
- **IMPACT:** leadership and authoritative mutations become unavailable; clients may still see process liveness but trading is unsafe.
- **IMMEDIATE SAFE ACTION:** remove nodes with `database_connected=false` from trading traffic; do not fail open.
- **DIAGNOSIS:** inspect pool, locks, long queries, migration state, storage, and Supabase/Postgres health.
- **RECOVERY:** restore DB service, confirm migrations, reacquire leadership, then reopen trading traffic.
- **RECONCILIATION:** run account financial reconciliation for commands whose acknowledgements overlapped the outage.
- **CUSTOMER/OPS COMMUNICATION:** state that commands are paused pending authoritative DB recovery.
- **POST-INCIDENT EVIDENCE:** DB metrics, lock/query evidence, lease history, command IDs, and reconciliation runs.

## 6. Pending-Order Dispute

- **DETECTION:** trader contests creation, trigger, price protection, cancellation, or duplicate fill.
- **IMPACT:** potential simulated account state dispute.
- **IMMEDIATE SAFE ACTION:** place an integrity hold when evidence conflicts; preserve safe closes/cancellations as policy allows.
- **DIAGNOSIS:** inspect order version/state, authoritative bid/ask, trigger tick identity, fencing epoch, idempotency key, and fill.
- **RECOVERY:** correct only through documented compensating action; never rewrite order/fill history.
- **RECONCILIATION:** reconstruct account balances and verify one terminal outcome under cancel/modify/trigger races.
- **CUSTOMER/OPS COMMUNICATION:** provide server timestamps and rule semantics without exposing internal secrets.
- **POST-INCIDENT EVIDENCE:** order versions, tick snapshot, transaction result, fill, audit event, and reconciliation run.

## 7. SL/TP Dispute

- **DETECTION:** trader contests attached protection, executable side, threshold, or manual-close race.
- **IMPACT:** disputed position close and realized PnL.
- **IMMEDIATE SAFE ACTION:** integrity hold the account if evidence is inconsistent; prevent further exposure.
- **DIAGNOSIS:** inspect authoritative position SL/TP, bid for long/sell execution, ask for short/buy execution, tick sequence, and close idempotency.
- **RECOVERY:** use a compensating entry only after approved investigation.
- **RECONCILIATION:** prove exactly one close fill across manual close versus SL/TP concurrency.
- **CUSTOMER/OPS COMMUNICATION:** explain executable bid/ask semantics and timestamped result.
- **POST-INCIDENT EVIDENCE:** position snapshot, trigger tick, close command, fill, ledger, and race-test analogue.

## 8. Daily Loss Dispute

- **DETECTION:** trader contests soft lock or daily floor.
- **IMPACT:** exposure increases remain blocked; reductions stay allowed.
- **IMMEDIATE SAFE ACTION:** keep the soft lock until authoritative reset/equity evidence is verified.
- **DIAGNOSIS:** recompute `max(SOD balance,SOD equity) - 3% nominal` from finalized UTC state and fresh prices.
- **RECOVERY:** clear only through the canonical next UTC reset/state transition, never manual balance editing.
- **RECONCILIATION:** compare snapshots, ledger, open-position equity, and duplicate finalization protection.
- **CUSTOMER/OPS COMMUNICATION:** show reference, limit amount, floor, current equity, and UTC reset time.
- **POST-INCIDENT EVIDENCE:** daily snapshot, market snapshots, risk transition, correlation ID, and calculations.

## 9. Maximum Loss Dispute

- **DETECTION:** trader contests hard breach or EOD trailing floor.
- **IMPACT:** account is permanently breached under the attached policy unless evidence proves a system error.
- **IMMEDIATE SAFE ACTION:** freeze exposure and preserve all daily/tick evidence.
- **DIAGNOSIS:** rebuild highest finalized eligible EOD balance and monotone floor; exclude ineligible short-duration gains.
- **RECOVERY:** follow formal dispute/compensation governance; never lower a valid floor ad hoc.
- **RECONCILIATION:** verify floor never decreased/exceeded nominal and duplicate finalization had no effect.
- **CUSTOMER/OPS COMMUNICATION:** provide policy version, finalized EOD inputs, floor, and breach equity.
- **POST-INCIDENT EVIDENCE:** policy hash, snapshots, fills, eligibility, floor history, tick, and audit trail.

## 10. Payout Calculation Dispute

- **DETECTION:** trader or Finance contests excess, cap, split, days, consistency, or debit.
- **IMPACT:** payout approval/settlement must pause.
- **IMMEDIATE SAFE ACTION:** keep payout freeze and run account reconciliation.
- **DIAGNOSIS:** inspect immutable eligibility snapshot and fresh approval-time state: buffer, eligible excess, days, split, cap, request, gross base.
- **RECOVERY:** reject/recreate before payment, or use formal reversal/compensation after payment.
- **RECONCILIATION:** prove trader cash + WARIBA share = gross base and debit = gross base without crossing buffer.
- **CUSTOMER/OPS COMMUNICATION:** provide the calculation components and current lifecycle status.
- **POST-INCIDENT EVIDENCE:** request snapshot, approval audit, provider records, ledger entries, and reconciliation run.

## 11. Duplicate Payout Attempt

- **DETECTION:** unique constraint/idempotency replay, duplicate browser/operator action, or duplicate provider callback.
- **IMPACT:** no second liability or debit should occur.
- **IMMEDIATE SAFE ACTION:** stop retries using new keys; retrieve the original result by payout/provider reference.
- **DIAGNOSIS:** compare payout ID, cycle, provider idempotency key, reference, debit, and cycle close.
- **RECOVERY:** resume reconciliation against the original request only.
- **RECONCILIATION:** assert one payout row, one debit, one settlement, one cycle transition.
- **CUSTOMER/OPS COMMUNICATION:** say the repeated request was safely deduplicated.
- **POST-INCIDENT EVIDENCE:** conflicting calls, unique/idempotency result, audit/outbox events, and ledger count.

## 12. Provider Payout Failure

- **DETECTION:** provider status `failed/returned`, reconciliation error, timeout, or backlog alert.
- **IMPACT:** request remains unpaid; submission must not be represented as settlement.
- **IMMEDIATE SAFE ACTION:** retain payout freeze and preserve provider reference/idempotency key.
- **DIAGNOSIS:** inspect submission result, reconciliation result, manual evidence, retryability, and destination state.
- **RECOVERY:** retry idempotently or use authorized manual reconciliation; never create a second provider reference casually.
- **RECONCILIATION:** confirm zero payout debit until provider-confirmed/manual settlement.
- **CUSTOMER/OPS COMMUNICATION:** communicate processing/failure honestly without claiming paid.
- **POST-INCIDENT EVIDENCE:** provider boundary records, timestamps, status transitions, operator, and correlation ID.

## 13. Payout Reversal

- **DETECTION:** confirmed need to reverse a paid sandbox payout with approved reason/evidence.
- **IMPACT:** account financial state and payout history require a compensating entry.
- **IMMEDIATE SAFE ACTION:** Finance rate-limited action only; place integrity hold if facts remain disputed.
- **DIAGNOSIS:** verify original payout, provider reference, debit, cycle, actor authority, and evidence.
- **RECOVERY:** execute one idempotent reversal; never mutate the original debit.
- **RECONCILIATION:** run before/after reconstruction and verify one reversal references the original ledger entry.
- **CUSTOMER/OPS COMMUNICATION:** explain reversal reason and resulting simulated account state.
- **POST-INCIDENT EVIDENCE:** original/reversal IDs, provider reference, actor/role, reason, timestamps, and audit event.

## 14. Account Reconciliation Mismatch

- **DETECTION:** stored versus reconstructed balance/program-eligible balance differs.
- **IMPACT:** critical incident and integrity hold block exposure/payout-sensitive operations.
- **IMMEDIATE SAFE ACTION:** keep hold; stop financial mutations except safe risk reduction.
- **DIAGNOSIS:** compare realized gains/losses, commissions, short-duration exclusions, payouts, reversals, and authorized adjustments.
- **RECOVERY:** repair the root defect and add an authorized compensating entry if governance approves.
- **RECONCILIATION:** rerun until matched; only a matched run may clear the hold.
- **CUSTOMER/OPS COMMUNICATION:** state that the account is protected during an integrity review.
- **POST-INCIDENT EVIDENCE:** mismatch breakdown, incident ID, hold, correction approval, matched run, and audit trail.

## 15. Treasury Reserve Deterioration

- **DETECTION:** coverage crosses below 1.5x or 1.2x, or forecast rises unexpectedly.
- **IMPACT:** future commercial exposure must reduce; already-earned payout entitlement remains intact.
- **IMMEDIATE SAFE ACTION:** follow zone controls: prudence/defensive/critical; disable new high-exposure sales in documented order.
- **DIAGNOSIS:** verify operating cash, tax reserve, payout reserve, unsettled PSP funds, and 30-day projection separation.
- **RECOVERY:** replenish payout reserve or reduce future sales/promotions; do not use simulated balances as cash.
- **RECONCILIATION:** reconcile reserve entries and known approved/pending liabilities.
- **CUSTOMER/OPS COMMUNICATION:** internal Finance/leadership escalation; public copy only if product availability changes.
- **POST-INCIDENT EVIDENCE:** reserve entries, forecast, ratio, zone transition, feature-flag audit, and approvals.

## 16. Security or Integrity Incident

- **DETECTION:** unauthorized Control attempt, role anomaly, abnormal rate, secret exposure, or unexplained financial mutation.
- **IMPACT:** possible account, staff, or financial evidence compromise.
- **IMMEDIATE SAFE ACTION:** revoke affected sessions/credentials, enable kill switches or holds, preserve logs, and avoid destructive cleanup.
- **DIAGNOSIS:** inspect server-side role decision, rate-limit counter, audit event, correlation ID, RLS, IP/session evidence, and mutation chain.
- **RECOVERY:** rotate secrets, correct permission/policy, restore trusted service, and compensate rather than rewrite financial history.
- **RECONCILIATION:** run affected account/payout reconciliation and verify audit continuity.
- **CUSTOMER/OPS COMMUNICATION:** follow legal/privacy escalation and communicate only verified impact.
- **POST-INCIDENT EVIDENCE:** immutable timeline, actors/roles, requests, audit/outbox, reconciliation, remediation, and approvals.

## Rollback and Migration Safety

Appendix 08-A migrations are forward-only. Disable new runtime writers first, preserve the leadership row and financial evidence, deploy the prior compatible application only if its schema reads remain valid, and use a new compensating migration for schema rollback. Never edit or delete an applied migration. Before re-enabling traffic, run clean reset, database assertions, RLS, integration, restart, failover, and reconciliation checks.

## Known Open Issue — Hub account-switcher navigation

**STATUS:** open, not fixed by Appendix 08-A. Recorded here rather than
closed silently, because the acceptance audit surfaced it and the E2E suite
routes around it.

**SYMPTOM:** clicking an account in the Hub account switcher (`/hub`,
`AccountSelector`) does not always commit the navigation. The link carries
the correct `href` (`/hub?account=<id>`), a real mouse click fires the
expected Next.js RSC request for the target account, and the address bar
then stays on the previous account. A synthetic DOM `click` sometimes
succeeds where a real mouse click does not, and the behaviour varies
between runs on an identical build, so it is timing-dependent rather than a
wiring error. Reproduced against `pnpm build && pnpm start`; the anchor node
is not being replaced between mousedown and mouseup (checked), and no
console error or failed response accompanies it.

**IMPACT:** a trader with more than one account may have to click twice, or
reload, to switch. No financial effect: account scoping is server-side, the
deep link `/hub?account=<id>` always resolves correctly, and nothing is
mutated by the failed interaction.

**WHY IT WAS NOT MASKED:** the previous E2E test appeared to cover account
switching but only ever clicked the link of the account already being
displayed, so the URL changed merely by gaining a query parameter and a real
switch was never exercised. The test now asserts the switcher's wiring by
`href` and verifies state isolation by navigating directly, so the isolation
guarantee is genuinely covered and this defect stays visible instead of
being absorbed by a vacuous assertion.

**IMMEDIATE SAFE ACTION:** none required; advise reload if reported.

**NEXT STEP:** investigate the Next.js client router's handling of a
same-route search-param navigation on a `force-dynamic` page under a
production build, before relying on client-side account switching in any
new flow.
