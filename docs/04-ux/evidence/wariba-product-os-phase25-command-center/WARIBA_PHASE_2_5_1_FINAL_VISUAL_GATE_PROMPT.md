# WARIBA Product OS — Phase 2.5.1 Final Visual Gate

## Role

Act as a **Principal Fintech Product Designer, Principal Frontend Engineer, QA Lead, Accessibility Reviewer, and Product Owner** performing the **final visual acceptance gate** for WARIBA Product OS Phase 2.5.1.

This is **NOT** another redesign phase.

This is a short, evidence-driven final review intended to answer one question:

> **Can we freeze Product OS and move on to the trading/business layers?**

You must **not modify code unless a required visual proof fails an acceptance criterion below**.

---

# 0. Mission

Review the current implementation on the existing Phase 2.5.1 branch and produce the final visual proof set for:

1. Hub mobile — 390px
2. Hub mobile — 320px
3. Performance mobile — 390px
4. Performance mobile — 320px
5. Journal mobile — 390px
6. Accounts mobile — 320px
7. Add Account mobile — 390px
8. Funded Payout — desktop
9. Funded Payout — mobile

Although there are 9 screenshots, they represent **6 product gates**:

```text
GATE-01  Hub first viewport
GATE-02  Performance mobile chart priority
GATE-03  Journal mobile density
GATE-04  Accounts mobile filters/card
GATE-05  Add Account sticky decision CTA
GATE-06  Funded Payout path
```

No broad re-audit.

No full platform rewrite.

No cosmetic wandering.

No new features.

No WariX redesign.

---

# 1. Strict time / QA budget

This task must be deliberately small.

## Hard budget

Target:

```text
20–45 minutes
```

Maximum expected:

```text
60 minutes
```

If you exceed 60 minutes, explain exactly why before continuing.

## Testing budget

Run only what is necessary to validate this gate.

Allowed by default:

- targeted route tests
- targeted responsive tests
- targeted accessibility scan
- targeted visual screenshots
- the smallest relevant unit/integration tests for any code you actually change

Do **NOT** run the complete 1,400+ unit suite merely for reassurance.

Do **NOT** run all E2E suites unless a regression caused by your own change makes it necessary.

A full suite is allowed only if:

```text
1. you changed shared infrastructure,
2. you changed routing/authentication globally,
3. you changed a shared read model used across many surfaces,
4. a targeted test exposed a cross-platform regression,
5. or I explicitly request a full suite.
```

If you run a full suite without one of those reasons, report:

```text
QA_BUDGET_VIOLATION = yes
```

---

# 2. Non-negotiable product principles

Preserve the WARIBA visual language already established.

## Aesthetic

WARIBA should feel like:

```text
premium
quiet
financial
precise
high-density
institutional
2026
```

It should **not** feel like:

```text
crypto casino
neon cyberpunk
gaming UI
generic admin dashboard
empty SaaS template
oversized mobile cards with no information hierarchy
```

## Visual language

Use the current WARIBA system:

- deep near-black background
- restrained raised surfaces
- thin borders
- subtle blue structural accent
- emerald only for positive/safe semantics
- red only for negative/breach semantics
- amber only for constraint/warning semantics
- tabular numeric typography
- no unnecessary glow
- no decorative gradients just to make a screen look "premium"
- no fake data

## Truthfulness

Never fabricate:

- trades
- P&L
- equity history
- payout eligibility
- payment methods
- KYC state
- lifecycle states
- risk consumption
- charts
- performance series

Use authoritative production/read-model data only.

Synthetic data is allowed only in isolated QA fixtures.

---

# 3. Existing truths you must preserve

Do not reopen decisions already settled unless you discover a regression.

### Historical equity

Historical equity is **not authoritative**.

`account_daily_snapshots.eod_equity` currently mirrors `eod_balance`.

Therefore:

```text
HISTORICAL_EQUITY_SERIES = forbidden
```

Do not draw a fake second series labeled Equity.

Current live equity may remain a live metric.

### WariX

```text
WARIX_APPLICATION_FILES_MODIFIED = 0
```

must remain true for this task unless a regression conclusively requires otherwise.

This task is about Product OS visual acceptance.

### Saved payment cards

There is no card vault.

Do not invent saved payment methods.

### Rewards / achievements

There is no achievement or rewards backend.

Do not invent progress systems.

---

# 4. GATE-01 — Hub mobile first viewport

Required evidence:

```text
hub-mobile-390-final.png
hub-mobile-320-final.png
```

Use a **populated evaluation account** where possible so the screen proves real density.

## What the first viewport must answer immediately

A trader opening the Hub on mobile must understand, without scrolling:

```text
1. What account am I trading?
2. What is my balance?
3. What happened today?
4. How much daily risk remains?
5. How much maximum-loss room remains?
6. Where do I open WariX?
```

The screen must not prioritize secondary metadata over the trading decision.

## Desired information hierarchy

Conceptually:

```text
┌──────────────────────────────┐
│ Tableau de bord          ○   │
├──────────────────────────────┤
│ WARIBA ONE      Compte actif │
│ 10 000 USD · Évaluation      │
│ Reset dans 07:22:58          │
│                              │
│ 11 308 USD                   │
│ Solde                        │
│                              │
│ P&L jour      Risque restant │
│ 0 USD         300 USD        │
│                              │
│ Perte max.    Objectif       │
│ 764 USD       100 %          │
│                              │
│ [       Ouvrir WariX       ] │
│                              │
│ Perte quotidienne       100% │
│ ████████████████████████████ │
│                              │
│ Perte maximale          76%  │
│ ████████████████████░░░░░░░░ │
└──────────────────────────────┘
│ Hub Comptes WariX Payouts ...│
```

This is a **hierarchy sketch**, not a pixel-perfect mandate.

## Acceptance

At both 390 and 320:

```text
HUB_ACCOUNT_ID_VISIBLE_FIRST_VIEWPORT          = yes
HUB_BALANCE_VISIBLE_FIRST_VIEWPORT             = yes
HUB_DAILY_PNL_VISIBLE_FIRST_VIEWPORT           = yes
HUB_DAILY_RISK_VISIBLE_FIRST_VIEWPORT          = yes
HUB_MAX_RISK_VISIBLE_FIRST_VIEWPORT            = yes
HUB_WARIX_CTA_VISIBLE_FIRST_VIEWPORT           = yes
HUB_NO_HORIZONTAL_OVERFLOW                     = yes
HUB_BOTTOM_NAV_DOES_NOT_COVER_INFORMATION      = yes
```

### Recent activity

The **Activité récente** section must not dominate the page.

On populated desktop it may show a compact useful sample.

On mobile it must not become a giant chronological feed that pushes the trader's core analytics several screens downward.

Acceptance:

```text
RECENT_ACTIVITY_NOT_DOMINATING = yes
```

If more than roughly 4–6 recent events are visible at once on desktop, or if the entire feed visually outweighs performance/risk data, reduce it to:

```text
latest 3–5 events
+ "Voir toute l'activité"
```

Do not delete the underlying history.

---

# 5. GATE-02 — Performance mobile chart priority

This is the most important remaining gate.

Required evidence:

```text
performance-mobile-390-final.png
performance-mobile-320-final.png
```

Use a populated account with real/synthetic-isolated QA trade fixture so the charts actually render.

## Existing problem

The KPI grid can consume the entire early mobile experience.

A trader should not need to scroll through a long wall of numeric cards before reaching visual analytics.

The page is called **Performance**.

A chart must therefore appear early.

## Required mobile hierarchy

Recommended shape:

```text
┌──────────────────────────────┐
│ Performance              ○   │
├──────────────────────────────┤
│ [10K] WARIBA ONE  actif      │
│                              │
│ 7j   [30j]   90j   Tout      │
│                              │
│ +1 308 USD       64%         │
│ P&L net          réussite    │
│ PF 2.83          11 trades   │
│                              │
│ ÉVOLUTION DU SOLDE           │
│ ┌──────────────────────────┐ │
│ │      ╱───────            │ │
│ │  ╲__╱                    │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│ ↓ metrics secondaires        │
│ ↓ gagnants/perdants          │
│ ↓ instrument                 │
│ ↓ durée                      │
└──────────────────────────────┘
```

Do not blindly reproduce this layout. Preserve WARIBA components and truthful data.

## Mandatory geometry measurement

For both 390 and 320, measure:

```text
distance from top of page viewport
to first visible pixel of the primary performance chart
```

Report:

```text
PERFORMANCE_390_CHART_START_PX = ...
PERFORMANCE_320_CHART_START_PX = ...
```

### Target

Ideal:

```text
<= 650 px
```

Acceptable if typography/device constraints require it:

```text
<= 760 px
```

Failure:

```text
> 760 px
```

If >760px, fix the layout.

Possible fixes:

- compress summary KPIs
- use a 2×2 or compact KPI strip
- move secondary KPIs below the chart
- reduce vertical padding
- avoid one-card-per-metric mobile stacking
- keep only P&L, win rate, PF, trades above primary chart

Do **not** hide useful data permanently.

Do **not** change calculations just to fit the UI.

Acceptance:

```text
PERFORMANCE_MOBILE_PRIMARY_CHART_EARLY_390 = yes
PERFORMANCE_MOBILE_PRIMARY_CHART_EARLY_320 = yes
PERFORMANCE_KPIS_TRUTHFUL                  = yes
PERFORMANCE_NO_HORIZONTAL_OVERFLOW         = yes
PERFORMANCE_BOTTOM_NAV_CLEAR               = yes
```

---

# 6. GATE-03 — Journal mobile density

Required evidence:

```text
journal-mobile-390-final.png
```

Use populated trade history.

## Objective

The mobile journal should feel like a professional trading record, not a desktop table crushed into a phone.

The summary must remain compact.

Individual trades should be scannable.

## Preferred mobile trade card hierarchy

Example:

```text
┌──────────────────────────────┐
│ EURUSD        ● Sell         │
│ 1.0000 lot             -56   │
│ 21 août 2026 · 27 min      > │
└──────────────────────────────┘
```

Expanded detail may show:

```text
Entry
Exit
Duration
Result
Special rule note
```

Filters must remain reachable.

Instrument filters may horizontally scroll if needed, but they must:

```text
not clip text permanently
not create page-level horizontal overflow
not hide the existence of more filters without affordance
```

Acceptance:

```text
JOURNAL_SUMMARY_COMPACT          = yes
JOURNAL_TRADE_CARDS_SCANNABLE    = yes
JOURNAL_FILTERS_REACHABLE        = yes
JOURNAL_NO_PAGE_OVERFLOW         = yes
JOURNAL_BOTTOM_NAV_CLEAR         = yes
```

---

# 7. GATE-04 — Accounts mobile 320

Required evidence:

```text
accounts-mobile-320-final.png
```

This specifically checks the smallest supported width.

## Existing risk

Account-state filters can become clipped:

```text
Tous
Évaluations
En vérification
Funded
Échoués
Fermés
```

At 320px they must not create broken navigation.

Allowed patterns:

- horizontal scroll with clear continuation
- compact segmented control
- wrapped filters if visually disciplined
- a mobile filter control

Not allowed:

```text
half-visible label with no hint
page-wide horizontal overflow
filters covering top actions
```

Account card must still surface:

```text
status
objective
balance
consistency
closed days
last activity
daily risk remaining
max risk remaining
WariX CTA
```

without becoming unreadably dense.

Acceptance:

```text
ACCOUNTS_FILTERS_NOT_CLIPPED       = yes
ACCOUNTS_CARD_CORE_DATA_VISIBLE    = yes
ACCOUNTS_WARIX_ACTION_REACHABLE    = yes
ACCOUNTS_NO_HORIZONTAL_OVERFLOW    = yes
```

---

# 8. GATE-05 — Add Account mobile sticky decision CTA

Required evidence:

```text
add-account-mobile-390-final.png
```

Use the account configurator with a non-default size selected, for example:

```text
25 000 USD
84 900 XOF
```

The sticky decision bar must clearly contain:

```text
selected account size
actual price
primary purchase/continue action
```

Example conceptual structure:

```text
┌──────────────────────────────┐
│ ... account choices ...      │
│                              │
│                              │
├──────────────────────────────┤
│ 25 000 USD    84 900 XOF     │
│ [ Continuer vers paiement ]  │
├──────────────────────────────┤
│ Hub Comptes WariX Payouts ...│
└──────────────────────────────┘
```

The page content must reserve the CTA's height.

The sticky element must not cover the final account option or prevent it from being tapped.

Acceptance:

```text
ADD_ACCOUNT_SELECTED_SIZE_VISIBLE_IN_STICKY = yes
ADD_ACCOUNT_PRICE_VISIBLE_IN_STICKY         = yes
ADD_ACCOUNT_PRIMARY_ACTION_VISIBLE          = yes
ADD_ACCOUNT_LAST_OPTION_NOT_OBSCURED         = yes
ADD_ACCOUNT_BOTTOM_NAV_NOT_COLLIDING         = yes
```

Use geometric assertion where possible.

---

# 9. GATE-06 — Funded Payout path

Required evidence:

```text
payout-funded-desktop-final.png
payout-funded-mobile-390-final.png
```

Use a WARIBA Performance / Funded account.

The payout page must **always explain the trader's current payout state**, including when there is no active cycle.

It must never collapse into unexplained blank canvas.

## Case A — no active cycle / WARIBA Review

Must show:

```text
account identity
funded status
current payout lifecycle state
blocking reason
identity verification state
what happens next
```

Do not invent progress bars if progress does not exist.

Example:

```text
┌─────────────────────────────────────┐
│ WARIBA Performance     Funded actif │
│ 10 000 USD                          │
│                                     │
│ Payout indisponible                 │
│ Votre dossier est chez WARIBA Review│
│                                     │
│ Motif                               │
│ Aucun cycle actif pour le moment    │
│                                     │
│ Identité        Vérifiée            │
│                                     │
│ Prochaine étape                     │
│ WARIBA ouvrira le prochain cycle... │
└─────────────────────────────────────┘
```

## Case B — active cycle

When authoritative cycle data exists, surface:

```text
eligible excess
permanent buffer floor
eligible balance
performance days
cycle status
identity gate
blocking conditions
request action when eligible
```

Acceptance:

```text
FUNDED_PAYOUT_PATH_VISIBLE_DESKTOP = yes
FUNDED_PAYOUT_PATH_VISIBLE_MOBILE  = yes
PAYOUT_NO_BLANK_UNEXPLAINED_CANVAS = yes
PAYOUT_NO_FAKE_PROGRESS            = yes
PAYOUT_IDENTITY_STATE_VISIBLE      = yes
```

---

# 10. Accessibility gate

Run a targeted accessibility scan on the changed/reviewed mobile routes.

Required minimum:

```text
critical = 0
serious  = 0
```

Check specifically:

- text contrast
- semantic buttons/links
- focus visibility
- filter controls
- sticky CTA keyboard reachability
- chart accessible names / summaries where applicable
- mobile navigation labels

Do not add fake ARIA labels to generic elements.

---

# 11. Motion / reduced-motion

Do not add new motion for this gate unless necessary.

If any responsive interaction uses animation:

```text
prefers-reduced-motion
```

must still be respected.

No loading animation may block content or cause layout shift merely for decoration.

---

# 12. If a gate fails

Only then modify code.

When fixing:

```text
1. identify the exact failed criterion,
2. make the smallest robust change,
3. re-capture only the affected evidence,
4. run only affected tests,
5. verify no neighboring regression.
```

Do not use a failed gate as an excuse to redesign unrelated screens.

---

# 13. Forbidden work

Do not:

```text
- redesign WariX
- modify execution logic
- change risk formulas without evidence of a bug
- invent historical equity
- invent subscription systems
- invent rewards
- invent notifications
- invent saved cards
- invent KYC provider behavior
- add new runtime dependencies without necessity
- redesign auth
- redesign billing beyond a gate failure
- redesign desktop pages merely because you prefer a different style
- perform another 30+ screenshot audit
- create 100+ unrelated tests
```

---

# 14. Final evidence directory

Write final evidence under:

```text
docs/04-ux/evidence/wariba-product-os-phase251-final-gate/
```

Expected:

```text
hub-mobile-390-final.png
hub-mobile-320-final.png

performance-mobile-390-final.png
performance-mobile-320-final.png

journal-mobile-390-final.png

accounts-mobile-320-final.png

add-account-mobile-390-final.png

payout-funded-desktop-final.png
payout-funded-mobile-390-final.png
```

Also create:

```text
final-gate-report.md
```

---

# 15. Final report format

Do not give me a long narrative first.

Lead with this matrix:

```text
PRODUCT_OS_PHASE251_FINAL_GATE             = yes / no

GATE_01_HUB_MOBILE                         = yes / no
GATE_02_PERFORMANCE_MOBILE_CHART_PRIORITY  = yes / no
GATE_03_JOURNAL_MOBILE                     = yes / no
GATE_04_ACCOUNTS_MOBILE_320                = yes / no
GATE_05_ADD_ACCOUNT_STICKY_CTA             = yes / no
GATE_06_FUNDED_PAYOUT_PATH                 = yes / no

HUB_FIRST_VIEWPORT_DENSE_ENOUGH            = yes / no
RECENT_ACTIVITY_NOT_DOMINATING             = yes / no

PERFORMANCE_390_CHART_START_PX             = <number>
PERFORMANCE_320_CHART_START_PX             = <number>
PERFORMANCE_CHART_VISIBLE_EARLY            = yes / no

JOURNAL_MOBILE_SCANNABLE                   = yes / no
ACCOUNTS_FILTERS_NOT_CLIPPED               = yes / no
ADD_ACCOUNT_CTA_ALWAYS_REACHABLE           = yes / no
FUNDED_PAYOUT_PATH_VISIBLE                 = yes / no

ACCESSIBILITY_CRITICAL                     = 0 / <number>
ACCESSIBILITY_SERIOUS                      = 0 / <number>

WARIX_APPLICATION_FILES_MODIFIED           = 0 / <number>
FAKE_FINANCIAL_VALUES_PRODUCTION           = 0 / <number>
HISTORICAL_EQUITY_SERIES_INVENTED          = no / yes

QA_BUDGET_VIOLATION                        = no / yes

VISUAL_EVIDENCE_PATH =
docs/04-ux/evidence/wariba-product-os-phase251-final-gate/
```

Then give only:

### Failures found
Short bullets.

### Changes made
Short bullets, or:

```text
None — all gates passed without code changes.
```

### Targeted verification run
List exact commands/tests.

### Final recommendation

Exactly one of:

```text
FREEZE PRODUCT OS — move to WariX / business integration.
```

or:

```text
DO NOT FREEZE — <specific failed gate(s)> remain.
```

---

# 16. Stop condition

If all six gates pass:

**STOP.**

Do not search for more polish.

Do not start Phase 2.5.2.

Do not redesign unrelated pages.

Do not turn this into another 3-hour QA marathon.

The objective of this task is to obtain enough evidence to confidently freeze Product OS.

The expected successful ending is:

```text
PRODUCT_OS_PHASE251_FINAL_GATE = yes
FREEZE PRODUCT OS — move to WariX / business integration.
```
