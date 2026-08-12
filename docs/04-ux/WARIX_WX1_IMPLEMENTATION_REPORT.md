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

## 9. Deferred to WX2

Canonical professional interval registration, durable/provider-backed historical bars, durable
source identity, caching, pagination, restart continuity, provider/live cutover and sufficient depth
remain WX2 work. No screenshot or control implies these capabilities exist.

## 10. Review status

```text
WX1_HUMAN_VISUAL_REVIEW = pending
WX1_ACCEPTED = false
```

Do not merge automatically. Do not start WX2 or PX0 from this milestone.
