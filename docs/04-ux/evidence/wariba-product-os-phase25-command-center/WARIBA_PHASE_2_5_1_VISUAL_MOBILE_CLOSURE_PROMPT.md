# WARIBA Product OS — Phase 2.5.1
## Visual & Mobile Closure / Fintech Command Center Finalization

> **Purpose:** close the visual, responsive, hierarchy, calculation, and state-consistency gaps that remain after Phase 2.5 **without reopening the whole Product OS** and without spending hours rerunning broad test suites that do not protect the changes in this phase.

---

# 0. Operating mode

You are acting as:

- Principal Product Designer
- Principal Fintech UX Engineer
- Trading-platform Product Lead
- Futures / Forex Trader
- Prop-firm Risk Product Lead
- Financial Data Visualization Designer
- Mobile Information Architecture Lead
- Frontend Architect
- Accessibility Lead
- QA Lead

Your job is **not** to redesign WARIBA from scratch.

Your job is to take the current Phase 2.5 implementation and close the remaining product-quality gaps with a **small, high-leverage pass**.

The current implementation already contains substantial backend/domain work, lifecycle logic, populated fixtures, Performance analytics, Journal, Accounts, Add Account, Payouts, Billing, and WariX gating.

Do **not** destroy or rewrite working architecture just to achieve a visual result.

---

# 1. Baseline

Start from the current Phase 2.5 branch:

```text
feat/wariba-product-os-phase-2-5-command-center
```

If the actual local branch differs, inspect Git first and identify the Phase 2.5 HEAD before making changes.

The previous Phase 2 baseline was:

```text
feat/product-os-phase-2-current
```

Phase 2.5 was built on top of it.

Before changing anything:

```bash
git status
git branch --show-current
git log --oneline -12
```

Do not push.
Do not open a PR.
Do not merge.
Do not modify WariX application code.

---

# 2. Why this phase exists

Phase 2.5 materially improved WARIBA, but visual review across desktop + 390 + 375 + 320 revealed several important problems.

The most important ones are:

1. **Mobile Hub is still a compressed desktop card, not a true mobile command center.**
2. **Performance mobile buries every chart below too many KPI cards.**
3. **Recent Activity on the Hub is far too long and duplicates the Journal.**
4. **Accounts filters become visually clipped / unusable on narrow mobile widths.**
5. **Add Account mobile needs a stronger purchase/configuration hierarchy.**
6. **Payout state messaging can contradict itself: known empty state + “loading cycle”.**
7. **Consistency copy can mislabel “additional profit required” as “total profit required”.**
8. **Desktop high density occasionally becomes repetition rather than useful hierarchy.**
9. **The visual language is good dark SaaS, but still needs one final pass toward premium financial-terminal clarity.**
10. **“Responsive = no overflow” is not enough. The order of information in the first viewport must be correct.**

This phase exists to fix exactly those gaps.

---

# 3. Non-negotiable constraints

## 3.1 No fake finance

Production UI must render **only authoritative data**.

Never invent:

- P&L
- balance
- equity
- drawdown
- target progress
- daily loss remaining
- max loss remaining
- payout availability
- consistency
- trade counts
- win rate
- profit factor
- open positions
- journal rows
- billing data
- KYC status

Synthetic values are allowed **only inside isolated test fixtures / QA seed data**.

---

## 3.2 WariX is frozen

Do not modify existing WariX V1 application files.

Allowed:

- shared Product OS shell changes that do not alter WariX behavior
- Hub navigation
- WariX gate surrounding the existing product
- test selectors only if truly necessary

Not allowed:

- changing chart engine
- changing execution
- changing order entry
- changing WariX risk enforcement
- changing market-data flows
- changing indicators
- “improving” WariX visual design in this phase

Required final line:

```text
WARIX_APPLICATION_FILES_MODIFIED = 0
```

---

## 3.3 Do not re-run a 3-hour QA campaign

This is a **closure pass**, not another full reconstruction.

The previous implementation already ran broad Product OS, integration, E2E, visual and accessibility suites.

For Phase 2.5.1, testing must be **risk-based and targeted**.

### Hard QA time budget

Target total implementation + verification time:

```text
45–75 minutes
```

Do not spend 3+ hours.

Do not produce 47 screenshots.

Do not rerun every WariX E2E unless a shared dependency actually changed.

Do not repeatedly run the same full suite after every small CSS edit.

See §18 for the exact test plan.

---

# 4. Product design principle

WARIBA should feel like:

```text
premium institutional trading software
+
calm risk command center
+
precise prop-evaluation product
```

Not:

```text
crypto casino
cyberpunk neon
generic admin dashboard
huge empty SaaS cards
bento-card wallpaper
```

Use a **quiet-luxury financial aesthetic**:

- deep charcoal surfaces
- subtle tonal elevation
- precise 1px borders
- restrained semantic colors
- minimal shadow
- no neon glow
- no glassmorphism
- no giant gradients
- tabular numbers
- strong alignment
- clean data density
- charts as first-class information
- green/red reserved for semantics
- amber only for constraints/warnings
- blue primarily for actions/navigation/system state

---

# 5. Global visual system

Preserve the existing Phase 2.5 design language unless a token is objectively wrong.

## Typography

### UI copy

Use the existing primary UI family, preferably Geist / equivalent already in the repository.

### Financial telemetry

All numbers that can update or need column alignment:

```css
font-variant-numeric: tabular-nums;
```

or equivalent utilities already used in the codebase.

Do not make every sentence monospace.

Use mono/tabular treatment for:

- balances
- P&L
- prices
- quantities
- percentages
- timers
- references
- rule values

---

## Card hierarchy

Use only 3 elevation levels:

```text
L0 = page background
L1 = ordinary panel
L2 = primary / selected / active surface
```

Avoid card-inside-card-inside-card unless the sub-card performs a clear independent task.

---

## Semantic color rules

```text
positive / healthy     → emerald
negative / breached    → accessible red
constraint / caution   → amber
neutral live state     → blue / gray
primary CTA            → current WARIBA action blue
```

Never show green just because a value equals 100%.

The meaning matters more than the arithmetic.

Example:

```text
Breached account
Daily budget untouched = 100%
```

must **not** display a celebratory green “100% risk intact” UI.

The account is terminated.

---

# 6. P0 — Mobile Hub must become a real command center

This is the highest-priority visual correction.

The current mobile Hero is too tall.

At 390 / 375 / 320, users spend nearly the entire first screen looking at one account card.

The mobile Hub must be **recomposed**, not merely stacked.

---

## 6.1 Mobile Hub first viewport target

At 390px width, the user should be able to see, before or near the first viewport boundary:

- account identity
- balance
- today P&L
- target progress
- remaining max-risk signal
- WariX CTA
- beginning of account evolution / next important section

### Desired skeleton

```text
┌──────────────────────────────────┐
│ Tableau de bord              ◎   │
├──────────────────────────────────┤
│ WARIBA ONE        ● Compte actif │
│ Évaluation · 10 000 USD          │
│                     Reset 07:22  │
│                                  │
│ 11 308 USD                       │
│ Solde                            │
│                                  │
│ +0 USD       Objectif       100% │
│ P&L jour     Profit              │
│                                  │
│ Risque jour 300 USD   Max 764USD │
│              100%          76%   │
│                                  │
│ [        Ouvrir WariX         ]  │
│                                  │
│ Perte quotidienne        100%    │
│ ██████████████████████████████   │
│ Perte maximale      CONTRAINTE   │
│ ███████████████████████░░  76%   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ÉVOLUTION DU COMPTE              │
│      compact balance chart       │
│ 17  18  19  20  21  23          │
└──────────────────────────────────┘
```

The exact values must remain data-driven.

---

## 6.2 Mobile Hero rules

At widths <= 640px:

### Keep visible

- account name
- status
- account type / nominal
- reset countdown
- balance
- today P&L
- target %
- daily-risk remaining
- max-risk remaining
- WariX CTA
- 2 risk bars

### Move out of the Hero

Move low-priority metadata below the primary content or into a details row:

- activation date
- full evaluation reference
- rules version
- payout split metadata

These must not push the chart / mission 400px farther down.

Possible mobile details affordance:

```text
Détails du compte  ›
```

or a compact wrapping row after the key content.

Do not hide necessary compliance/rule information permanently.

---

# 7. P0 — Performance mobile must be chart-first

This is a release blocker for Phase 2.5.1.

The current mobile page shows too many KPI cards before the first chart.

A trading analytics page without a visible chart in the early scroll feels broken even if the chart technically exists farther below.

---

## 7.1 Desktop Performance

Keep the current rich analytical capability:

- net P&L
- win rate
- profit factor
- average win
- average loss
- gain/loss ratio
- expectancy
- best day
- worst day
- traded days
- average duration
- current streak
- balance evolution
- daily P&L
- winners vs losers
- instrument breakdown
- holding-duration breakdown

But reduce visual repetition.

### Recommended desktop hierarchy

```text
┌─────────────────────────────────────────────────────────────┐
│ Performance                           7j  30j  90j  Tout    │
├─────────────────────────────────────────────────────────────┤
│ Account selector                                             │
├───────────────┬───────────────┬──────────────┬──────────────┤
│ P&L net       │ Win rate      │ Profit factor│ Avg win/loss │
│ +1 308 USD    │ 64%           │ 2.83         │ +289 / -179 │
└───────────────┴───────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ÉVOLUTION DU SOLDE                                          │
│                                                             │
│                   LARGE PRIMARY CHART                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────┬────────────────────────┐
│ P&L PAR JOURNÉE                    │ GAGNANTS / PERDANTS    │
│ bar chart                          │ donut + stats          │
└────────────────────────────────────┴────────────────────────┘

secondary metrics row:
Expectancy · best day · worst day · duration · days · streak

┌────────────────────────────────────┬────────────────────────┐
│ PAR INSTRUMENT                     │ DURÉE DE DÉTENTION     │
└────────────────────────────────────┴────────────────────────┘
```

Do not remove analytical data.
Reduce the number of equal-weight cards.

---

## 7.2 Mobile Performance skeleton

This hierarchy is mandatory.

```text
┌──────────────────────────────────┐
│ Performance                  ◎   │
├──────────────────────────────────┤
│ WARIBA ONE     ● Compte actif    │
│ 10 000 USD                       │
├──────────────────────────────────┤
│ 7 jours  [30 jours] 90 jours Tout│
├──────────────────────────────────┤
│ 11 trades · 5 journées           │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ P&L NET                      │ │
│ │ +1 308,00 USD                │ │
│ └──────────────────────────────┘ │
│                                  │
│ Win rate 64%    PF 2.83          │
│ Avg +289        Avg -179         │
├──────────────────────────────────┤
│ ÉVOLUTION DU SOLDE               │
│                                  │
│        PRIMARY LINE CHART        │
│                                  │
│ 17  18  19  20  21  23          │
└──────────────────────────────────┘

then:

┌──────────────────────────────────┐
│ P&L PAR JOURNÉE                  │
│ green / red bars                 │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 64% gagnants                     │
│ 7 gagnants · 4 perdants          │
└──────────────────────────────────┘

then secondary stats...
```

### Hard acceptance condition

At 390px:

```text
the first analytical chart begins before ~900px of vertical scroll
```

At 375 and 320:

```text
the user must not scroll through 8–12 KPI tiles before seeing a chart
```

Prefer a chart beginning within roughly the first 1–1.5 screens after the header.

---

# 8. P0 — Recent Activity must stop duplicating Journal

The populated Hub currently lets Recent Activity become extremely tall.

This makes the whole page visually unbalanced.

The Hub is a command center, not a transaction ledger.

---

## Desktop

Show max:

```text
5 recent events
```

## Mobile

Show max:

```text
3 recent events
```

Then:

```text
Voir toute l’activité  →
```

Target destination:

- Journal for trade/execution history
- correct lifecycle detail surface if the event is not a trade

Do not invent a new activity center unless one already exists.

---

## Compact row design

```text
┌──────────────────────────────────────────────┐
│ ACTIVITÉ RÉCENTE                 Voir tout → │
├──────────────────────────────────────────────┤
│ ● XAUUSD · Achat                 +740 USD    │
│   1.0000 @ 2408.60          19 août · 02:20 │
├──────────────────────────────────────────────┤
│ ● NAS100 · Vente                  +36 USD    │
│   1.0000 @ 20240.00          19 août · 20:45│
├──────────────────────────────────────────────┤
│ ● Paiement confirmé                         │
│   Activation en attente → Actif             │
└──────────────────────────────────────────────┘
```

Avoid long verbose repeated lines.

---

# 9. P0 — Fix consistency semantics and calculation labels

The current populated example shows approximately:

```text
Best day        1 078 USD
Eligible profit 1 784 USD
Consistency     60%
Limit           50%
Additional required ≈ 372 USD
```

The 372 USD must never be labelled as “profit total required”.

It is:

```text
profit supplémentaire requis
```

The total profit threshold implied by the consistency rule is approximately:

```text
1 078 / 0.50 = 2 156 USD
```

Therefore:

```text
additional = 2 156 - 1 784 = 372 USD
```

### UI copy

Correct:

```text
Profit supplémentaire requis : 372 USD
```

Optional explanatory copy:

```text
Votre meilleure journée représente 60% de votre profit éligible.
Continuez à trader jusqu’à 50% ou moins.
```

Do not tell the user to reduce or lose the best day.

---

# 10. Backend / calculation contracts

Do not duplicate financial formulas inside React components.

UI components should consume domain/application DTOs.

If a value already comes from the authoritative risk engine or application service, **do not recalculate it from displayed numbers**.

Create / preserve one source of truth.

---

## 10.1 Today's P&L

Do not calculate:

```text
currentBalance - dailyLoss.reference
```

That caused stale historical profit to appear as today’s P&L.

Use the authoritative current UTC trading day/session data.

Expected logic:

```text
todayRealizedPnL = sum(realized eligible closed-trade P&L
                       whose authoritative trading-day bucket == current UTC trading day)
```

If the product already has an authoritative session/day P&L field from the risk service, use that instead.

If reliable unrealized P&L exists from current open positions and the product definition of “P&L du jour” includes it:

```text
todayPnL = todayRealizedPnL + authoritativeCurrentUnrealizedPnL
```

Otherwise explicitly represent only realized P&L.

Never manufacture unrealized values from mark prices not available to the service.

### Invariant

A trade from 3 days ago must never reappear as today’s P&L simply because it remains part of account balance.

---

## 10.2 Daily loss remaining

Use the domain/risk-engine authoritative value.

Conceptual invariant:

```text
0 <= dailyLossRemaining <= publishedDailyLossLimit
```

If today’s loss budget is untouched:

```text
remaining = full published daily-loss budget
```

If breached:

the account lifecycle overrides celebratory risk presentation.

Do not show:

```text
Excellent — 100% remaining
```

on a terminated account.

---

## 10.3 Maximum loss remaining

Use the same authoritative drawdown/floor calculation as the risk engine.

Do **not** reverse-engineer it in the UI using:

```text
displayedBalance - displayedFloor
```

unless that is explicitly the domain contract.

The UI must render:

```text
maxLossRemaining
maxLossLimit
currentFloor
percentageRemaining
constraintState
```

from one consistent domain object.

### Required invariant check

For every populated QA fixture:

```text
remaining value
percentage
floor
lifecycle state
```

must describe the same account state.

If the numbers appear inconsistent, fix the DTO/service source rather than cosmetically forcing percentages.

---

## 10.4 Profit target

For Evaluation:

```text
eligibleProfit = authoritative program-eligible realized profit
progress = clamp(eligibleProfit / profitTarget, 0, 1)
```

The UI may display > target raw profit but progress bar can cap visually at 100%.

Example:

```text
1 272 USD / 1 000 USD
progress display = 100%
```

Do not rewrite 1 272 to 1 000.

---

## 10.5 Consistency

If the published rule is:

```text
best eligible positive day <= consistencyLimit × total eligible positive profit
```

then:

```text
consistencyRatio = bestEligiblePositiveDay / totalEligiblePositiveProfit
```

when totalEligiblePositiveProfit > 0.

For a limit `L`:

```text
requiredTotalProfitForCompliance = bestEligiblePositiveDay / L
additionalProfitRequired =
  max(0, requiredTotalProfitForCompliance - totalEligiblePositiveProfit)
```

Example:

```text
best day = 1078
total = 1784
L = 0.50

ratio = 1078 / 1784 = 0.6043 ≈ 60.4%
required total = 1078 / .50 = 2156
additional = 2156 - 1784 = 372
```

If the actual published policy encodes a different rule, the published policy wins.

Do not put business-rule constants inside UI code.

---

## 10.6 Reset countdown

The countdown is to the real next UTC daily reset boundary.

Use an instant-based function.

Conceptually:

```text
nextReset = next 00:00:00 UTC after now
remaining = nextReset - authoritativeNow
```

Recompute safely when:

- page becomes visible
- timer crosses zero
- timezone / system clock changes materially
- server refresh returns a newer authoritative state

Display:

```text
Reset dans 07:21:38
```

Do not display fake local midnight.

---

## 10.7 Historical balance / equity

Current known constraint:

```text
historical authoritative equity = unavailable
```

The previous audit found `eod_equity` is effectively a copy of `eod_balance`.

Therefore:

### Allowed

```text
Évolution du solde
```

using authoritative daily balance snapshots.

### Not allowed

Drawing two identical series and naming one “Equity”.

Do not add historical equity until the backend persists actual mark-to-market equity snapshots.

Current equity may remain a live/current metric if authoritative.

---

# 11. P1 — Accounts mobile filters

Current narrow mobile screenshots clip the filter row.

Do not count “page itself does not horizontally overflow” as success.

At 390 / 375 / 320, use one of these patterns:

### Preferred

Horizontally scrollable filter chips with visible affordance and no text clipping.

```text
[ Tous 1 ] [ Évaluations 1 ] [ Vérification 0 ] → 
```

Requirements:

- touch scroll
- no invisible trapped options
- active state clear
- `scrollbar-width` may be hidden if accessibility remains intact
- correct focus behavior
- keyboard usable on desktop

Alternative:

```text
Statut: Tous  ▾
```

for <= 340px if chips become unreadable.

---

## Mobile Accounts card

Keep:

- account
- status
- balance
- objective
- consistency
- closed days
- daily risk
- max risk
- WariX CTA

But reduce vertical dead space.

At 320px, ensure:

```text
title
status
primary money/risk
CTA
```

remain readable without horizontal clipping.

---

# 12. P1 — Add Account purchase/configuration hierarchy

Do not invent challenge types.

WARIBA currently sells WARIBA ONE Evaluation sizes.

Keep authoritative options.

Improve hierarchy so the experience feels like configuring a financial evaluation, not filling a settings form.

---

## Desktop

Existing desktop two-column pattern is good.

Refine:

```text
LEFT                              RIGHT
Program                          Sticky summary
Size                             Nominal capital
                                 Profit target
                                 Daily loss
                                 Max loss
                                 Consistency
                                 Minimum days
                                 Price
                                 CTA
```

---

## Mobile

The current mobile page is very long before the buyer sees final price/CTA.

Use a sticky bottom purchase summary once a size is selected.

### Skeleton

```text
┌──────────────────────────────────┐
│ Ajouter un compte            ◎   │
├──────────────────────────────────┤
│ ÉTAPE 1 · PROGRAMME              │
│                                  │
│ ● WARIBA ONE · Évaluation        │
│   Atteignez l’objectif...        │
│                                  │
│ ○ WARIBA Performance             │
│   Se débloque après réussite     │
├──────────────────────────────────┤
│ ÉTAPE 2 · TAILLE                 │
│ [ 5K ] [ 10K ]                   │
│ [ 25K ] [ 50K ]                  │
│ [ 100K ]                         │
│                                  │
│ Rules preview                    │
│ Target · daily · max · consistency│
└──────────────────────────────────┘

sticky bottom:
┌──────────────────────────────────┐
│ 25 000 USD          84 900 XOF   │
│ [ Continuer vers le paiement ]   │
└──────────────────────────────────┘
```

Do not cover content permanently.
Respect safe-area insets.

---

# 13. P1 — Payout state machine clarity

A known state and a loading state must not appear simultaneously.

Invalid combination:

```text
Aucun cycle en cours
+
Chargement de votre cycle Performance...
```

Choose exactly one state.

---

## State A — Evaluation account

```text
Aucun payout pour le moment.

Évaluation
   ↓
Validation
   ↓
WARIBA Performance
   ↓
Payout éligible

Vous êtes ici : Évaluation

[ Voir ma progression ]
```

No fake payout amount.

---

## State B — Funded, cycle data loading

Only show loading/skeleton.

```text
Chargement de votre cycle Performance…
```

Do not simultaneously claim there is no cycle.

---

## State C — Funded, no active cycle because review exists

```text
Payout indisponible

Votre dossier est actuellement chez WARIBA Review.
Les conditions seront réévaluées automatiquement.
```

Then KYC state.

No loading copy.

---

## State D — Eligible

Lead with:

```text
Montant actuellement disponible
```

Then:

- permanent buffer / floor
- eligible excess
- performance days
- KYC
- request CTA

Use authoritative data only.

---

# 14. P1 — Desktop Hub density cleanup

Do not redesign the whole Hub.

Fix repetition.

The current populated dashboard repeats some of the same data across:

- hero
- mission
- today panel
- consistency block
- performance preview
- recent activity

The rule:

```text
every card must answer a different trader question
```

Recommended questions:

### Hero
> What account am I trading and what are the immediate limits?

### Mission
> Am I passing the evaluation?

### Today
> How safe am I right now?

### Consistency
> Is my profit distribution compliant?

### Balance chart
> How is the account evolving?

### Performance summary
> What is the quality of my trading?

### Recent activity
> What just happened?

Do not show identical values purely to fill cards.

---

# 15. P1 — Charts and data visualization

Use the chart stack already present in the repository.

Do not introduce a new heavy chart dependency in this phase unless absolutely unavoidable.

Charts should:

- have accessible labels/tooltips
- use semantic green/red only when encoding gain/loss
- use WARIBA blue for neutral balance evolution
- avoid decorative gradients
- use subtle gridlines
- avoid excessive legends
- keep labels readable at 320px
- preserve real values
- animate subtly on first reveal only if reduced motion allows

---

## Mobile chart rules

### Balance evolution

At 320–390:

- full card width
- minimum useful plot height ~190px
- x labels reduced intelligently
- no axis-label collisions
- tooltip remains inside viewport

### Daily P&L

Use diverging bars around zero.

### Winner / loser

Donut is allowed if it remains legible.

If too small at 320, use:

```text
64% réussite
████████████░░░░░░
7 gagnants · 4 perdants
```

instead of forcing a tiny donut.

---

# 16. P2 — Billing polish only

Billing is not the priority of this phase.

Do not invent:

- saved cards
- payment vault
- subscription
- recurring billing
- PCI storage

Allowed polish:

- better mobile order card hierarchy
- clear order state
- receipt affordance if receipt truly exists
- compact total-spent summary
- responsive CTA/header spacing

Maximum time on Billing:

```text
10 minutes
```

unless a real functional bug is found.

---

# 17. Mobile bottom navigation

Current mobile bottom nav is directionally good.

Preserve:

```text
Hub
Comptes
WariX
Payouts
Plus
```

Requirements:

- active item obvious
- safe area respected
- page content never hidden permanently behind nav
- “Plus” contains secondary destinations
- no duplicate full sidebar on mobile
- minimum target sizes remain accessible

On 320px do not allow nav labels to overlap.

---

# 18. Testing strategy — deliberately limited

## Goal

Catch regressions created by this phase, not re-prove all of Phase 2.5.

---

## Stage 1 — static confidence

Run once after implementation:

```bash
pnpm format
pnpm lint
pnpm typecheck
```

If repository commands differ, use existing equivalents.

Do not run these after every CSS change.

---

## Stage 2 — targeted unit/application tests

Run only tests touching:

- Hub view calculations
- consistency calculation/copy source
- current-day P&L
- lifecycle/risk DTO if modified
- payout state derivation if modified
- account filters if logic changed

Do **not** automatically run the entire 1,400+ test suite unless:

1. a shared package changed in a way that affects broad behavior, or
2. targeted tests fail and the failure scope is unclear.

---

## Stage 3 — targeted E2E

Required routes only:

```text
/hub
/performance
/journal
/accounts or /comptes
/add-account
/payouts
```

Use:

- one zero-account fixture
- one populated evaluation fixture
- one breached fixture only if lifecycle presentation changed
- one funded fixture for payout state if payout logic changed

Do not rerun 46 lifecycle scenarios.

---

## Stage 4 — visual widths

Required screenshots:

### Desktop

```text
1440 or repository standard
```

Capture only:

1. Hub populated
2. Performance populated
3. Journal populated
4. Payout funded / relevant state
5. Add Account

### Mobile

Use:

```text
390
320
```

375 is optional if 390 and 320 are correct and CSS breakpoint behavior proves continuous.

Capture only:

1. Hub populated
2. Performance populated
3. Journal populated
4. Accounts
5. Add Account
6. Payouts

Maximum visual evidence target:

```text
~10–14 captures
```

Not 47.

---

## Stage 5 — accessibility

Run axe only on the routes actually touched.

Required:

```text
0 critical
0 serious
```

Do not scan every historical Product OS page unless shared shell semantics changed.

---

## Stage 6 — WariX regression

Since WariX code must not change:

Do not run the full WariX execution suite by default.

Required lightweight proof:

- WariX route mounts
- existing terminal shell renders
- no console/runtime crash
- gate opens for authorized active account
- gate blocks accountless state

If no WariX application file or imported shared contract changed:

```text
WARIX_REGRESSION = lightweight smoke passed
```

If shared contracts changed, run the smallest relevant WariX test subset.

---

# 19. Visual acceptance criteria

## Hub mobile

At 390:

```text
MOBILE_HUB_FIRST_VIEWPORT_USEFUL = yes
MOBILE_HUB_CHART_REACHED_EARLY = yes
MOBILE_HUB_HERO_NOT_DESKTOP_STACK = yes
```

At 320:

```text
NO_HORIZONTAL_CLIPPING = yes
PRIMARY_CTA_VISIBLE = yes
PRIMARY_METRICS_READABLE = yes
```

---

## Performance mobile

Mandatory:

```text
PERFORMANCE_MOBILE_PRIMARY_CHART_EARLY = yes
PERFORMANCE_MOBILE_KPI_WALL_REMOVED = yes
PERFORMANCE_MOBILE_320_CHART_READABLE = yes
```

If screenshots still show 8+ KPI cards before the first chart:

```text
PHASE25_1_READY = no
```

---

## Recent Activity

```text
RECENT_ACTIVITY_DESKTOP_MAX = 5
RECENT_ACTIVITY_MOBILE_MAX = 3
RECENT_ACTIVITY_HAS_VIEW_ALL = yes
```

---

## Accounts

```text
ACCOUNT_FILTERS_390_USABLE = yes
ACCOUNT_FILTERS_320_USABLE = yes
NO_PARTIAL_INVISIBLE_FILTER_LABELS = yes
```

---

## Payouts

```text
PAYOUT_KNOWN_STATE_AND_LOADING_NOT_SIMULTANEOUS = yes
PAYOUT_EVALUATION_PATH_CLEAR = yes
PAYOUT_FUNDED_STATE_CLEAR = yes
```

---

# 20. Data correctness acceptance

Required invariants:

```text
TODAY_PNL_USES_CURRENT_TRADING_DAY = yes
OLD_TRADE_CANNOT_REAPPEAR_AS_TODAY_PNL = yes

CONSISTENCY_RATIO_AUTHORITATIVE = yes
CONSISTENCY_ADDITIONAL_PROFIT_LABEL_CORRECT = yes

DAILY_RISK_FROM_DOMAIN_SOURCE = yes
MAX_RISK_FROM_DOMAIN_SOURCE = yes
NO_UI_REVERSE_ENGINEERED_RISK_FORMULA = yes

RESET_BOUNDARY_UTC = yes

HISTORICAL_BALANCE_AUTHORITATIVE = yes
HISTORICAL_EQUITY_NOT_FAKED = yes

BREACHED_ACCOUNT_NEVER_SHOWS_CELEBRATORY_RISK_STATE = yes
```

---

# 21. Implementation order

Work in this exact order.

## P0 — must complete

1. Mobile Performance chart-first hierarchy
2. Mobile Hub recomposition
3. Recent Activity truncation
4. Consistency wording/calculation verification
5. Payout contradictory state fix
6. Accounts mobile filter handling

## P1 — complete unless a real blocker appears

7. Desktop Hub repetition cleanup
8. Add Account mobile sticky summary
9. chart mobile readability
10. mobile header spacing / 320 cleanup

## P2 — only after above is correct

11. Billing minor polish
12. micro-motion / final spacing polish

Do not spend 40 minutes polishing Billing while Performance mobile is still wrong.

---

# 22. Do not do

Do not:

- rebuild authentication
- rebuild sidebar architecture
- redesign WariX
- add Rewards
- add Notifications
- add an AI coach
- add social/community features
- add loyalty systems
- copy ForTraders
- add challenge types that WARIBA does not sell
- add fake “LIVE”
- add fake equity history
- add fake positions
- invent payment methods
- invent subscriptions
- create another massive fixture framework
- rewrite backend modules that already work
- run hours of unrelated tests
- refactor for stylistic purity with no user-facing benefit

---

# 23. Premium motion rules

Motion is subordinate to information.

Allowed:

- 120–180ms hover/focus transitions
- gentle progress-bar interpolation after a real refresh
- chart line reveal on initial render
- subtle card entrance for route transitions
- number transition only when it does not obscure exact value

Not allowed:

- bouncing cards
- spring-heavy motion
- glowing pulse around money
- constant animated gradients
- dramatic count-up that delays reading
- animation suggesting a market is live when data is only polled

Respect:

```css
prefers-reduced-motion
```

---

# 24. Final report format

Do not write an essay.

Return this concise report:

```text
PHASE25_1_READY                       = yes / no

P0_MOBILE_HUB_RECOMPOSED             = yes / no
P0_PERFORMANCE_MOBILE_CHART_FIRST    = yes / no
P0_RECENT_ACTIVITY_CAPPED            = yes / no
P0_CONSISTENCY_SEMANTICS_FIXED       = yes / no
P0_PAYOUT_STATE_CONSISTENT           = yes / no
P0_ACCOUNT_FILTERS_MOBILE_FIXED      = yes / no

P1_ADD_ACCOUNT_MOBILE_READY          = yes / no
P1_DESKTOP_DENSITY_REFINED           = yes / no
P1_CHARTS_320_390_READY              = yes / no

TODAY_PNL_AUTHORITATIVE              = yes / no
RISK_VALUES_AUTHORITATIVE            = yes / no
UTC_RESET_CORRECT                    = yes / no
NO_FAKE_EQUITY_SERIES                = yes / no
FAKE_FINANCIAL_VALUES_PRODUCTION     = 0

ACCESSIBILITY_TOUCHED_ROUTES         = pass / fail
WARIX_APPLICATION_FILES_MODIFIED     = 0 / nonzero
WARIX_SMOKE                          = pass / fail

TARGETED_TESTS                       = <count/result>
E2E_TARGETED                         = <count/result>
VISUAL_CAPTURES                      = <count>
TOTAL_VERIFICATION_TIME              = <duration>

BRANCH                               = <branch>
HEAD                                 = <sha>
WORKTREE_CLEAN                       = yes / no
PUSHED                               = no
PR_OPENED                            = no
```

Then list only:

```text
Remaining known gaps:
1. ...
2. ...
```

Maximum 5 gaps.

---

# 25. Final product standard

The user should feel the difference immediately.

On desktop:

```text
WARIBA should look like a serious professional evaluation + trading command center.
```

On mobile:

```text
WARIBA must feel intentionally designed for mobile,
not like the desktop layout squeezed into 390px.
```

The most important final visual test is simple:

### Hub mobile

Within seconds, can the trader answer:

```text
What is my balance?
What is today's P&L?
How close am I to my risk limits?
Have I hit my objective?
What should I do next?
How has the account been moving?
```

### Performance mobile

Within the first short scroll, can the trader answer:

```text
Am I profitable?
How consistent am I?
What does my balance curve look like?
Are my daily results improving?
```

If the first chart is still buried under a wall of KPI cards, the phase is not finished.

---

# 26. Final instruction

Do this as a **surgical finalization pass**.

Reuse the architecture that Phase 2.5 already built.

Fix the places where the screenshots prove the product is still visually or semantically wrong.

Prioritize trader comprehension over decorative completeness.

Prioritize mobile hierarchy over “zero overflow”.

Prioritize correct financial semantics over pretty percentages.

Prioritize the 6 P0 fixes before anything else.

And stop when those fixes are proven with targeted tests and a small evidence set.
