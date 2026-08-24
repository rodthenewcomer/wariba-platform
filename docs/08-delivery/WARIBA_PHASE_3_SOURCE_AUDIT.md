# WARIBA — Phase 3 Source Audit

> ## Enregistrement daté — ne décrit plus l'état courant
>
> Ce document mesure le code **à sa date**. Trois tranches ont été livrées
> depuis : Phase 3.1A (déployabilité), Phase 3.2 (Support + Contestations) et
> le Centre d'aide. Six exigences ont changé d'état et la couverture est passée
> de 77,1 % à 80,4 %.
>
> **Pour l'état courant et le séquencement restant, voir
> `WARIBA_ROAD_TO_BETA_2026-08-24.md`.**
>
> Il est conservé tel quel : un audit réécrit après coup n'est plus un audit.


**Baseline:** `main` @ `8c061176ecdd521740af06c98c7b74930687133c`
**Branch:** `feat/wariba-phase-3-private-beta-completion`
**Method:** source inspection only. No screenshot, no memory of prior phases, and
no inference from documentation was accepted as evidence — every classification
below cites the file, table or config that proves it.

---

## 0. How to read this

| Class | Meaning |
|---|---|
| `IMPLEMENTED` | Present, working, and load-bearing today |
| `IMPLEMENTED_BUT_INCOMPLETE` | Real, but missing something private beta needs |
| `MISSING` | No source exists |
| `BLOCKED_BY_EXTERNAL_PROVIDER` | Cannot complete without a vendor decision or credential |
| `DOCUMENTATION_ONLY` | Described somewhere, not built |
| `OBSOLETE_REQUIREMENT` | The brief asks for something the repository has deliberately settled otherwise |

The single most useful artefact for this audit was `packages/database/src/schema.ts`.
It declares **42 tables**, and what is *absent* from that list settles most of
Phase 3's open questions faster than any amount of UI reading:

```
app.trading_accounts        app.fills              app.positions
app.trade_orders            app.pending_orders     app.price_alerts
app.account_daily_snapshots app.risk_violations    app.account_state_transitions
app.trading_ledger_entries  app.performance_cycles app.payout_requests
app.purchase_orders         app.payment_attempts   app.payment_events
app.receipts                app.products           app.product_versions
app.policy_versions         app.symbol_specs       app.market_bars
app.user_profiles           app.user_consents      app.staff_members
audit.audit_events          auth.users             … (42 total)
```

There is **no** `support_tickets`, `ticket_messages`, `attachments`, `disputes`,
`help_articles`, `user_preferences`, `waitlist`, `feedback`, or `beta_invites`.
Six of Phase 3's headline deliverables are settled by that one observation.

---

## 1. Product OS / Trader Hub — `IMPLEMENTED`

`apps/web/app/(platform)/` — 9 destinations, all server-rendered from
`buildCommandCenterView`. Lifecycle, telemetry, risk meters, reset countdown,
Launchpad, payout summary, journal table, performance analytics all present and
gated by Phase 2.5.1 evidence.

**Protected.** No Phase 3 work should touch these beyond defect fixes.

## 2. WariX workstation — `IMPLEMENTED`

`apps/web/app/(trade)/trade/` — 60+ modules: `TradeClient`, `TradeChart`,
`ExecutionPanel`, `ChartToolbar`, `ChartDrawingLayer`, `ChartContextMenu`,
`NotificationCenter`, `WorkstationShell`, `MobileToolsSheet`, `WariXGate`,
pending orders, position overlays, protections, alerts.

**Protected.** Phase 3 extends; it does not rebuild.

## 3. Chart engine — `IMPLEMENTED`

`lightweight-charts` with WARIBA-owned adapters: `chart-renderer-adapters.ts`,
`chart-history-transport.ts`, `chart-history.ts`, `chart-execution-markers.ts`,
`chart-price-format.ts`, `chart-drawing-model.ts` / `-geometry` / `-store`.

## 4. Chart preferences — `IMPLEMENTED_BUT_INCOMPLETE`

`chart-preferences.ts` covers candles, wicks, borders, body/border/wick
visibility, grid, crosshair, magnet, price/bid/ask lines, labels, scales,
timezone, watermark — a genuinely complete display model.

**The gap is persistence, not coverage.** Lines 207–240 read and write
`window.localStorage` and nothing else:

```
window.localStorage.getItem(CHART_PREFERENCES_STORAGE_KEY)
window.localStorage.setItem(…)
```

No table, no API route, no server read. A trader who opens WariX on a second
device gets defaults. §6.6's server-backed model is genuinely missing; §6.7's
warning not to rebuild the display settings is correct and must be honoured.

## 5. Indicator engine — `IMPLEMENTED_BUT_INCOMPLETE`

`chart-indicator-model.ts:19` is decisive:

```ts
export const CHART_INDICATOR_TYPES = ['ema', 'sma'] as const;
```

`chart-indicator-math.ts` exports `calculateSma`, `calculateEma`,
`calculateIndicator`, plus a live/incremental path (`createIndicatorLiveState`,
`commitIndicatorClose`, `nextIndicatorValue`). The incremental architecture is
good and worth extending.

Missing: RSI, MACD, Bollinger, ATR, Stochastic (all P0), and ADX/CCI/Ichimoku/SAR
(P1). There are **no oscillator panes** — every current indicator is a price
overlay, so §6.3's pane requirement is new work, not a modification.

The config model is `{ type, period, style: { color, width } }` — exactly the
flat shape §6.2 says must be replaced with a discriminated, typed configuration.

## 6. Execution path — `IMPLEMENTED`

`packages/database/src/trading.ts` — `lockAccount` appears **13 times**;
open/close run inside a transaction with optimistic position versioning, fills,
ledger entries and outbox events written atomically. Client prices are not
trusted; `symbol_specs` supplies spread/slippage/commission server-side.

**Protected.** §2.D holds.

## 7. Risk engine — `IMPLEMENTED`

`evaluateAccountRisk` in `packages/database/src/risk.ts`, driven by published
policy parameters via `@wariba/policies`. Daily loss, ratcheting maximum-loss
floor, consistency, target, eligibility and violations all computed server-side.
`risk-engine-inputs.ts` is the single loader behind every read model.

**Protected.**

## 8. Account lifecycle — `IMPLEMENTED`

`account-lifecycle.ts` — 12 states with `terminal` / `tradable` flags, plus
`app.account_state_transitions` and `app.performance_review_cases`.
`PASS_PENDING`/review exists as `under_review` + `funded_preparing`.

**Gap is UX-side, not model-side** — see §7 of the brief: the client-visible race
between a breach and the workstation's execution surfaces.

## 9. Realtime events — `IMPLEMENTED`

`services/realtime/src/` — 20+ modules including `leadership.ts` (fencing epochs),
`market.ts`, `alert-monitor.ts`, `metrics.ts`, `health.ts`, and a full durable
market-history subsystem (backfill, repair, cutover, continuity, rate limiting).
CI runs `pending-order-restart-recovery.e2e.test.ts` against it.

## 10. WARIBA Control — `IMPLEMENTED`

19 routes under `apps/web/app/(control)/`: accounts, audit, actuarial, commercial,
incidents, integrity, market-operations, payouts, policies, team, trading,
treasury, users. Staff RBAC via `app.staff_members` + `app.staff_action_rate_limits`.

**Gap:** no support or dispute queue, because neither exists to queue.

## 11. Help Center — `IMPLEMENTED_BUT_INCOMPLETE`

`apps/web/app/(public)/aide/HelpCenterClient.tsx` — 208 lines, a **client
component with the article content embedded in it**. `page.tsx` is 43 lines of
shell.

There is no `help_articles` table, no slug, version, locale, publication state or
`updated_at`. Editing an article is a code deploy. §5.1's premise is confirmed
exactly.

## 12. Support functionality — `MISSING`

`apps/web/app/(public)/support/page.tsx` is a **static landing page**. No ticket
table, no thread table, no route, no Control queue. A private-beta tester's only
escalation path today is contacting the founder directly — which §15's SUPPORT
council explicitly names as the failure condition.

## 13. Disputes — `MISSING`

No table, no workflow, no evidence-binding model. `app.risk_violations` and
`audit.audit_events` hold the evidence a dispute would *reference*, so the
substrate exists; the workflow does not.

## 14. Payouts — `IMPLEMENTED`

`payout-lifecycle.ts` (12 states, cycle progress, buffer, Performance Days,
blocking reasons), `app.payout_requests`, `app.performance_cycles`,
`app.treasury_reserve_entries`, Control review at `/control/payouts`.

## 15. Billing / payment abstractions — `IMPLEMENTED_BUT_INCOMPLETE`

Real: `app.purchase_orders`, `app.payment_attempts`, `app.payment_events`,
`app.receipts`, `packages/adapters/src/payment-provider.ts`,
`payout-provider.ts`, webhook route `api/v1/webhooks/payments/sandbox`, and
idempotency migration `20260804000004_payment_attempt_idempotency.sql`.

The adapter boundary and webhook verification exist. What is missing is an
**external** sandbox provider behind it — today the only implementation is the
in-repo sandbox (`api/v1/checkout/sandbox-pay`).

## 16. KYC abstractions — `IMPLEMENTED_BUT_INCOMPLETE` / `BLOCKED_BY_EXTERNAL_PROVIDER`

`packages/application/src/kyc-state.ts` declares the state machine and, at
line 119, states the truth plainly:

```ts
export const KYC_PROVIDER_INTEGRATED = false;
```

`trading_accounts.kyc_sandbox_verified` is the only persisted identity state.
No adapter file exists (`grep` for sumsub/onfido/veriff/persona returns nothing
in `packages/adapters`). Requires a vendor decision before it can be built.

## 17. Public marketing site — `IMPLEMENTED_BUT_INCOMPLETE`

Present: `/` (homepage), `/offres`, `/programme`, `/aide`, `/support`, `/warix`,
`/legal/{conditions,confidentialite,risques}`.

**The brief's premise is wrong on two counts.** §8 states the repository already
has a *status* page and a *trust* page. It does not:

```
find apps/web/app -path "*status*" -o -path "*trust*"
  → apps/web/app/(trade)/trade/risk-status.ts   (unrelated: WariX risk status)
```

Both are `MISSING`, not "preserve these foundations".

## 18. Status page — `MISSING`

See above. No route, no uptime surface, no incident feed. `app.operations_incidents`
exists as a table and is surfaced only inside Control.

## 19. Notification system — `IMPLEMENTED_BUT_INCOMPLETE`

`app.alert_notifications` + `NotificationCenter.tsx` cover **price alerts inside
WariX**. There is no cross-surface notification model for lifecycle events,
support replies, payout state changes or beta invitations.

## 20. Emails — `IMPLEMENTED_BUT_INCOMPLETE`

Auth email (verification, password recovery) is handled by Supabase Auth via
`signUp` / `resetPasswordForEmail` in `apps/web/app/(auth)/actions.ts`.

There is **no email adapter** — a repository-wide grep for
`resend|sendgrid|postmark|nodemailer|sendEmail|EmailProvider` across
`packages/adapters`, `packages/application`, `packages/config`, `apps/web/lib`
and `services` matches exactly one file: `apps/web/lib/product-copy.ts`, and that
is display copy. No transactional email exists for lifecycle, support or invites.

## 21. Deployment configuration — `MISSING`

The most consequential finding in this audit.

```
find . -name "Dockerfile*" -o -name "docker-compose*" -o -name "vercel.json"
       -o -name "railway.*" -o -name "fly.toml" -o -name "render.yaml"
       -o -name "Procfile"
  → (no results)
```

No container manifest, no platform config, no deployment target of any kind for
`apps/web`, `services/realtime` or `services/worker`. `.env.local` is the only
environment definition, and until this session it pointed at a Supabase project
that no longer exists.

**Localhost is the only environment that has ever run this system.**

## 22. CI — `IMPLEMENTED`

Genuinely strong, and better than the brief assumes.

- `ci.yml` — "PR Fast Gate": static, unit, build, database-integration, rls-smoke
- `certification.yml` — scheduled/labelled: static, unit+build, database-full,
  rls-full, realtime-functional, **recovery**, multi-node-failover

`pnpm test:certification` chains unit → property → build → db → integration →
RLS → E2E → recovery → failover → load.

**But zero deploy steps** — `grep -niE "deploy|vercel|railway|fly|render"` across
`.github/workflows/` returns nothing. CI proves the code; nothing ships it.

## 23. Observability — `IMPLEMENTED_BUT_INCOMPLETE`

`packages/observability/src/` is three files: `logger.ts`, `correlation.ts`,
`index.ts` — structured logging and correlation IDs, used consistently
(`CORRELATION_ID_HEADER` appears in API routes).

`services/realtime` has `health.ts` and `metrics.ts`, and a `/health` endpoint
returning market-feed connectivity, leadership and fencing epoch.

Missing: error tracking (no Sentry/Bugsnag/Rollbar in any `package.json`),
alerting, provider-freshness monitoring outside the realtime process, and any
aggregation for `services/worker`.

## 24. External market data — `IMPLEMENTED_BUT_INCOMPLETE`

Adapters exist and are real: `fcs-market-data-provider.ts`,
`twelve-data-quote-provider.ts`, `twelve-data-historical-provider.ts`,
`oanda-historical-provider.ts`, `replay-market-data-provider.ts`,
`historical-market-data-provider.ts`.

`services/realtime/src/config.ts:21`:

```ts
MARKET_DATA_PROVIDER: z.enum(['mock', 'replay', 'fcs', 'twelve-data']).default('mock')
```

with a documented safety override that forces replay regardless of the setting,
so a real-provider config can be staged and reviewed before it can emit.

The adapter boundary §9.4 asks for **already exists**. What is missing is a
deployed environment to run it in (see §21) and credentials.

## 25. Backup / recovery infrastructure — `MISSING`

`pnpm test:recovery` resolves to
`services/realtime` → `pending-order-restart-recovery.e2e.test.ts`. That is a
**service restart drill**, not a database restore drill — valuable, and covers
§10.3 drill A, but it proves nothing about backups.

`find docs -iname "*backup*" -o -iname "*restore*" -o -iname "*disaster*"`
returns nothing. Managed Supabase provides automatic backups; **restoration has
never been proven**, which is precisely §10.4's point.

## 26. Beta-user access mechanisms — `MISSING`

No waitlist table or route, no invite model, no feedback capture, no access
gating beyond ordinary signup. Anyone who reaches the deployment (there isn't
one) could register.

---

## Corrections to the brief's premises

Stated as fact by the Phase 3 prompt, but not true of this repository:

1. **§8 — "The repository already has … status, trust"**. Neither route exists.
   They are `MISSING`, not "preserve these foundations".
2. **§9.4 — "Do not delete them [provider abstractions]"**. Correct, and no risk:
   the abstractions are healthy. The blocker is §21 (no environment), not the
   adapter layer.
3. **§10.3.J — "restore database from backup"** is listed as a drill among ten.
   It is the only one with no supporting infrastructure at all, and should be
   sequenced accordingly.

## What is genuinely protected

Product OS (1), WariX (2, 3), execution (6), risk (7), lifecycle model (8),
realtime (9), Control (10), payouts (14), CI (22). Nine of twenty-six areas are
complete and must not be reopened.

## What Phase 3 must actually build

| Area | Class | Slice |
|---|---|---|
| Help article model | `IMPLEMENTED_BUT_INCOMPLETE` | 3.1 |
| Support tickets + threads | `MISSING` | 3.1 |
| Attachments | `MISSING` | 3.1 |
| Disputes | `MISSING` | 3.1 |
| Support/dispute Control queues | `MISSING` | 3.1 |
| Indicators RSI/MACD/BB/ATR/Stoch | `MISSING` | 3.2 |
| Typed indicator config | `IMPLEMENTED_BUT_INCOMPLETE` | 3.2 |
| Oscillator panes | `MISSING` | 3.2 |
| Server-backed WariX preferences | `MISSING` | 3.2 |
| Breach-while-open UX | `IMPLEMENTED_BUT_INCOMPLETE` | 3.3 |
| Soft lock vs breach separation | `IMPLEMENTED_BUT_INCOMPLETE` | 3.3 |
| Reconnect resync gating | `IMPLEMENTED_BUT_INCOMPLETE` | 3.3 |
| Homepage product proof | `IMPLEMENTED_BUT_INCOMPLETE` | 3.4 |
| Status page | `MISSING` | 3.4 |
| Waitlist | `MISSING` | 3.4 |
| Feedback capture | `MISSING` | 3.4 |
| Deployment manifests | `MISSING` | 3.5 |
| Staging environment | `MISSING` | 3.5 |
| Email provider | `MISSING` | 3.5 |
| External market provider in staging | `BLOCKED_BY_EXTERNAL_PROVIDER` | 3.5 |
| Payment sandbox (external) | `BLOCKED_BY_EXTERNAL_PROVIDER` | 3.5 |
| KYC sandbox | `BLOCKED_BY_EXTERNAL_PROVIDER` | 3.5 |
| Error tracking | `MISSING` | 3.6 |
| Backup/restore drill | `MISSING` | 3.6 |
| Failure drills | `IMPLEMENTED_BUT_INCOMPLETE` | 3.6 |

**26 areas audited: 9 implemented, 9 incomplete, 8 missing outright, 3 of which
are blocked on a vendor decision this repository cannot make alone.**
