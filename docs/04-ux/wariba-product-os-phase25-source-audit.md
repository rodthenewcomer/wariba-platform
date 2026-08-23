# WARIBA Product OS — Phase 2.5 source audit

Baseline `feat/product-os-phase-2-current` @ `7de9631`. Working branch
`feat/wariba-product-os-phase-2-5-command-center`.

This note exists because §7 of the phase brief forbids building UI first and
finding the data source later. Everything below was read out of the baseline
branch and, where it concerns stored values, verified against the local
Postgres the migrations produce.

---

## 1. What already exists

The application layer is in better shape than the surfaces built on it. Almost
every figure the command centre wants is already computed by a read model that
owns the financial meaning.

| Read model | Gives us | Raw values exposed? |
|---|---|---|
| `risk-engine-inputs.ts` | The single loader behind risk + mission. Policy, balance, program-eligible balance, open positions, full `RiskEngineResult`. | n/a — internal |
| `risk-view.ts` | Daily-loss remaining, maximum-loss remaining, current equity, violations, status | **Yes** — `amounts.*` added in Phase 2 |
| `mission-view.ts` | Objective progress %, four conditions, consistency ratio/limit/best day, next action | **Yes** — `amounts.{realizedNetProfit,targetRequired,targetBalance}` |
| `hub-view.ts` | Balance, P&L today, 14 days of trading-day rows, balance history, `balanceHistoryMeaningful` | **No** — formatted strings only |
| `performance-analytics.ts` | Trade count, net P&L, win rate, profit factor, avg win/loss, win/loss ratio, expectancy, best/worst day, trading days, avg duration, streak, daily series, by-symbol, by-duration | **Yes** — raw + `Formatted` throughout |
| `journal-view.ts` | Closed round trips with entry/exit/duration/outcome, filters | Yes |
| `payout-lifecycle.ts` | 12 lifecycle states, KYC view, blocking reason, and `cycle` with available amount, buffer floor, realised balance, buffer progress %, performance days completed/required | Formatted + percent |
| `accounts-overview.ts` | Per-account balance, equity, daily/max room, health, progress %, consistency label, trading days, last activity | Formatted + `progressPercent` |
| `billing-view.ts` | Order history, provider, status, amounts, `SAVED_PAYMENT_METHODS_AVAILABLE = false` | Yes |
| `account-lifecycle.ts` | 12 lifecycle states, tone, `terminal`, `tradable`, journey index | n/a |
| `account-health.ts` | 4-state health from the worse of two real ratios | `roomPercent` |
| `offer-configuration.ts` | `buildOfferCatalog` — real products, prices, published policy rules | Yes |

**Conclusion:** Phase 2.5 needs very little new financial computation. It needs
a coherent projection and surfaces that actually render what is already there.

---

## 2. Historical vs current-only — the balance/equity question

§8 of the brief asks this be settled by audit before any chart is drawn.

`app.account_daily_snapshots` **does** have an `eod_equity` column
(`packages/database/src/schema.ts:213`). It is not, however, an independent
series:

```
packages/database/src/daily-finalization.ts:245-248
      eod_balance: eodBalance,
      // See module doc comment — no historical price feed to price open
      // positions exactly at the UTC boundary in V1.
      eod_equity: eodBalance,
```

`eod_equity` is written as a literal copy of `eod_balance`. The reason is
documented and sound: `services/worker` has no market-data connection, so there
is no way to mark open positions at the UTC boundary.

The same realized-only decision runs through the live path.
`risk-engine-inputs.ts` passes `currentUnrealizedPnl: '0'` with an approved
decision comment (DECISION_LOG, 2026-08-04), because no stored per-position
mark price exists outside the live WariX WebSocket session.

### Verdict — §8 Case B

- There is **no authoritative historical equity**. The column exists but carries
  zero additional information.
- Drawing "Balance" and "Equity" as two series would be drawing the same array
  twice under two labels — precisely what §8 forbids.
- **Decision:** the evolution chart draws *balance* history only, labelled
  balance, with the profit target and the maximum-loss floor as threshold lines.
  Current equity is surfaced as a live *metric*, not as a fabricated series.
- `HISTORICAL_EQUITY_READY = no — not persisted authoritatively`
- `NO_FAKE_EQUITY_SERIES = yes`

Under WARIBA ONE's realized-only rules, current equity equals current balance,
so no second number is being hidden from the trader either.

---

## 3. What can update live, and what cannot

| Value | Live? | Source |
|---|---|---|
| Balance, realised P&L today | Yes | `loadAccountBalanceProjection` recomputes from fills on every read |
| Daily-loss remaining, max-loss remaining, floor | Yes | `evaluateAccountRisk` on every read |
| Objective progress, consistency | Yes | same loader |
| Open position count | Yes | `app.positions` |
| Reset countdown | Yes, deterministically | Next UTC midnight (§4 below) |
| Performance KPIs, journal | Yes, but only change on a *close* fill | `app.fills` |
| Balance history / daily P&L bars | **No** — changes once a day | `account_daily_snapshots`, written by the daily finalisation job |
| Unrealised P&L on open positions | **No** | Requires the WariX WebSocket session; not stored |
| Historical equity | **No** | Not persisted (§2) |

The Hub is `force-dynamic` and server-rendered. Nothing polls today.

---

## 4. The reset boundary is authoritative

`daily-finalization.ts` partitions on UTC calendar days
(`next.setUTCDate(next.getUTCDate() + 1)`), and `account_daily_snapshots` is
uniquely keyed on `(account_id, trading_day)` where `trading_day` is a UTC date.
`performance-analytics.ts` groups by `occurredAt.toISOString().slice(0,10)` for
the same reason.

So "next reset" is **next UTC midnight** — deterministic, not a marketing
countdown. A machine-readable `nextResetAt` can be exposed honestly, and §13's
countdown is legitimate.

Today `risk-view.ts:113` returns the hardcoded display string `'00:00 UTC'` and
nothing machine-readable. That is the gap.

---

## 5. What must not be synthesized

- Historical equity (§2).
- Unrealised P&L outside a live WariX session.
- Any KPI on an account with no closed trades. `performance-analytics.ts`
  already returns `null` rather than `0` for every derived metric, and
  `KpiTile` already renders `null` as `—`. This behaviour must survive the
  redesign.
- Saved payment methods. `billing-view.ts:22` states
  `SAVED_PAYMENT_METHODS_AVAILABLE = false` and there is no vault.
- Journal notes, tags, setups — no persistence exists.
- A "recommended" offer or any discount — `buildOfferCatalog` has no
  merchandising field.
- KYC provider results — `kyc-state.ts:119` states
  `KYC_PROVIDER_INTEGRATED = false`; the state machine is real, the provider is
  sandbox.

---

## 6. What needs a new read model

Five genuine gaps, all presentation-level projections over values the domain
already owns. No new financial rule.

1. **`nextResetAt`** — machine-readable ISO timestamp for the next UTC
   midnight, plus `updatedAt`, so a client countdown recomputes from timestamps
   instead of decrementing a stale local number (§13).
2. **Raw telemetry on `hub-view`** — `balance` and `pnlToday` currently exist
   only as formatted strings. `hub/page.tsx:328` reconstructs a number with
   `Number.parseFloat(hubView.pnlTodayFormatted.replace(/[^\d.-]/g, ''))`, i.e.
   a locale-dependent regex over a display string. §12 forbids exactly this.
3. **Risk ratios** — `dailyRemainingPercent` / `maxRemainingPercent` for the
   progress bars in §12. `account-health.ts` already computes the same ratio
   internally; the percentages should be projected once, server-side, not
   recomputed per bar.
4. **One command-centre projection** (§9) that composes the above into a single
   coherent snapshot, so the page stops assembling seven read models and
   deriving meaning between them.
5. **"Has meaningful activity"** — §11 requires that a fresh account with an
   untouched budget not be praised as "Excellent". `deriveAccountHealth` today
   returns `excellent` for 100 % room regardless of whether anything happened.
   It needs to know that no session has closed and no trade has been taken.

---

## 7. What is test-fixture-only

`@wariba/test-utils` already seeds real accounts against a real database
(`hub-account-fixture.ts`, `lifecycle-fixture.ts`, `payout-account-fixture.ts`).
Every fixture user is `@wariba-test.invalid`, and each has a deterministic
teardown.

**Verified against the local database on 2026-08-23:**

```
app.trading_accounts        5
app.purchase_orders         5
app.account_daily_snapshots 2
app.fills                   0     ← nothing has ever been traded
app.positions               0
```

Zero fills is why Phase 2 could not visually prove Performance or Journal. There
was no trading record to render, so both surfaces were only ever photographed
empty.

Phase 2.5 therefore adds a **populated trading-record fixture** that writes real
`app.fills` rows and finalised snapshots — synthetic QA evidence, isolated to
test infrastructure, never imported by production code, never reachable by a
real user. It is reported separately from production values in the final
matrix.

---

## 8. Baseline gaps this phase closes

| # | Gap | Where |
|---|---|---|
| 1 | Hero shows 3 risk figures; no balance/target/room telemetry strip | `hub/page.tsx:325` |
| 2 | P&L sign derived by regex over a formatted string | `hub/page.tsx:328` |
| 3 | Risk shown as text rows; no visual room bars | `HealthPanel` rows |
| 4 | `nextResetLabel` is a hardcoded string, no countdown | `risk-view.ts:113` |
| 5 | Fresh account reads "Excellent" on zero activity | `account-health.ts` |
| 6 | Zero-account Hub is one card in a `max-w-2xl` | `hub/page.tsx:88` |
| 7 | No live telemetry; page is static until reload | `hub/page.tsx` |
| 8 | Performance/Journal never rendered with data | 0 fills |
| 9 | Payout cycle progress computed but not visualised | `payout-lifecycle.ts` `cycle` |
| 10 | Account cards oversized, not a portfolio | `comptes/AccountCard.tsx` |

---

## 9. Constraints honoured

Stack unchanged: React 19, Next 15, Tailwind v4, `motion`, `lightweight-charts`,
Phosphor, WARIBA tokens. No shadcn, no Recharts, no grid-layout, no new chart
framework, no new dependency.

WariX V1 frozen: no file under `apps/web/app/(trade)/` or the realtime service
is modified by this phase beyond what already exists on the baseline.
