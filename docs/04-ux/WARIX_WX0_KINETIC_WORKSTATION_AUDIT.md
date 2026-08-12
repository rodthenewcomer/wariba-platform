# WARIX WX0 — Kinetic Professional Workstation 2026

- Status: **AUDIT COMPLETE — HUMAN REVIEW PASSED**
- Scope: merged W5 at `715010163cafca56561f71e396c0c7f5d58c63a6`
- Accepted W5 head: `96ec035ceccf35dcc7cfe46346ae7ae739cad15c`
- WX0 branch base: `715010163cafca56561f71e396c0c7f5d58c63a6`
- Product implementation changed: **no**

## 1. Executive verdict

W5 is a capable, coherent and unusually well-defended simulated-trading surface. Its server authority, single responsive execution tree, honest process-memory history, Decimal-safe ticket, renderer-independent drawings, overlay priority and chart render ownership are not redesign targets. They are constraints WX1 must preserve.

The current product nevertheless reads as a dark web application because the hierarchy is expressed mostly through adjacent columns, text labels and uniform dark surfaces. At 1366×768 the measured chart module occupies only **26.50% of the viewport area**, while an empty dock consumes **220 px** and the navigator plus execution tracks consume **616 px** before seams and padding. The result is functionally dense but visually distributed: no one instrument unmistakably owns the workspace.

WX1 must recompose presentation, not rewrite behavior. The target is one cockpit-like instrumentation bar, a module-framed chart, a dedicated six-tool drawing rail, a desk-grade execution instrument, an intelligent empty dock and a genuinely mobile-specific first screen. Long-range history and the full target interval family belong to WX2.

### Scored baseline

| Dimension | Current | Target | Evidence |
|---|---:|---:|---|
| Workspace hierarchy | 1.1 / 2 | 1.8 / 2 | Chart competes with three equally weighted regions at 1366 |
| Chart dominance | 1.2 / 2 | 1.9 / 2 | 26.50% viewport-area share at 1366 |
| Instrument feel | 1.1 / 2 | 1.8 / 2 | Execution reads partly as stacked form sections |
| Interaction clarity | 1.5 / 2 | 1.8 / 2 | Strong semantics; toolbar/drawing discoverability remains text-led |
| Responsive/a11y integrity | 1.7 / 2 | 1.7 / 2 | Single trees, no overflow, strong focus/ARIA; chart pointer placement remains non-keyboard |
| **Total** | **6.6 / 10** | **9.0 / 10** | Target reserves 1.0 for post-WX1 human judgment and real-user validation |

```text
CURRENT_UI_SCORE_10 = 6.6
TARGET_UI_SCORE_10  = 9.0
```

## 2. Audit method and evidence

The audit was grounded in, in order:

1. Decision Log and v1.1 product/rule sources;
2. financial workbooks, actuarial, UX, design, engineering, architecture and assurance sources;
3. W0–W5 WariX architecture documents;
4. production component, token, contract, provider and test code;
5. accepted W5 runtime at eight required viewports;
6. official TopstepX public product imagery and current documentation;
7. direct side-by-side visual inspection of the official chart benchmark and W5 baseline.

No supplied TopstepX attachment was present beside the text brief. The benchmark therefore uses official public Topstep sources only: [TopstepX product page](https://www.topstep.com/topstepx), [TopstepX platform reference](https://help.topstep.com/en/articles/14434175-topstepx), and [TopstepX platform guide](https://www.topstep.com/blog/topstepx-platform-guide).

Baseline evidence and exact DOM geometry are in [`evidence/warix-wx0-kinetic-workstation/`](evidence/warix-wx0-kinetic-workstation/). The capture commit is the immutable WX0 base, before any production redesign.

## 3. Measured current state and locked targets

### 3.1 Primary metrics

| Metric | Current accepted W5 | WX1 target | Decision |
|---|---:|---:|---|
| `chartViewportAreaShare`, 1366×768 | 26.50% | ≥39% | Recover empty dock height; narrow tracks; add 36 px drawing rail without reducing current plot width |
| `chartViewportAreaShare`, 390×844 | 68.29% | ≥78% | Reduce pre-chart chrome; keep 61 px bottom actions |
| `chartShareOfCenterWorkspace` | not recorded by the WX0 manifest | `TO_BE_PROVEN_BY_WX1_EVIDENCE` | Prevent a dominance claim based only on reclaiming dock height |
| Navigator logical width | 280 px default (276 px measured content) | 244 px | Best balance of symbol, quote, spread and chart recovery |
| Execution logical width at 1366 | 336 px (319 px measured content) | 320 px | Dense instrument; still holds two-side price/actions safely |
| Execution logical width at ≥1440 | 348 px (331 px measured content) | 320 px default, user-resizable to 360 px | Do not pay 28 px permanently for infrequent long copy |
| Empty dock | 220 px | 48 px | Header + explicit empty state only; never auto-shrink populated dock |
| Mobile pre-chart chrome | 174 px | ≤116 px | Merge account/connection and symbol/market context; toolbar becomes one 44 px row |
| Global bar | 48 px | 44 px desktop; 40 px mobile safe-area aware | Instrumentation, not sentences |

At 1366 the proposed tracks are `56 rail + 244 navigator + 36 drawing rail + fluid chart + 320 execution`; the empty dock becomes 48 px. The drawing rail is paid for mainly by the 36 px navigator reduction and 16 px execution reduction, so the chart does not become narrower than W5. Its height increases by roughly 172 px.

### 3.2 Chart-dominance metric pair

WX1 evidence must report both metrics from runtime rectangles:

1. `chartViewportAreaShare = chartPlotArea / viewportArea`. This remains the repeatable end-to-end space KPI used by WX0.
2. `chartShareOfCenterWorkspace = chartPlotArea / centerWorkspaceArea`. On desktop, `centerWorkspace` is the principal workstation content rectangle between the global instrumentation bar and activity dock, from the right edge of global product navigation to the viewport right; it includes Navigator, drawing rail, chart and Execution Center. On mobile, it spans full width below the global account bar and above the bottom action rail; it includes market/tools chrome and the plot. Global chrome, the activity dock/action rail and overlaying sheets are excluded.

Both metrics use the same measured chart-plot rectangle. Shrinking the dock expands the chart and the center-workspace denominator together, so it cannot by itself prove stronger chart hierarchy. WX0 did not record the normalized center-workspace rectangle; no retroactive baseline or target is invented. The WX1 target is `TO_BE_PROVEN_BY_WX1_EVIDENCE` from baseline/candidate measurements at the same viewports and states.

### 3.3 Current responsive evidence

| Viewport | Chart box | Chart area share | Pre-chart chrome | Dock | Horizontal overflow |
|---|---:|---:|---:|---:|---|
| 1366×768 | 678×410 | 26.50% | 130 px | 220 px | none |
| 1440×900 | 740×542 | 30.95% | 130 px | 220 px | none |
| 1920×1080 | 1208×722 | 42.06% | 130 px | 220 px | none |
| 2560×1440 | 1848×1082 | 54.24% | 130 px | 220 px | none |
| 320×844 | 304×601 | 67.65% | 174 px | sheet | none |
| 360×800 | 344×557 | 66.53% | 174 px | sheet | none |
| 390×844 | 374×601 | 68.29% | 174 px | sheet | none |
| 430×932 | 414×689 | 71.18% | 174 px | sheet | none |

The plot is already chart-first on mobile, but four stacked context bands precede the first candle. The problem is not total chart height alone; it is the perceived delay before market content begins.

## 4. Accepted architecture that WX1 may not regress

| Foundation | Preserve exactly | Presentation may change |
|---|---|---|
| W1 | `WorkstationShell`, viewport-owned grid/flex geometry, account authorization, one active execution tree | track tokens, module chrome, composition |
| W2 | real five-symbol Navigator, dock membership, payout route separation, account-scoped responsive preferences | density, default empty geometry, iconography |
| W3 | accepted-tick-only observation, `sourceEpoch`, mid basis, finalized/current separation, sequence cutover, honest gaps, pagination | history status presentation only |
| W4 | server pricing/authority, Decimal quantities, canonical impact, Market/Limit/Stop, warnings/rejections, single mobile execution mount | visual grouping, compact controls, header/action treatment |
| W5 | indicator math, drawing model/persistence, overlay priority, viewport-preserving prepend, adapter seam, render ownership, a11y | toolbar, tool rail, context toolbar presentation |

`TradeClient`, shell/status/nav/dock chrome and closed dialogs must remain tick-independent. Selected ticks may reach the chart, execution header/impact and visible live positions only. Unselected symbol ticks may reach their visible Navigator row only. Motion must never subscribe to the tick store.

## 5. TopstepX workstation grammar

### Adopt

- A chart that owns the visual field rather than living between equal-weight panels.
- Compact module headers and grouped toolbars with separators.
- Immediate desktop drawing tools with persistent selected state.
- Direct chart manipulation for existing order/position overlays.
- An execution/risk area that reads as one operational instrument.
- Bottom activity as a secondary workspace, not permanent empty real estate.

Official Topstep documentation confirms chart trading, draggable working orders and brackets, grouped activity surfaces, multiple chart controls and a mobile chart entry affordance. These are grammar references, not scope authorization ([official platform reference](https://help.topstep.com/en/articles/14434175-topstepx)).

### Adapt

- Use WARIBA's five real instruments, bid/ask sandbox feed and policy risk—not futures contracts, DOM or exchange volume.
- Use a six-tool rail, not a TradingView-sized tool universe.
- Use WARIBA status/risk instrumentation, including DLL, MLL, consistency and 60-second eligibility.
- Keep Market/Limit/Stop and current server warnings; do not import OCO/trailing/flatten/reverse semantics.
- Keep one chart in WX1 while making its module boundary future-composable.

### Reject

- Futures products, Level II, DOM, Time & Sales, volume profile, tape or order-book claims.
- Eight-chart layouts in WX1.
- TradingView visual cloning or its full drawing catalogue.
- Hotkeys that can submit financial commands before a separately approved safety design.
- Personal lockout, copier, OCO, trailing stop, Cancel All, Reverse and Flatten All without domain authority.
- Topstep brand colors, typography and decorative device framing.

## 6. Exact WX1 workstation grammar

### 6.1 Global instrumentation bar

Desktop order, left to right:

1. account/program selector;
2. equity as the primary metric;
3. session P&L only if a canonical authoritative field exists—otherwise absent, never locally derived;
4. DLL and MLL remaining with progressive semantic tone;
5. balance at ≥1440;
6. target/consistency at ≥1920 or inside Risk detail;
7. connection, Risk and Notifications controls;
8. workspace label `WariX · 1 graphique` as a passive future seam at wide sizes only.

Metrics use 11 px labels, 13 px IBM Plex Mono values, hairline separators and no cards. Status is text plus icon/dot, never color alone. Mobile shows program/account, equity, risk entry, connection and notifications in a 40 px safe-area-aware bar; full metrics live in the existing risk sheet.

### 6.2 Chart module

The module is `context header → toolbar/drawing rail → plot → compact footer`. It is seamed, square-edged and tonal—never a rounded dashboard card.

- Context header: symbol trigger, open/stale state, compact OHLC/change, UTC/session.
- Desktop toolbar: interval control, Indicators, Fit, Reset, Snapshot only if capture is implemented locally; Preferences only for real chart preferences.
- Drawing rail: Select, Horizontal, Trend, Ray, Rectangle, Fibonacci.
- Context toolbar on selection: color/style, Delete, Done; positioned against the plot edge without covering the selected anchor.
- Footer: UTC, live/history status, scale/view utilities. Range presets remain hidden until WX2 can honor them.

Undo/redo, fullscreen, workspace layouts and command palette are **deferred**. They must not appear as dead controls.

### 6.3 Execution Center

The behavior stays W4. Presentation becomes one instrument:

- 32 px module header with symbol/account identity and market state;
- bid/spread/ask in a single 64 px quote deck;
- 32 px segmented Market/Limit/Stop control;
- one compact quantity row with stepper and presets;
- progressive protection block: optional SL/TP remains visible but compact;
- canonical margin/DLL/MLL in one 40 px impact strip, with the richer impact detail expandable;
- Sell/Buy actions fixed at the bottom, ≥44 px, side named in text;
- warnings and rejections inline above the affected control or action region.

It is still a safe form semantically, but should no longer *look* like independent labeled web-form sections.

### 6.4 Navigator and dock

Navigator: 244 px default, 220–320 px resizable. One 44 px search row, 36 px symbol rows, selected symbol signaled by a 2 px Cobalt edge plus surface and text—not color alone. Quotes and spreads remain tabular. No sparkline, percent change or volume.

Dock states:

- collapsed: 40 px existing compact tab strip;
- empty: 48 px tab/header and one inline empty sentence;
- one row: 112 px minimum;
- many rows: 220 px default, user-resizable to 55dvh.

Only the transition from empty to first populated row may expand once and should be announced politely. A populated dock never constantly resizes with row count.

## 7. Interval and history truth

### 7.1 Truth tables

`TARGET_INTERVALS = 1m, 3m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M`

| Set | Intervals | Truth |
|---|---|---|
| Current public implementation | 5s, 15s, 30s, 1m, 3m | Observed process memory only; restart loses all history |
| Current honest target-family intersection | 1m, 3m | Honest but shallow and process-lifetime bounded |
| Currently not registered/exposed | 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M | Absent from the canonical interval list/duration map and therefore from schemas, transport and UI; the generic aggregator already exists |
| Intervals requiring durable provider history for professional depth | all target intervals | Even 1m/3m need continuity and depth across process restart |

Seconds may remain internally supported during transition, but WX1 must not pretend the target family exists. The presentation blueprint demotes them; WX2 performs the contract/provider migration and public default switch.

The W5 candle architecture is already generic and duration-driven. [`packages/contracts/src/market-candles.ts`](../../packages/contracts/src/market-candles.ts) defines one canonical `CANDLE_TIMEFRAMES` list, one duration map and one `createCandleAggregator(timeframe)` implementation used by realtime, web and tests. Registering another interval is primarily an extension of that canonical list and duration map, followed by propagation through the existing schemas and consumers—not a new aggregation engine.

What remains missing for the professional target is:

- canonical interval contract registration;
- durable/provider-backed historical bars;
- durable source identity;
- cache and pagination;
- restart continuity;
- provider/live cutover;
- sufficient depth.

Those requirements keep every target interval in WX2 and keep `LONG_RANGE_HISTORY_PROVIDER_READY = false`.

Bar interval and view range remain separate types. A `1M` bar means one monthly candle. A `1M` range means a one-month visible window. No range preset ships until its coverage is true.

### 7.2 Narrow future provider seam

Do not add historical methods to the existing realtime `MarketDataProvider`: Mock, Replay and FCS currently provide accepted quotes, not historical bars. Preserve that honest capability boundary.

WX2 should add a separate adapter-side read capability only after a provider is selected, then compose it inside the realtime process behind the existing authenticated WebSocket history flow:

```ts
interface HistoricalBarsProvider {
  readonly providerId: string;
  getFinalizedBars(query: {
    symbol: TradableSymbol;
    interval: TargetBarInterval;
    before?: number;
    limit: number;
  }): Promise<ProviderBarsPage>;
}
```

The name is illustrative, not a pre-approved implementation. Required invariants:

- UTC epoch-aligned, left-inclusive buckets;
- explicit `priceBasis`; provider bars may not be spliced with W3 mid bars if bases differ;
- finalized bars only, ascending, bounded pages;
- durable dataset/source generation distinct from the realtime process epoch;
- live cutover still uses accepted tick sequence for the current process;
- cache keys include provider, symbol, interval, basis and dataset generation;
- gaps and market closures remain gaps, never filled flat;
- provider failure leaves valid visible history intact and reports chart-local unavailability;
- per-account authorization still gates symbols; history remains read-only and never drives execution.

`LONG_RANGE_HISTORY_PROVIDER_READY = false`.

### 7.3 W5 fit-content debt

`fitContent()` causes the first visible logical index to approach zero; the 50-bar older-page threshold immediately fires. One extra page is loaded, not a loop, because the 400-bar prepend shifts the logical range. Cost: approximately **35 KB and one history request per hydration and per symbol/timeframe switch**. At the six-request/10-second connection budget, repeated switches can also consume scarce history capacity.

WX2 fix location: the chart history controller/renderer handshake. Arm automatic older-page loading only after a user-originated range change, or tag and ignore the initial `fitContent` range event. Preserve initial useful framing and viewport compensation. Do not change server pagination.

`W5_FITCONTENT_AUTO_BACKFILL_DEBT = documented`.

## 8. Dependency and UI foundation decision

### 8.1 Current runtime

| Package | Installed |
|---|---:|
| Next.js | 15.5.22 |
| React / React DOM | 19.2.8 |
| Tailwind CSS | 4.3.3 |
| Lightweight Charts | 4.2.3 |
| Motion | 12.43.0 |
| TypeScript | 5.9.3 |
| `@base-ui/react` | not installed |
| `lucide-react` | not installed |

Motion is already a production dependency and used on public WariX marketing components, not the authenticated workstation. The installed package occupies about 0.8 MB plus a 5.6 MB `framer-motion` package on disk; client bundle impact depends on imported features and must be measured in WX1.

### 8.2 Decisions

| Foundation | Decision | Rationale |
|---|---|---|
| `@wariba/ui` | **ADOPT / KEEP AS OWNER** | Brand, tokens, public API and business-free component boundary remain canonical |
| Native HTML | **ADOPT where it is already stronger** | Native dialog/select/button preserve SSR simplicity and tested behavior |
| Base UI | **ADOPT SELECTIVELY** | Pilot Popover, Tooltip, Menu/ContextMenu only where current primitives lack collision, roving focus or robust focus return; it is unstyled, tree-shakable and supports React 17+ ([official Base UI](https://base-ui.com/react/overview/about)) |
| shadcn/ui | **DO NOT ADOPT AS A FOUNDATION** | Use recipes as reviewed references only. CLI init would introduce parallel tokens/utilities and risks overwriting owned code; official docs explicitly warn overwrite flows and confirm Tailwind 4/React 19 compatibility ([official Tailwind 4 guide](https://ui.shadcn.com/docs/tailwind-v4)) |
| Motion | **ADOPT SELECTIVELY** | Already installed; use `LazyMotion`/scoped imports for sheet/popover presence and resize orchestration only. Motion supports React ≥18.2 and Next App Router ([official install guide](https://motion.dev/docs/react-installation)) |
| Icon system | **ADOPT LUCIDE SELECTIVELY BEHIND `@wariba/ui`** | One consistent, tree-shakable source for workstation/navigation/tool icons; preserve WARIBA wrapper at 1.75 px stroke. Do not import Lucide directly in product components ([Lucide](https://lucide.dev/)) |

No dependency is added in WX0. Base UI adoption requires a WX1 proof component, accessibility tests, bundle diff and rollback path. Existing native Dialog/BottomSheet are not mass-migrated.

## 9. Component decision summary

The complete matrix is in [`../05-design/WARIBA_WORKSTATION_COMPONENT_MAP.md`](../05-design/WARIBA_WORKSTATION_COMPONENT_MAP.md).

| Component | Decision |
|---|---|
| `TradeClient` | KEEP |
| `WorkstationShell` / frame | RECOMPOSE presentation tracks only |
| `WorkstationStatusBar` | RECOMPOSE |
| `NavRail` | REFINE |
| `MarketNavigator` | REFINE |
| `ChartWorkspace` | KEEP |
| `TradeChart` | KEEP behavior; RECOMPOSE chrome |
| `ChartToolbar` | REPLACE PRESENTATION ONLY |
| `ChartLegend` | REFINE |
| `ChartDrawingLayer` | KEEP |
| `ExecutionPanel` | RECOMPOSE |
| `WorkstationDock` | RECOMPOSE empty geometry |
| `BottomSheet` | REFINE; Base UI pilot optional |
| risk/dialog sheets | REFINE |
| alerts and dock content | REFINE density; preserve data semantics |

## 10. Answers Q1–Q30

**Q1. Why web app, not workstation?** Uniform surfaces, text-led controls, equal-weight columns, 220 px empty dock and no dedicated chart/drawing instrument grammar.

**Q2. What makes TopstepX feel professional?** Chart dominance, compact module framing, grouped tools, persistent drawing rail, operational order/risk proximity and subordinate activity surfaces.

**Q3. What fits WARIBA?** The composition grammar, directness, grouped toolbar, chart-first module and compact instrumentation.

**Q4. What is rejected?** Futures/DOM/tape/volume/multi-chart scope, unapproved order commands, TradingView cloning, hotkey execution and brand mimicry.

**Q5. Recoverable chart area?** At 1366, from 26.50% to at least 39% viewport area, mainly by empty dock recovery. At 390, from 68.29% to at least 78% by reducing pre-chart chrome. Larger desktop widths retain current fluid growth. WX1 must also report `chartShareOfCenterWorkspace`; its target is `TO_BE_PROVEN_BY_WX1_EVIDENCE` so dock shrink alone cannot pass chart dominance.

**Q6. Navigator width?** 244 px default, 220–320 resizable.

**Q7. Execution width?** 320 px default, 304 minimum, 360 maximum.

**Q8. Empty dock height?** 48 px. Populated default stays 220 px.

**Q9. Instrument strip?** Label/value pairs, mono numerals, separators, semantic risk tone, authoritative values only, progressive disclosure by viewport.

**Q10. WX1 toolbar?** Existing symbol context, existing intervals regrouped without inventing target coverage, Indicators, Fit, Reset; six drawings move to rail. Undo/redo/fullscreen/snapshot/preferences appear only when real behavior exists.

**Q11. Drawing rail?** 36 px desktop rail: Select, Horizontal, Trend, Ray, Rectangle, Fibonacci; Lucide-backed WARIBA icons, 32 px controls, tooltip, active/pressed text alternative, no pointer layer over trading overlays.

**Q12. Mobile chrome?** Merge global account/connection, compress symbol/market header, make interval/tools one 44 px row, move full OHLC/indicator detail to an on-chart collapsible legend; target ≤116 px.

**Q13. Ten intervals responsive?** Desktop: five frequent intervals plus a `More intervals` menu at 1366; all may fit at ≥1920. Mobile: 1m/3m/5m/15m/1h plus More for 30m/4h/1D/1W/1M after WX2. Current selection always replaces the least-recent direct slot if in More.

**Q14. Which are not registered/exposed today?** Target 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M. The duration-driven generic aggregator already exists, but these intervals lack canonical registration and professional provider-backed history. Current 1m/3m are honest only within process uptime.

**Q15. Provider capability?** Separate read-only finalized-bar provider, explicit basis/generation, UTC buckets, bounded cursor pages, durable cache and a realtime composite cutover that preserves accepted-tick live authority.

**Q16. Weak primitives?** Tooltip positioning/focus, ad-hoc toolbar popover semantics, icon fragmentation, no owned workbench/module primitives, desktop tables on mobile, and BottomSheet presence/gesture polish.

**Q17. Base UI?** Selectively, after a Popover/Tooltip/Menu pilot; no mass migration.

**Q18. shadcn?** Reference patterns only; do not initialize or adopt its theme/foundation.

**Q19. Motion?** Selectively; already installed. Use for presence/layout/gesture, never tick animation.

**Q20. More color safely?** Assign one meaning per semantic family, keep saturation local to state/actions/selection, use cyan/violet analytically, and leave large surfaces Ink.

**Q21. Valuable microinteractions?** 120 ms press, 180 ms popover, 240 ms sheet, one 160 ms quote-direction wash with 500 ms cooldown, controlled P&L tone transition, quiet connection transition.

**Q22. Dangerous animation?** Pulses, looping glow, animated candles, delayed execution confirmation, interpolated authoritative prices, risk fades that defer urgency, layout motion during chart drag.

**Q23. Tick-independent components?** Shell/frame, global bar chrome, nav rail, toolbar, drawing rail, popovers, closed dialogs/sheets, inactive dock panels and account switcher.

**Q24. Overlay hierarchy?** Trading overlays > live bid/ask > risk > selected drawing > normal drawings/indicators > grid. W5 pointer priority remains trading > drawing > chart.

**Q25. Instrument or form?** Behavior is instrument-grade; presentation is still partly form-grade because labels, fields and bordered sections stack vertically with equal emphasis.

**Q26. Desk-grade changes?** Quote deck, segmented order type, compact stepper/presets, single impact strip, fixed bilateral actions, local validation/rejection placement and module framing.

**Q27. What must desktop/mobile not share?** Layout tree, drawing rail, table presentation, interval density and execution container. They share state/controllers/contracts, not DOM presentation.

**Q28. Multi-chart seam?** A future `ChartModule` receives symbol/timeframe/view preferences and command callbacks by instance id; layout owns module instances. No shared global renderer or cross-chart tick subscription is added now.

**Q29. WX2 debt?** Canonical registration/exposure of target intervals, provider history, durable source identity, view ranges, initial fit/backfill gating, history cache/limits and public default migration. A new aggregation engine is not required.

**Q30. Is WX1 unambiguous?** Yes for presentation: tokens, tracks, component decisions, toolbar/rail membership, responsive matrices, motion/color contracts, acceptance evidence and explicit exclusions are locked. Provider/timeframe work is explicitly outside WX1.

## 11. WX1 / WX2 boundary

### WX1 exact scope

- Kinetic token additions and generated outputs;
- owned workbench/module primitives;
- professional global instrumentation bar;
- desktop module recomposition and chart context header;
- current-function toolbar recomposition;
- six-tool desktop drawing rail and drawing context-toolbar presentation;
- Navigator density and 244 px default;
- 320 px Execution Center recomposition;
- intelligent 48 px empty dock and stable populated dock;
- mobile ≤116 px pre-chart chrome, tools palette and structured activity rows;
- selective Motion and icon use behind `@wariba/ui`;
- keyboard/focus/reduced-motion/accessibility closure;
- render-ownership regression tests and the complete visual evidence matrix.

WX1 changes no server authority, order semantics, indicator math, drawing model, history behavior, target interval contract, database, risk, payout or Control.

### WX2 exact scope

- select and integrate durable historical-bar provider capability;
- register the target intervals in the canonical contract/duration map and propagate them through history schemas and consumers;
- extend candle/history contracts with durable source identity;
- provider/memory cache and exact hydration/live cutover;
- 1m/3m/5m/15m/30m/1h/4h/1D/1W/1M public family;
- target default migration and legacy-second transition plan;
- distinct view-range presets only where coverage exists;
- fit-content auto-backfill fix;
- pagination, restart, gap, closure, provider-failure, rate-limit and load evidence.

## 12. Risks, rollback and human gates

- A 244 px Navigator must be validated with maximum price precision and French status copy; fallback is 252 px.
- A 320 px execution track must keep every 44 px action and rejection legible at 1366; fallback is 328 px.
- Base UI could introduce portal stacking/focus differences; pilot one primitive and retain current native implementation until equivalent tests pass.
- Lucide addition has migration and bundle cost; use only named imports behind WARIBA wrappers.
- Motion must not enter tick-driven components; static CSS is the default.
- Empty-dock auto state must derive from authoritative counts without jitter; populated height remains preference-owned.

Rollback is token/primitive/component-level: retain W5 controllers and restore previous presentation wrappers. No data migration exists.

## 13. WX0 flags

```text
WX0_MERGE_PRECONDITION_READY                = true
WX0_FORENSIC_AUDIT_READY                    = true
WX0_TOPSTEPX_BENCHMARK_READY                = true
WX0_KINETIC_DESIGN_SYSTEM_READY             = true
WX0_COLOR_SYSTEM_READY                      = true
WX0_MOTION_SYSTEM_READY                     = true
WX0_UI_FOUNDATION_READY                     = true
WX0_DESKTOP_ARCHITECTURE_READY              = true
WX0_MOBILE_ARCHITECTURE_READY               = true
WX0_CHART_TOOLBAR_ARCHITECTURE_READY        = true
WX0_DRAWING_RAIL_ARCHITECTURE_READY         = true
WX0_EXECUTION_DENSITY_ARCHITECTURE_READY    = true
WX0_DOCK_ARCHITECTURE_READY                 = true
WX0_HISTORY_ARCHITECTURE_READY              = true
WX0_TIMEFRAME_ARCHITECTURE_READY            = true
WX0_COMPONENT_MATRIX_READY                  = true
WX0_WX1_BLUEPRINT_READY                     = true
WX0_BASELINE_EVIDENCE_READY                 = true
WX0_FAST_GATE_READY                         = true

WARIBA_PRODUCT_EXPRESSION_MATRIX_READY      = true
TIMEFRAME_ARCHITECTURE_WORDING_CORRECTED    = true
WORKSTATION_VS_GLOBAL_VISUAL_ENERGY_SCOPED  = true
CENTER_WORKSPACE_CHART_KPI_READY            = true

WX0_HUMAN_REVIEW                            = PASS
WX0_ACCEPTED                                = true
```
