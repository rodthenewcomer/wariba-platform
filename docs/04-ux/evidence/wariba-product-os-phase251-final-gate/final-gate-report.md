# WARIBA Product OS — Phase 2.5.1 Final Visual Gate

```text
PRODUCT_OS_PHASE251_FINAL_GATE             = yes

GATE_01_HUB_MOBILE                         = yes
GATE_02_PERFORMANCE_MOBILE_CHART_PRIORITY  = yes
GATE_03_JOURNAL_MOBILE                     = yes
GATE_04_ACCOUNTS_MOBILE_320                = yes
GATE_05_ADD_ACCOUNT_STICKY_CTA             = yes
GATE_06_FUNDED_PAYOUT_PATH                 = yes

HUB_FIRST_VIEWPORT_DENSE_ENOUGH            = yes
RECENT_ACTIVITY_NOT_DOMINATING             = yes

PERFORMANCE_390_CHART_START_PX             = 543
PERFORMANCE_320_CHART_START_PX             = 583
PERFORMANCE_CHART_VISIBLE_EARLY            = yes

JOURNAL_MOBILE_SCANNABLE                   = yes
ACCOUNTS_FILTERS_NOT_CLIPPED               = yes
ADD_ACCOUNT_CTA_ALWAYS_REACHABLE           = yes
FUNDED_PAYOUT_PATH_VISIBLE                 = yes

ACCESSIBILITY_CRITICAL                     = 0
ACCESSIBILITY_SERIOUS                      = 0

WARIX_APPLICATION_FILES_MODIFIED           = 0
FAKE_FINANCIAL_VALUES_PRODUCTION           = 0
HISTORICAL_EQUITY_SERIES_INVENTED          = no

QA_BUDGET_VIOLATION                        = no

VISUAL_EVIDENCE_PATH =
docs/04-ux/evidence/wariba-product-os-phase251-final-gate/
```

## Failures found

Five, all measured rather than judged by eye.

- **GATE-02 — the chart was nowhere near the budget.** The primary chart began
  at **941px** (390) and **1031px** (320) against a 760px ceiling. Twelve KPI
  tiles stacked two-across occupied the entire early mobile experience of a
  page called Performance.
- **GATE-01 — the phone's CTA was behind the bottom navigation at 320.**
  "Ouvrir WariX" ended at 549px with the nav starting at 498px, so the one
  action the screen exists to offer was covered at the smallest supported
  width.
- **GATE-01 — recent activity dominated.** Twelve events rendered at once, a
  column visibly taller than the risk panel, the mission and the performance
  snapshot combined.
- **GATE-04 — the account filters were cut mid-word at 320.** "En vérificat",
  severed cleanly with no fade or chevron, which reads as a broken layout
  rather than as an affordance.
- **Accessibility — the danger pill failed AA.** `--wariba-accent-red` at
  `#e86060` measured 4.09:1 against its own 12 % wash. Emerald (4.9) and amber
  (5.8) already cleared theirs; red was the one tone that did not, and it is
  the tone every negative figure in the product is painted with.

Two smaller findings on gate surfaces, fixed with the same change set:

- The journal's mobile card truncated its meta line to "21 août 2026, 01:27…",
  discarding the holding duration — the one figure on that line saying *how* a
  trade was taken rather than when. A scalp and a four-hour swing looked
  identical in the list.
- The payout page restated its own blocking reason as unframed text below the
  card that had just given it.

## Changes made

- **Performance mobile hierarchy.** `PerformanceSnapshot` gained `primary` and
  `secondary` variants; the page renders four headline figures (net P&L, win
  rate, profit factor, trade count) above the chart and the remaining nine
  below it. Nothing is hidden — the order changed. Chart start fell from
  941 → 543px and 1031 → 583px.
- **Hub vertical rhythm below `sm`.** Hero gaps and padding tightened
  (`gap-6 p-5` → `gap-4 p-4`, restored at `sm`), and the telemetry hints hidden
  below `sm` — each read "N % du budget" and the risk meters directly beneath
  the CTA state the same percentages as bars.
- **Recent activity capped at five,** with an in-place disclosure for the rest.
  No link to an activity route, because there is no activity route and
  inventing one would be a navigation promise the product cannot keep. No
  history is discarded.
- **Segmented filters wrap below `sm`** instead of scrolling. §7 permits
  wrapped filters; it forbids half-visible labels.
- **`--wariba-accent-red` raised to `#f46e6e`** — 4.63:1 on its wash, 5.46:1 on
  the raised surface, 6.05:1 on the canvas. Fixed at the token rather than
  across call sites. Verified safe for WariX first: the workstation runs its
  own `--warix-*` palette and references this token in zero places.
- **Journal card meta line wraps** instead of truncating, so the duration
  survives.
- **`PayoutCenterPanel` renders nothing without a cycle,** since `PayoutStatus`
  above already states the lifecycle, the reason, the identity gate and what
  happens next.
- Test hooks added for measurement (`activity-item`,
  `performance-primary-chart`, `account-card-action`, `payout-identity`).

## Targeted verification run

```text
# The gate itself — 13 tests, all six gates plus the a11y scan.
npx playwright test tests/e2e/phase251-final-gate.spec.ts
  → 13 passed

# Regression check. Justified under §1 reason 1 (shared infrastructure): the
# red accent is a global token, and SegmentedFilter / PerformanceSnapshot are
# rendered on several surfaces.
npx playwright test tests/e2e/wariba-product-os-phase25.spec.ts
  → 44 passed

# The one unit test covering a changed shared component.
pnpm --filter @wariba/ui exec vitest run tests/ActivityTimeline.test.tsx
  → 4 passed

pnpm --filter @wariba/web lint / typecheck
  → clean
```

The full 1,400-test unit suite was **not** run. Nothing in this change set
touches a financial calculation, a read model's arithmetic, routing or
authentication.

## Accessibility

axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) on the four reviewed mobile
routes — hub 390, performance 390, journal 390, comptes 320:

```text
critical = 0
serious  = 0
```

Measured after the entrance animation settles. axe computes contrast from
rendered colour, so sampling mid-fade measures the animation rather than the
design.

## Evidence

| File | Gate |
|---|---|
| `hub-mobile-390-final.png` | GATE-01 |
| `hub-mobile-320-final.png` | GATE-01 |
| `performance-mobile-390-final.png` | GATE-02 |
| `performance-mobile-320-final.png` | GATE-02 |
| `journal-mobile-390-final.png` | GATE-03 |
| `accounts-mobile-320-final.png` | GATE-04 |
| `add-account-mobile-390-final.png` | GATE-05 |
| `payout-funded-desktop-final.png` | GATE-06 |
| `payout-funded-mobile-390-final.png` | GATE-06 |

## Final recommendation

```text
FREEZE PRODUCT OS — move to WariX / business integration.
```
