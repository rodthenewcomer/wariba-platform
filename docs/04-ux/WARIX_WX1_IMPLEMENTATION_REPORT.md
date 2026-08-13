# WariX WX1 — Kinetic Professional Workstation 2026 implementation report

## 1. Outcome

WX1 transforms the accepted W5 interface into a dense, chart-dominant WariX workstation while
preserving the W1–W5 execution, history, indicator, drawing, risk and render-ownership contracts.
It is a presentation and interaction milestone only.

Precondition evidence:

```text
WX0_MERGE_COMMIT = e8db6accf2ac80b75db9454ac49ccf6920c3b582
WX1_BASE_SHA = e8db6accf2ac80b75db9454ac49ccf6920c3b582
```

## 2. Implemented scope

- WARIBA-owned kinetic semantic aliases for workstation surfaces, text, interaction, trading,
  analytics, borders, geometry and motion.
- WARIBA UI primitives: `MetricReadout`, `ModuleHeader`, `ToolbarButton`, `ToolRailButton`,
  `SegmentedControl`, `CompactEmptyState` and `MobileStructuredRow`.
- A 44 px instrumentation bar, 56 px product rail, 244 px Market Navigator, 36 px drawing rail,
  fluid chart, 320 px Execution Center and 48 px empty dock.
- A chart context header, current-contract timeframe toolbar, indicator popover, compact footer and
  exact six-tool desktop drawing rail.
- A professional drawing context bar using only existing W5 persistence and style semantics.
- A recomposed Execution Center with quote deck, segmented type, compact quantity/protection,
  canonical impact and fixed decision zone.
- An intelligent activity dock and structured mobile activity rows.
- A mobile-native `44 + 28 + 44 = 116 px` pre-chart composition. The 44 px account and toolbar
  bands preserve practical touch targets; the 28 px market context is passive.
- CSS-only interaction motion with reduced-motion support and no market-tick subscription.
- Lucide icons exported only through `@wariba/ui` WARIBA wrappers.

## 3. Explicit non-scope and invariant closure

No database, migration, worker, domain financial math, risk, payout, provider interface, candle
semantics, history contract or realtime market behavior changes are part of WX1.

No WX2 interval or history capability is exposed. The only available intervals remain:

```text
5s  15s  30s  1m  3m
```

`LONG_RANGE_HISTORY_PROVIDER_READY` remains `false`.

## 4. UI foundation decisions

| Candidate | WX1 result |
|---|---|
| `@wariba/ui` | Sole product-facing UI foundation; extended with owned primitives |
| Base UI | Not adopted; native primitives retained after pilot review |
| shadcn | No initializer, theme or dependency; reference patterns only |
| Motion | No new adoption; CSS handles WX1 transitions, no tick subscription |
| Lucide | Adopted through WARIBA-owned `@wariba/ui` wrappers only |

## 5. Measured geometry

| Measurement | Result |
|---|---:|
| Navigator default | 244 px |
| Execution default | 320 px |
| Drawing rail | 36 px |
| Empty dock | 48 px |
| Top instrumentation | 44 px |
| 1366 chart viewport share | 26.50% → 39.39% |
| 1366 chart center-workspace share | 42.44% → 46.66% |
| 390 chart viewport share | 68.29% → 78.91% |
| 390 chart center-workspace share | 78.41% → 90.12% |
| 390 pre-chart chrome | 174 px → 116 px |
| Minimum WARIBA-owned mobile touch target | 44 px |

All tested desktop, tablet and mobile widths report zero horizontal document overflow.

## 6. Render ownership

For 25 selected-symbol ticks, shell chrome, product rail, status bar, account switcher, dock chrome,
closed dialogs, Navigator chrome, static chart controls and drawing rail add zero renders. The chart,
execution quote and visible Positions P&L update 25 times because their displayed values change.

For 25 unselected-symbol ticks, the chart, execution instrument, global status and Navigator chrome
add zero renders; only the visible quote row for that symbol may update.

Five draft edits remain isolated to the Execution Center. Forty drawing pointer moves cause zero
workstation-chrome renders and zero persistence writes before pointer-up; the completed drawing is
persisted once.

## 7. Accessibility and evidence

The WX1 evidence harness covers representative desktop, chart-first mobile, Tools sheet and
Execution sheet states with full-page Axe. Contrast samples cover Buy, Sell, warning, rejection,
selected analytical tool and focus. The canonical manifest is:

```text
docs/04-ux/evidence/warix-wx1-kinetic-workstation/evidence-manifest.json
```

The full screenshot bundle and agent handoff instructions are in:

```text
docs/04-ux/evidence/warix-wx1-kinetic-workstation/README.md
```

## 8. Known limitations

- Lightweight Charts keeps its licensed 35×19 px attribution link. The harness records this
  third-party exception separately; every WARIBA-owned mobile control is at least 44 px.
- Pointer drawing is not keyboard-editable in WX1, matching the accepted scope.
- Historical depth is bounded by current realtime process memory and does not survive restart.
- Human visual approval remains mandatory.
- **Right-anchored trading overlays overlap the chart's own price scale.** With a position open, the
  position badge's actions and the empty SL/TP slots sit over the right axis and can cover the
  Bid/Ask labels. This is W5 overlay geometry — `ChartPositionOverlay` is untouched by the visual
  closure — and fixing it means insetting every right-anchored overlay by the runtime price-scale
  width, which moves drag targets W5 certified. Not attempted at the immutable-HEAD stage.
- **The crosshair price label can cover the Bid or Ask axis label.** Both are drawn into the same
  canvas by lightweight-charts, which always paints the crosshair label last; the library exposes no
  ordering control. The only lever is hiding the crosshair label entirely, which the closure
  explicitly forbids. The label is transient and correctly themed.
- **The mobile drawing-context bar is proven at its widest label, not per type.** `drawingTypeLabel`
  has five values whose two longest are 17 characters ("Ligne horizontale", "Ligne de tendance");
  the bar's width is driven by that label, so a type that holds one line at 17 characters cannot
  wrap at 11 or 9. Per-type drawing geometry is captured deterministically on desktop by the WX1
  evidence harness.

## 9. Deferred to WX2

Canonical professional interval registration, durable/provider-backed historical bars, durable
source identity, caching, pagination, restart continuity, provider/live cutover and sufficient depth
remain WX2 work. No screenshot or control implies these capabilities exist.

## 10. Visual art direction closure

Human visual review of the first WX1 candidate returned **FAIL on perceived visual quality** — the
architecture was accepted, the expression was not. This section records the closure that followed.

### 10.1 What changed

| Area | Change |
|---|---|
| Surfaces | A real L0–L4 ink ladder (`#05070C` → `#0D111A` → `#151A25` → `#1E2433` → `#333B4D`) with rim light on raised planes. The chart is the deepest tone in the product. |
| Typography | An instrument ladder: 27px quote hero, 16px lead metric, 14px support, 13px module title, 10px small-caps section labels. Rank is size, not dimming. |
| Instrumentation | Grouped and seamed — identity, equity, loss budgets, programme — with stacked label-over-value. Risk states tint their own group. |
| Navigator | Labelled `BID / ASK / SPR.` columns, aqua/copper quotes, cobalt-washed selection, sticky category bands, market state by exception. |
| Chart | Deep well, dimmed grid, mono price and time scales, themed crosshair labels, neutral current-price label, integrated drawing rail. |
| Execution | A gutter-railed spec plate rather than a stacked form; quote deck, integrated quantity instrument, `SL`/`TP` tagged fields, full-width estimate, physical decision keys. |
| Dock | Workstation tabs, chip counts, side-coloured rows, P&L at the top of the row hierarchy, state-block empty states. |
| Mobile | Compact account instrumentation, an action rail of two keys, the desktop execution instrument translated to touch, a tool palette, and Account behind an overflow control instead of truncated to "ACC". |
| 1024–1279 | A hybrid workstation: chart and execution persistent, Navigator contextual and overlaid so opening it never reflows the plot. |

### 10.2 Defects found and fixed during the closure

Four were pre-existing and would have shipped:

1. `--wariba-surface-selected` and `--wariba-surface-raised` are not tokens this design system
   defines. Fourteen hover and selected states rendered with no background at all, including the
   quick-quantity chips and the Orders view switcher.
2. `BottomSheet` and `Dialog` painted their scrim with `--wariba-background-inverse`, which is bone
   under the dark trade theme — every mobile sheet opened behind a 64% white veil.
3. `Tooltip` painted `--wariba-background-inverse` on `--wariba-text-inverse`, so every workstation
   tooltip was a cream box on the dark workstation. Fixed at the primitive with dedicated
   `component.tooltip.*` tokens that are fixed values in both themes.
4. The chart's last-value label inherited the last bar's colour, so the current price rendered
   emerald after an up candle and coral after a down one — the two colours reserved for Buy and
   Sell. It is now pinned neutral.

Two were introduced by the closure and caught by the gates:

5. Grouping metrics produced `dl > div > div > dt/dd`; a `<dl>` sanctions one level of `<div>`
   grouping. Axe flagged it `serious` on every workstation page. Each metric now carries its own
   `<dl>`.
6. The `SL` tag measured 4.46:1 and a faded `USD` 3.91:1, both under AA. Both retoned.

### 10.3 Developer-facing language removed

The chart footer read `801 BOUGIES · HISTORIQUE EN MÉMOIRE`. The second half described WariX's
storage architecture, not the trader's market. The footer now reads the interval, the timezone and
the observed bar count; the process-memory constraint remains recorded in §8 of this report, where
an engineer looks for it.

### 10.4 Semantic colour law

| Colour | Single meaning |
|---|---|
| Cobalt | Interaction and selection |
| Copper | WARIBA identity, and the Ask side |
| Aqua | Bid, and the selected analytical object |
| Emerald | Buy, profit, healthy market status |
| Coral | Sell, loss, rejection |
| Amber | Warning and degraded transport |
| Neutral ink | Current/mid market context, including the chart's last-value label |

### 10.5 1024–1279 decision

Measured, not assumed. The fixed tracks cost 620px at every width: at 1440 the chart keeps 820px, at
1024 only 404px, and the rendered comparison showed the indicator legend wrapping three lines over
the candles. The band therefore keeps chart and execution persistent and makes the Navigator
contextual — an overlay inside the chart cell, so the plot never reflows when it opens. It is a
first-run default resolved per render against the live viewport; any stored preference wins, and a
window resized out of the band restores the full cockpit.

### 10.6 Kinetic interaction

Press, selection, popover, sheet and overlay transitions all run on the workstation motion tokens,
and `globals.css` collapses every animation and transition to 1ms under `prefers-reduced-motion` —
a stylesheet-level guarantee rather than a per-component one, asserted by
`apps/web/tests/workstation-hybrid.test.tsx`.

Quote directional feedback (§9-G) is implemented on the execution quote deck and **causes no React
render**. The obvious implementation — state plus a timer — would re-render the deck twice per tick
and put a `setTimeout` on every instrument, which is the tick-driven animation §30 rules out.
`use-quote-direction.ts` instead writes a `data-quote-direction` attribute onto a node the component
already owns and lets a CSS animation expire; React is not involved after the first paint. It is
attached only where the tick is already consumed, so it adds no `TickStore` subscription, and a
260ms cooldown keeps a fast market from strobing. The figure itself is never animated — it updates
through the ordinary render path the instant the tick lands.

### 10.7 Authoritative risk visualisation

The daily-loss budget carries a consumption rule under its figure. The ratio comes from
`computeDailyLossUsedRatio` (@wariba/domain), fed the three authoritative fields the risk DTO
already carries — `reference`, `floor`, `used` — and evaluated with decimal.js. It is the same call
`deriveRiskRibbonStatus` already makes for the metric's tone, so the rule and the colour cannot
disagree, and **no arithmetic on money happens in the browser**.

Only the daily loss gets a rule. `maximumLoss` carries `floor`, `remaining` and `breached` but no
`used` and no reference, so no canonical ratio exists for it; deriving one client-side would be
exactly the invented math the closure forbids. Max loss keeps tone escalation and nothing more.

### 10.8 Hybrid overlay behaviour

`NavigatorOverlay` owns the dismissal contract the hybrid band needs: Escape, a pointer outside,
focus into the panel on open and back to the opener on every dismissal path. Deliberately **no
scrim and no focus trap** — a scrim would dim the market being read, and trapping focus would stop
Tab reaching the chart and the Execution Center, both of which stay live while the Navigator is
open. It is a desktop panel, not a modal.

## 11. Review status

```text
WX1_HUMAN_VISUAL_REVIEW = pending
WX1_ACCEPTED = false
```

Do not merge automatically. Do not start WX2 or PX0 from this milestone.

Visual closure evidence, including the immutable pre-closure baseline:

```text
docs/04-ux/evidence/warix-wx1-visual-closure/
```
