---
title: "WARIBA Treasury & Payout Reserve — Gap Analysis Against the PSP-Ready Architecture Brief"
version: "1.0"
document_id: "WARIBA-TREASURY-PAYOUT-RESERVE-GAP-ANALYSIS"
status: "AUDIT — NO CODE CHANGED BY THIS DOCUMENT"
language: "fr-FR / en-US mixed"
brand: "WARIBA"
domain: "wariba.app"
market: "Côte d’Ivoire · Sénégal · Bénin · Togo · Mali · Burkina Faso"
owner: "Engineering (audit) — decisions marked BUSINESS_POLICY_REQUIRED belong to the business"
depends_on:
  - "DECISION_LOG.md — TREASURY-001, TREASURY-002, ACTUARIAL-VARIANCE-001/002"
  - "WARIBA_Actuarial_Risk_Model_v1.0.md"
  - "docs/07-assurance/WARIBA_UEMOA_Payment_Payout_Architecture_v1.0.md"
---

# WARIBA Treasury & Payout Reserve — Gap Analysis v1.0

> **Why this document exists instead of new code.** A full "Treasury &
> Payout Reserve Architecture" brief (57 sections — ledger events, PSP
> adapters, reconciliation, dashboards, alerts, daily/monthly close) was
> requested. Its own §55 says: *"First: audit current financial models...
> Reuse existing canonical architecture. Do NOT create duplicate financial
> truth."* That audit is this document. It found that almost everything
> buildable **today** — without a contracted PSP or a locked business
> policy — already exists, deliberately scoped to WARIBA's actual current
> stage. Building a second, parallel treasury system now would be exactly
> the "duplicate financial truth" the brief itself warns against. No code
> was changed to produce this document.

## What already exists — the real system

| Layer | File | What it does |
|---|---|---|
| Schema | `supabase/migrations/20260807030000_treasury_reserve.sql` | `app.treasury_reserve_entries` — append-only, `deposit`/`withdrawal`/`adjustment`, explicit `currency` column (default USD, never inferred), RLS, Control-only (no anon/authenticated grant) |
| Domain math | `packages/domain/src/treasury-math.ts` | Coverage ratio (`available reserve ÷ projected 30-day payouts`), and the `normal/prudence/defensive/critical` zone table — pure, `Decimal`-only, no I/O |
| Data access | `packages/database/src/treasury.ts` | `recordTreasuryReserveEntry`, `loadCurrentReserve`, `computeProjected30DayPayouts` (pending requests at their *requested* amount, approved/processing at their *approved* amount — conservative by construction), `evaluateReserveStatus` |
| Cockpit query | `packages/database/src/control-treasury-cockpit.ts` | `loadTreasuryCockpit` — composes reserve status, composition, liabilities, non-reserve simulated nominal, history, and open reserve alerts into one read |
| Application | `packages/application/src/control-treasury-view.ts`, `control-treasury-actions.ts` | View formatting; `recordControlTreasuryReserveEntry` (wraps the ledger write and a `recordStaffAuditEvent` in one transaction) |
| UI | `apps/web/app/(control)/control/treasury/page.tsx`, `TreasuryReserveManager.tsx` | The treasury cockpit: reserve, projection, coverage ratio, zone badge, composition table, liabilities, "hors réserve" simulated-nominal card, entry history, and the entry form (gated on `treasury.modify`) |
| Commercial gating | `packages/application/src/commerce.ts` (`isCommerciallyAvailable`) | Composes the static feature flag with the live reserve zone; `defensive` hides 50K/100K, `critical` hides everything — **this is already load-bearing**, not a demo |
| Payout state machine | `packages/application/src/payout-lifecycle.ts` | `pending_review → needs_information / approved → processing → paid / rejected`, exactly the lifecycle terminology the brief asks for |
| Economic model | `docs/03-finance/WARIBA_Actuarial_Risk_Model_v1.0.md`, `WARIBA_Financial_Model_v1.1.xlsx`, `WARIBA_Offer_Economics_Acquisition_V1.*`, `packages/domain/src/actuarial-scenario.ts` | Net revenue per cohort, max sustainable pass rate, expected payout cost, required reserve, profitability by account size, minimum viable price, commercial-activation conditions — with a 4-scenario (conservative/base/aggressive/stress) engine |

`TREASURY-001` (`DECISION_LOG.md`) is explicit about why the reserve is a
staff-entered figure rather than something derived: **no real payment
processor exists in this build**. That is still true today — see
`docs/07-assurance/WARIBA_UEMOA_Payment_Payout_Architecture_v1.0.md` §12,
which lists every PSP (PayDunya, CinetPay, Kkiapay) as *"candidat évalué —
dossier d'onboarding non encore ouvert."* Nothing in this audit changes
that status.

## Section-by-section mapping

Grouped by disposition rather than walked section-by-section (57 sections
against one existing system reads better as groups than as a 57-row table).

### Already built, matching the brief closely

§2 (accounting separation — partially, see below), §15–16 (payout status
truth / liability — a payout only becomes a firm figure once
`approved`/`processing`, never inferred from a request alone), §21 (payout
coverage ratio + zones), §24 (treasury dashboard), §26 (payout reserve
panel — "Engagements" card), §28 (treasury alerts — `openReserveAlerts`,
already rendered as an `Alert` when non-empty), §32 (currency — explicit
column, defaulted not inferred), §33 (simulated-USD separation — the
cockpit has a dedicated "Hors réserve — soldes simulés" card specifically
so this boundary is *visible*, not just internally enforced), §34 (ledger
architecture — append-only, same convention as `app.trading_ledger_entries`),
§36 (auditability — every reserve write carries a `recordStaffAuditEvent`
with actor, permission, before/after, reason, correlation ID), §37 (manual
adjustments — the `adjustment` entry type already requires a reason and is
audited), §38 (admin permissions — gated on the `treasury.modify`
permission via `staffCan`, not a generic admin flag).

### Honestly named as a gap by the existing system — not silently absent

`unrepresentedBuckets` in `control-treasury-cockpit.ts` already lists
exactly three categories the brief also asks for and the schema does not
yet model: **"Fonds opérationnels," "Fonds séparés fiscalement," "Fonds non
réglés"** (operating funds, tax-separated funds, unsettled funds). The
cockpit renders these as a named `Alert`, not as a fabricated zero — the
same discipline this session applied throughout the Legal Center work. This
maps directly to:

- §19 (tax provision) — unmodeled, named. **BUSINESS_POLICY_REQUIRED**
  before it's worth building: what tax treatment applies to collections
  and payouts is an accountant question, not an engineering one (per the
  payment-architecture memo §12).
- §20 (operating cash) — unmodeled, named. This is also a **scope
  decision**, not just a missing field: `app.treasury_reserve_entries` was
  deliberately scoped to *only* the payout reserve ("kept separate from
  operating cash," per the migration's own comment). Extending it to also
  track general corporate cash would change what `TREASURY-001` locked —
  that's a decision for whoever owns that decision, not something this
  audit unilaterally does.
- §17 (refund reserve) / §18 (chargeback reserve) — not modeled as
  separate buckets. Same reasoning as tax/operating: there is no refund or
  chargeback *data* yet (no PSP is processing real transactions), so a
  separate reserve bucket today would hold a number with nothing behind
  it. **BUSINESS_POLICY_REQUIRED + blocked on PSP data.**
- §9 (free cash formula) — cannot be computed honestly until operating
  cash and tax provision exist as tracked figures. **BUSINESS_POLICY_REQUIRED.**

### Premature — blocked on a PSP contract that doesn't exist yet

§10–14 (PSP-specific ledgers, multi-PSP treasury view, settlement
reconciliation, payout reconciliation against provider IDs, payment-success-
vs-settlement distinction), §27 (PSP health panel), §29 (daily treasury
close — needs PSP transaction ingestion to reconcile against), §35
(webhook idempotency — there are no webhooks to be idempotent about), §40
(payout batches — no PSP batch API to batch against), §41–45 (PSP transfer-
account prefunding, per-provider adapters, CinetPay/PayDunya/Kkiapay-
specific cases, the `PSPAdapter` interface).

Building any of these now would mean writing code against providers that
have not signed a contract, confirmed a rail, or published a real API
credential to this codebase — the exact "duplicate financial truth" risk
the brief's own §55 warns against, except here it would be *fictional*
truth rather than merely duplicated truth. `docs/07-assurance/WARIBA_UEMOA_Payment_Payout_Architecture_v1.0.md`
§10 already carries the PSP contract checklist (§30 of that brief) to fill
in once a provider is actually contracted — that is the right place for
this work to resume, not a new speculative adapter layer today.

### Already answered elsewhere — no need to duplicate

§46–48 (profitability dashboard, unit economics, contribution margin) are
the subject of `WARIBA_Actuarial_Risk_Model_v1.0.md` and the financial
model spreadsheets already in `docs/03-finance/` — including per-cohort
net revenue, sustainable pass rate, required reserve, and profitability by
account size. This is very likely the "next" the owner had in mind
(economic modeling, payout ratio, CAC, stress-test) — it exists, is marked
`"CANDIDAT — À CALIBRER AVEC DONNÉES DE BÊTA,"` and is worth a dedicated
review pass rather than a rebuild.

### Not built, low priority, no urgency without PSP data

§39 (dual control / four-eyes approval on large payouts) — a single
authorised admin can record an adjustment today. The brief's own §39 says
not to force this "unless current business policy requires it now" — no
such requirement is on record. §50 (finance exports — CSV, accounting
reconciliation) — nothing to export yet beyond what the cockpit's history
table already shows on screen. §31 (country dimension on treasury
aggregates) — becomes meaningful once settlement is genuinely per-country
via a real PSP; today it would be a column with no differentiated values
behind it.

## What this audit recommends, concretely

1. **Do not build a parallel treasury/ledger system.** The one that exists
   is correctly scoped, honestly labels its own gaps, and is already load-
   bearing (it gates real commercial availability).
2. **When a PSP is actually contracted** (tracked in the payment-
   architecture memo's launch gates), resume at §10–14 / §41–45 of the
   original brief — that is where genuine, non-speculative work starts.
3. **Two items are pure business decisions, not engineering ones**, and
   should go to whoever owns pricing/finance policy rather than back to an
   agent: (a) whether `app.treasury_reserve_entries`' scope should expand
   beyond the payout reserve to general corporate cash, and (b) what
   tax/refund/chargeback treatment applies once real transactions exist.
4. **Review the existing actuarial/financial model** (§46–48's real
   answer) before commissioning new economic modeling — it may already
   answer the payout-ratio-sustainability question this was heading
   toward next.

## RETURN

```
TREASURY_ARCHITECTURE = already exists — audited, not rebuilt (see table above)

CURRENT_FINANCE_MODELS_FOUND = yes — app.treasury_reserve_entries (schema),
  treasury-math.ts (domain), treasury.ts + control-treasury-cockpit.ts (data),
  control-treasury-view.ts/-actions.ts (application), Control /treasury
  cockpit (UI), payout-lifecycle.ts (payout state machine),
  actuarial-scenario.ts + docs/03-finance economic model (cohort/pricing)

SIMULATION_LEDGER_SEPARATE = yes — enforced structurally (no shared table)
  and displayed explicitly ("Hors réserve — soldes simulés")
CORPORATE_LEDGER_SEPARATE = yes — app.treasury_reserve_entries only

GROSS_COLLECTIONS = not tracked — no PSP transactions exist to sum
NET_COLLECTIONS = not tracked — same reason
BANK_CASH = not tracked as a distinct figure — the reserve ledger IS the
  tracked payout-reserve cash figure; general bank cash is an
  "unrepresented bucket," named not faked
PSP_CASH = not tracked — no PSP integrated
PENDING_SETTLEMENT = not tracked — no PSP integrated

PAYOUT_RESERVE_MODEL = built (TREASURY-001/002)
PAYOUT_LIABILITY_MODEL = built (projected 30-day, committed unsettled, open
  request count — control-treasury-cockpit.ts)
REFUND_RESERVE_MODEL = not built — BUSINESS_POLICY_REQUIRED + no PSP data
CHARGEBACK_RESERVE_MODEL = not built — BUSINESS_POLICY_REQUIRED + no PSP data
TAX_PROVISION_MODEL = not built — named as an unrepresented bucket;
  ACCOUNTING_REVIEW_REQUIRED
FREE_CASH_MODEL = not computable yet — depends on operating cash + tax
  provision, both unmodeled

PAYDUNYA_TREASURY = not applicable — no contract
CINETPAY_TREASURY = not applicable — no contract
KKIAPAY_TREASURY = not applicable — no contract

RECONCILIATION_MODEL = not built — no PSP transactions to reconcile against
DAILY_CLOSE = not built — same reason
MONTHLY_CLOSE = partially possible from existing reserve-entry history, but
  low value without PSP-sourced collections/payouts to close against

TREASURY_DASHBOARD = built (Control /treasury cockpit)
PAYOUT_RESERVE_PANEL = built ("Engagements" card)
PSP_HEALTH_PANEL = not applicable — no PSP integrated
TREASURY_ALERTS = built (openReserveAlerts, incident codes, severity)

CUSTOMER_WALLET_CREATED = no
SIMULATED_BALANCE_USED_AS_CASH = no — structurally impossible, verified
CUSTOMER_DEPOSIT_MODEL = no

BACKEND_CHANGED = no
DATABASE_CHANGED = no
BUSINESS_LOGIC_CHANGED = no

BUSINESS_POLICY_REQUIRED = tax treatment; refund/chargeback reserve design;
  whether treasury scope expands beyond payout reserve to operating cash;
  target payout-reserve ratio beyond the already-locked 2.0/1.5/1.2 zone
  thresholds, if those ever need revisiting
ACCOUNTING_REVIEW_REQUIRED = tax provision; revenue/payout expense
  classification once real PSP transactions exist (per the payment-
  architecture memo §12)

TREASURY_ARCHITECTURE_READY = yes — for WARIBA's current pre-PSP stage
PAYOUT_LIQUIDITY_MODEL_READY = yes — coverage ratio + zones already gate
  real commercial availability
PRODUCTION_FINANCE_READY = no

Blockers to PRODUCTION_FINANCE_READY — all business/contractual, not
engineering:
- No PSP contracted (PayDunya / CinetPay / Kkiapay all "candidat évalué")
- Tax treatment not reviewed by an accountant
- Refund and chargeback policy not decided
- Operating-cash tracking scope not decided
```
