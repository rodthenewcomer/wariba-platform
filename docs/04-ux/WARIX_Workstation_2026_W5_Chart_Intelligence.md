# WariX Workstation 2026 — W5: Chart Intelligence

**Branch** `feat/warix-workstation-2026-w5` · **Base** `main` at `1592d06` (PR #25, W4 visual closure)

W1 built the shell. W2 built the navigator and the dock. W3 made the candles
real. W4 made execution professional. W5 turns the central chart from a
price-display surface into an analysis instrument: five timeframes, four moving
averages, five drawing tools, and history that keeps loading as the trader pans
into the past.

Nothing in this milestone can execute a trade, change a risk number, or alter
what the server says is true. That is not a slogan — §12 below is the test suite
that proves it.

---

## 1. PHASE A — WHAT THE MERGED CHART STACK ACTUALLY WAS

Audited before a line was written, against `main` at `1592d06`.

### 1.1 The files that matter

| Layer | File | Role at the start of W5 |
|---|---|---|
| Candle semantics | `packages/contracts/src/market-candles.ts` | The one bucket function, mid-price function and aggregator. `CANDLE_TIMEFRAMES = ['5s','30s','1m']` |
| History wire contract | `packages/contracts/src/market-history.ts` | Request/result DTOs, `MarketHistoryPort`, `validateHistoryWindow`, `mergeFinalizedCandles`, pagination fields (`hasMore`, `nextCursor`) |
| Server history | `services/realtime/src/market-history-store.ts` | `MemoryMarketHistoryStore`: observes accepted ticks, retains 2 000 finalized candles per (symbol, timeframe) |
| Server transport | `services/realtime/src/websocket.ts` | `handleMarketHistoryRequest` — rate-limited, authorised, read-only |
| Client state machine | `apps/web/app/(trade)/trade/chart-history.ts` | Generation-scoped hydration, tick buffering, sequence-watermark cutover, sourceEpoch reset |
| Client transport | `apps/web/app/(trade)/trade/chart-history-transport.ts` | Adapts the session's one `RealtimeClient` to a three-method port |
| Renderer + overlays | `apps/web/app/(trade)/trade/TradeChart.tsx` | 1 392 lines: lightweight-charts lifecycle, bid/ask lines, position/SL/TP/pending/alert overlays, context menu, long press |
| Overlay geometry | `chart-overlay-geometry.ts`, `packages/domain/src/chart-overlay.ts` | Collision-aware label placement |
| Preferences | `workstation/workstation-preferences.ts` | Browser-local, versioned, fail-closed. **Not** account-scoped |

### 1.2 Findings that shaped the plan

1. **The pagination contract already existed and nothing used it.** W3 defined
   `before`, `hasMore` and `nextCursor` end to end and shipped a client that
   never sent a second request. W5's backfill is therefore an *activation*, not
   a new protocol.
2. **The server was already timeframe-generic.** `observeAcceptedTick` iterates
   `CANDLE_TIMEFRAMES`, `getCandles` reads `query.timeframe`, and the wire schema
   is `z.enum(CANDLE_TIMEFRAMES)`. Adding 15s and 3m therefore required **zero
   behavioural change** in `services/realtime` — the diff there is comments only.
   That was the audit's most useful finding and it is why §3 is short.
3. **The timeframe default was positional.** `useState(CANDLE_TIMEFRAMES[0])`.
   Inserting `15s` after `5s` would have been safe; inserting anything *before*
   `5s` would silently have changed every trader's opening chart. Named as
   `DEFAULT_CANDLE_TIMEFRAME`.
4. **`TradeChart.tsx` was already at 1 392 lines.** Adding indicators, drawings,
   a toolbar, a legend and a mobile sheet inline would have produced a
   2 500-line component. W5 extracts instead (§9).
5. **Trading overlays are sibling DOM elements painted above the chart
   container.** This is what makes §7's interaction priority structural rather
   than a z-index negotiation: a pointer that reaches the container provably
   missed every trading control.
6. **Preferences were not account-scoped.** Acceptable for panel widths; not
   acceptable for a trader's annotations, which is why W5's two new stores are
   account-keyed (§8.3).

---

## 2. THE TIMEFRAME CONTRACT (B1)

```
5s  → 5      15s → 15     30s → 30     1m → 60      3m → 180
```

One array (`CANDLE_TIMEFRAMES`), one duration map, one bucket function. The
server's aggregator loop, the toolbar, the preference parser and the tests all
iterate the same array; there is no second list anywhere in the repository.

`DEFAULT_CHART_TIMEFRAME = 5s` — the shipped default, preserved and now stated
explicitly rather than inferred from list position.

**What was deliberately not added.** No 5m/15m/30m/1h/4h/1D: history depth is
bounded by the realtime process's uptime (W3's DATA-003), so an hourly chart
would spend most of its width showing an honest absence of data. No 1000T/5000T
tick charts: the feed publishes *quote updates*, not exchange trade events, and
equating the two would fabricate a market semantic the system cannot support.
`TICK_CHARTS_READY = false`.

---

## 3. SERVER HISTORY FOR THE NEW INTERVALS (B2)

No new candle math, no new code path. `MemoryMarketHistoryStore.observeAcceptedTick`
already fanned one accepted tick into every interval in `CANDLE_TIMEFRAMES`; it
now fans into five instead of three. One observation per accepted tick, above the
client fan-out, exactly as W3-D2 requires — proved by the unchanged
`market-history-observation.test.ts`.

### 3.1 Memory, recalculated rather than inherited

| | W3 | W5 |
|---|---|---|
| Symbols × timeframes | 5 × 3 = 15 keys | 5 × 5 = **25 keys** |
| Retention per key | 2 000 | 2 000 |
| Stored candles at full occupancy | 30 000 | **50 000** |
| Approximate footprint | ≈ 9 MB | **≈ 15 MB** |

At ~250–300 B per entry in V8 (one wrapper object, one candle object, four short
decimal strings, three numbers), full occupancy is reached only after hours of
uptime on a process that already holds the whole tick fan-out. 15 MB is clearly
safe, so **retention stays at 2 000**: cutting to 1 200 to hold the old 9 MB
would have cost the pan-left depth this milestone exists to deliver, for ~6 MB.

What 2 000 candles span at the mock provider's 1 tick/s:
5s ≈ 2.8 h · 15s ≈ 8.3 h · 30s ≈ 16.7 h · 1m ≈ 33 h · 3m ≈ 100 h.

### 3.2 No fabricated past

A process that has just started has observed no 3m buckets. It shows none.
There is no reverse-simulation, no interpolation, no carried-forward close and
no back-filled bar — `market-history-store.test.ts` asserts exactly this: after
60 s of observation a 15s chart holds three finalized candles and a current one,
and a 3m chart holds *zero* finalized candles and one in progress.

---

## 4. AUTOMATIC PAN-LEFT BACKFILL (B3)

### 4.1 Trigger

`chart.timeScale().subscribeVisibleLogicalRangeChange` → `range.from` is the
leftmost visible logical bar index → `history.maybeRequestOlder(range.from)`.

The threshold is **50 bars remaining to the left** (`HISTORY_BACKFILL_TRIGGER_BARS`),
expressed in bars rather than pixels so it behaves identically at every zoom
level and on every screen. Page size is 400 (`HISTORY_BACKFILL_PAGE_LIMIT`), the
same as the initial hydration.

There is no timer and no polling. A page is fetched because the trader panned,
or not at all.

### 4.2 Single in-flight, by construction

`maybeRequestOlder` is the single place every guard lives — threshold,
in-flight handle, `hasMore`, hydration-in-progress, generation. It is therefore
safe to call on every visible-range event, which is what a drag produces dozens
of times a second. `HISTORY_BACKFILL_MAX_INFLIGHT = 1`, per
(symbol, timeframe, generation).

### 4.3 Viewport preservation — the part that is easy to get wrong

lightweight-charts indexes its time scale by **bar position**. Prepending N older
bars moves every bar the trader is looking at N places to the right. So the
renderer, not the controller, owns the fix:

```
range = timeScale.getVisibleLogicalRange()
series.setData(allCandles)          // one write
indicatorEngine.rebuild()           // lines follow, same frame
timeScale.setVisibleLogicalRange({ from: range.from + N, to: range.to + N })
```

`fitContent()` is **not** called. A trader who panned back two hours to look at
something did not ask to be returned to the live edge.

`N` is computed from the merge, not from the response: it is the number of
candles that landed strictly before everything already on screen, so duplicates
the deterministic merge deduplicated shift nothing.

This is also why the indicator gap policy (§5.3) matters here: every indicator
point sits on a real candle time, so no analytical series can introduce a bar
slot and invalidate the shift.

### 4.4 Races

- **Generation** — a page requested on 1m cannot land on the 3m chart the trader
  switched to while it was in transit.
- **Source epoch** — a page produced by a process that has since restarted is
  dropped, not spliced. W3 §35's rule, applied to pagination.
- **Failure** — a failed or malformed older page stops pagination and leaves the
  chart exactly as it was. It does not fail the chart: what is on screen is still
  valid observed history.

### 4.5 The retention floor

`hasMore = false` means *the oldest candle this process still retains*, not the
beginning of the market. The chart therefore never says "all market history
loaded"; it simply stops asking.

---

## 5. THE INDICATOR ENGINE (B4/B5)

### 5.1 Where it lives, and why not in the domain

`apps/web/app/(trade)/trade/chart-indicator-{model,math,engine}.ts`.

Indicator values are **analytical display data**. Moving them into
`@wariba/domain` to borrow its `Decimal` helpers would have put a display concern
behind the same boundary as execution arithmetic — the exact coupling this
milestone forbids. So the calculation uses JavaScript `number`, isolated to one
file, tested against hand-computed values, and reaching nothing but a
lightweight-charts line series.

`INDICATOR_PRICE_SOURCE = CANDLE_CLOSE_MID`. Never bid, never ask, never a fill
price, never account P&L.

### 5.2 Documented semantics

**SMA, period N.** No value for the first N-1 observed candles. The value at
candle N is the arithmetic mean of closes 1…N; each subsequent value is the mean
of the latest N **observed** closes. A gap neither resets the window nor gets
filled.

**EMA, period N.** `alpha = 2/(N+1)`. Seeded with the **SMA of the first N
observed closes**, so the first EMA value appears at candle N — the same bar the
SMA of that period starts on. Then `EMA_t = close_t × α + EMA_(t-1) × (1-α)`.

Both are written down because charting libraries disagree: some seed the EMA with
the first close, some start the recursion at bar 1 with no warm-up at all.
`chart-indicator-math.test.ts` pins the arithmetic to values written out in the
assertions, so no future dependency can change it quietly.

**Insufficient history is not fabricated.** A 100 SMA on 40 observed candles
draws nothing. The line starts when the data exists.

### 5.3 Gap rendering — `INDICATOR_GAP_VISUAL_POLICY = whitespace_at_first_candle_after_gap`

W3 permits genuine temporal gaps: an interval with no accepted tick produces no
candle. A moving average may legitimately continue across such a gap — it is an
average of the closes that *were* observed — but the drawn line must not, because
a continuous stroke over a ten-minute outage asserts a price path nobody saw.

The break is a whitespace item placed on the **first candle after the gap**.

The obvious alternative — whitespace at the missing bucket's own timestamp —
breaks the line just as well, but introduces a time to the chart's scale that no
series has data for. That shifts every logical bar index and silently invalidates
§4.3's viewport compensation. Placing the break on a real candle time costs one
drawn point and keeps the chart's slot count exactly equal to its candle count.

No interpolation, no carried-forward close, no synthetic candle, no invented price.

### 5.4 Full rebuild versus incremental update

| Event | Path |
|---|---|
| Hydration, symbol change, timeframe change, older-page prepend, settings change | Full recalculation |
| Accepted market tick | One `nextIndicatorValue` per enabled indicator, O(1), one renderer `update` |

The rolling state holds only what the next point needs — the last N finalized
closes for an SMA, the last finalized EMA plus the seed accumulator for an EMA.
The current, still-moving candle is applied *on top of* that state, never folded
into it, so an intrabar point can move freely without corrupting the series it
will eventually join. A bar that received five ticks and a bar that received one
produce identical state (`chart-indicator-math.test.ts` asserts this directly).

An intrabar indicator point moving is expected and is not labelled final.

### 5.5 The default preset

| Instance | Colour | Width | Rationale |
|---|---|---|---|
| `ema-20` | `#7FB6E8` light blue | 1 | |
| `sma-20` | `#3673C9` strong blue | 2 | Visually stronger than EMA 20, as specified |
| `sma-50` | `#C94D4D` red | 1 | Also the chart's stop-loss red — which is why §5.6 exists |
| `sma-100` | `#E8ECF2` white | 1 | |

`MAX_ACTIVE_INDICATORS = 8` — a bound on renderer objects and per-tick work, and
on what a corrupted storage payload can force onto the chart. The cap is on
*enabled* instances; overflow disables rather than deletes, because a disabled
indicator costs nothing and throwing away configuration helps no one.

`CUSTOM_INDICATOR_PERIOD_READY = false`. The model, the validator
(`isValidIndicatorPeriod`, integers 2–500) and the registry all support custom
instances and are tested for it; **the UI to create and edit them is not shipped
in W5**. Half-implementing an editor was the worse option, so the four canonical
presets are what the toolbar offers. Adding the editor later requires no model
change.

### 5.6 The legend

`EMA 20 · SMA 20 · SMA 50 · SMA 100`, each with its value, in the plot's
top-left corner alongside the hovered candle's O/H/L/C. `pointer-events-none`,
so it can never intercept a crosshair, a drag or a long press.

**Colour is never the only identifier.** Every row carries its name. This is not
generic accessibility hygiene: SMA 50's red is the chart's stop-loss red, and
only the label separates "an analysis line" from "an operational level".

`OHLC_LEGEND_READY = true`. Driven by lightweight-charts' own
`subscribeCrosshairMove`, not a React mouse handler over the canvas — and it only
sets state when the *bar* under the crosshair changes, so a slow sweep across one
wide bar costs nothing. No volume, no VWAP, no fabricated daily percentage.

---

## 6. THE DRAWING MODEL (B6/B7)

### 6.1 Renderer-independent, and provably so

```
ChartDrawing { id, type, symbol, anchors[{ time, price }], style, createdAt, updatedAt }
```

Time is epoch seconds (a `MarketCandle.startTime`); price is a decimal string.
Neither is ever a screen coordinate — a drawing has to survive a zoom, a resize
and a timeframe change.

`chart-drawing-model.ts`, `chart-drawing-geometry.ts` and `chart-tool-mode.ts`
import nothing from lightweight-charts, and `chart-drawings.test.ts` exercises
all of it without a chart engine. If those tests needed the library, W0's
ARCH-028 `ChartEngineAdapter` seam would be fiction.

`chart-renderer-adapters.ts` is the **only** W5 module that imports
lightweight-charts. It holds both directions of the boundary: the indicator
series renderer (analytics *into* the engine) and the coordinate adapter
(pixels *out* of it).

### 6.2 The five tools

| Tool | Anchors | Notes |
|---|---|---|
| Horizontal line | 1 (price) | Spans the plot; stays projectable when its own anchor time scrolls out |
| Trend line | 2 | Finite segment |
| Ray | 2 | Extends from the first through the second to the plot edge — the far end is computed, never a stored anchor, and never a drag handle |
| Rectangle | 2 corners | Hit on its **edges**; the interior takes no pointer events |
| Fibonacci | 2 | Levels 0 / 0.236 / 0.382 / 0.5 / 0.618 / 0.786 / 1. Level 0 sits on the second anchor, so a retracement reads correctly drawn in either direction. No extensions in W5 |

No free-form text tool (§136/§137): nothing a trader stores can ever be rendered
as markup, which removes the XSS surface entirely rather than sanitising it.

### 6.3 Anchoring

`xToTime` snaps to the **nearest loaded candle time**. A trader clicking between
bars gets a real bar; a drawing anchored to a second no candle occupies would be
a claim about a bar that does not exist, and would jump at a different zoom.
Price is not snapped — it is continuous on the price scale, and the tick rounding
that matters for orders is the domain's job, not a drawing's.

A drawing whose anchor is older than the loaded window is simply **not drawn**.
Its record is never re-anchored to the oldest visible candle. When backfill
reaches back far enough, it appears — with the same anchors it always had.

### 6.4 Interaction

- **Create** — one click for a horizontal line; first anchor, pointer preview,
  second anchor for the rest. Escape cancels, and a half-created drawing is
  never persisted (it is not even a `ChartDrawing` — the pending draft has no id,
  no style and no timestamps).
- **Select** — click near the stroke. Handles appear on the stored anchors.
- **Edit** — drag an endpoint; drag a horizontal line vertically. Pointer capture
  keeps the drag alive when the pointer leaves the chart.
- **Delete** — `Delete`/`Backspace` with a drawing selected (never while focus is
  in a text field), or the visible **Supprimer** action.
- **Style** — cycle a five-colour palette. Not a design editor.

After a drawing completes or is cancelled, the chart returns to **Select**.

---

## 7. INTERACTION PRIORITY — THE PART THAT COULD HAVE BROKEN TRADING

This is the risk W5 actually carried: a new analytical layer sitting on top of
five-year-old interactive trading controls.

The answer is structural, not a z-index negotiation.

```
Trading overlays (position badge, SL/TP handles, pending line, alert line)
        ↑  sibling elements painted above, with their own pointer handlers
Chart container  ← drawing hit-testing runs here, in its own pointer handler
        ↓
Drawing SVG layer  ← pointer-events: none, always, everywhere
```

A pointer event that reaches the chart container **provably missed every trading
control**, because the trading overlays are separate DOM elements above it. The
drawing layer never takes a pointer event at all: hit testing runs against
projected geometry in `chart-drawing-geometry.ts`. That is also why a rectangle
is hit on its edges — an interior fill with pointer events would be an invisible
pane over the crosshair and the trading controls.

**When a drawing tool is held**, the gesture belongs to the tool, exclusively:
no context menu, no quick order, no alert, and the mobile long-press timer is not
armed. One gesture, one meaning.

`TRADING_OVERLAY_INTERACTION_PRIORITY = trading_overlay > drawing > chart`.

---

## 8. TOOLBAR, MOBILE AND PERSISTENCE (B7/B8)

### 8.1 Desktop toolbar

`[ 5s 15s 30s 1m 3m ] [ Indicateurs ▾ ] [ Outils ▾ ] [ Ajuster ]`

Timeframes are always one click away. Everything else is behind a labelled
popover so the strip cannot outgrow the panel at 1366 or 1440. **Ajuster** fits
the current content and touches nothing else — no drawing is deleted, no
indicator is reset, no timeframe changes, no command is sent.

### 8.2 Mobile

Chart-first. The timeframe strip stays visible; indicators and drawing tools
collapse into one **Outils** sheet. Choosing a drawing tool closes the sheet and
hands the chart to that tool; toggling an indicator leaves it open, because a
trader comparing two averages should not have to reopen the sheet between them.

A selected drawing gets a compact **Style / Supprimer / Terminé** strip. There is
no Buy or Sell anywhere near it.

### 8.3 Persistence

| Store | Key | Scope |
|---|---|---|
| Timeframe + indicators | `wariba.warix.chart.analysis` | account |
| Drawings | `wariba.warix.chart.drawings` | account → symbol |

Both versioned, both fail-closed, both browser-local, neither synchronised across
devices. No `chart_drawings` table, no server sync, no migration.

**Drawings are symbol-scoped but not timeframe-scoped.** A EURUSD level is a
EURUSD level whether you read it on 1m or 3m; duplicating it per interval would
be five copies to maintain by hand. Nothing in the stored shape mentions a
timeframe, so there is no key to duplicate under.

**Account-scoped** is the safer default: a trader running an evaluation and a
funded account should not find one account's analysis drawn over the other's.

Writes happen on committed change only — never on `pointermove`, never per tick.

One behavioural consequence worth naming: the chart's **first history request now
waits for stored preferences to load**. Without that, every page load fired one
hydration at the default interval and discarded it a frame later — a wasted round
trip and a visible flash of the wrong chart. The indicator engine waits for the
same signal, so a mount no longer builds four series and destroys one.

---

## 9. FILE MAP

New (`apps/web/app/(trade)/trade/`):

| File | Lines | Role |
|---|---|---|
| `chart-indicator-model.ts` | ~180 | Registry, defaults, period/style validation, caps |
| `chart-indicator-math.ts` | ~230 | SMA/EMA, gap policy, incremental state |
| `chart-indicator-engine.ts` | ~250 | Series lifecycle, rebuild vs incremental, legend |
| `chart-drawing-model.ts` | ~215 | Canonical types, parsing, Fibonacci levels |
| `chart-drawing-geometry.ts` | ~250 | `ChartCoordinateAdapter`, projection, hit testing |
| `chart-drawing-store.ts` | ~180 | Account+symbol local persistence |
| `chart-tool-mode.ts` | ~150 | Tool state, draft lifecycle, anchor edits |
| `chart-preferences.ts` | ~190 | Timeframe + indicator preferences |
| `chart-renderer-adapters.ts` | ~170 | **The only lightweight-charts import in W5** |
| `use-chart-analysis.ts` | ~430 | The one hook TradeChart consumes |
| `ChartToolbar.tsx` | ~300 | Timeframes, indicators, tools, fit |
| `ChartLegend.tsx` | ~95 | OHLC + indicator legend |
| `ChartDrawingLayer.tsx` | ~200 | SVG overlay, zero pointer events |

Modified: `market-candles.ts` (+ two intervals, named default, narrowing
predicate), `chart-history.ts` (+ backfill), `TradeChart.tsx` (+ wiring),
`ChartWorkspace.tsx` / `TradeClient.tsx` (+ `accountId`),
`market-history-store.ts` (**comments only** — see §1.2.2).

---

## 10. PERFORMANCE

Measured on the realistic load, not a synthetic benchmark.

| Scenario | Work |
|---|---|
| Hydration, 400 candles × 4 indicators | 4 full calculations, 4 `setData`, 1 `setData` for candles |
| One accepted tick, 4 indicators | 4 × O(1), 4 line `update`, 1 candle `update`. **Zero** `setData` |
| Older page prepend, 400 bars | 1 merge, 1 candle `setData`, 4 indicator rebuilds, 1 logical-range write |
| Drawing drag, 40 pointer moves | 40 chart-local state updates, **0** storage writes, **0** chrome re-renders |
| 2 000 candles × 8 indicators | Bounded by `MAX_ACTIVE_INDICATORS`; rebuild is O(candles × indicators), and only on the five rebuild events |

`chart-render-ownership.test.tsx` asserts the second and fourth rows directly:
25 accepted ticks with four indicators and five drawings on screen produce
≥ 100 line updates, **zero** additional `setData`, and **zero** chrome renders.

Series ownership is explicit: one candlestick series, one line series per
*enabled* indicator, created and destroyed only by the engine and never as a side
effect of a React render.

---

## 11. ACCESSIBILITY

- **Timeframes** — a real `radiogroup` with roving tabindex and arrow-key
  navigation that wraps at both ends. `aria-checked` carries the current
  interval; selection is never colour-only.
- **Indicators** — real checkboxes named `EMA 20`, `SMA 20`, `SMA 50`, `SMA 100`.
  At the cap, the disabled control says why.
- **Drawing tools** — buttons with text names and `aria-pressed`.
- **Keyboard** — Escape cancels an active drawing (and is only claimed when there
  is something to cancel, so dialogs keep their own Escape); Delete removes a
  selected drawing, and never fires while focus is in a text field. Focus is not
  trapped.
- **Announcements** — the drawing layer is `aria-hidden`, the legend is inert.
  Nothing announces per tick or per pointer move.

W5 does **not** claim keyboard-only drawing placement. The toolbar is fully
keyboard accessible; placing an anchor requires a pointer.

---

## 12. TEST RESULTS

Run in the order §148 specifies. **401 web unit tests, 87 contracts, 84 realtime,
and 59 live Playwright `@trade` tests — all green. Fast Gate green.**

The live suite ran against the local Supabase stack with a real realtime process
and a seeded trade account (§17.1). It is what caught defect 6 in §12.3: the unit
suite cannot exercise an E2E page-object helper, so a selector broken by W5's
accessibility change survived until a browser actually clicked it.

| Suite | File | Tests | What it pins |
|---|---|---|---|
| Timeframe contract + buckets | `packages/contracts/tests/market-candles.test.ts` | 21 | 15s/3m boundaries, 5s/30s/1m preserved, one duration map, default is `5s`, tick charts rejected |
| Server aggregation | `services/realtime/tests/market-history-store.test.ts` | 30 | One tick → five aggregators; no fabricated past for a young interval; key count derived from the contract |
| Single observation | `market-history-observation.test.ts` | 10 | **Unchanged** — one accepted tick, one observation, whatever the client count |
| History transport | `market-history-transport.test.ts` | 22 | **Unchanged** — all five timeframes accepted |
| History + backfill | `apps/web/tests/chart-history.test.ts` | 57 | 45 W3 regression + 12 new: single in-flight under 40 events, dedupe, shift count, no refit, epoch race, timeframe race, failure containment |
| SMA/EMA math | `chart-indicator-math.test.ts` | 16 | Hand-computed values at 20/50/100, EMA seed and α, gap break, intrabar = final on close |
| Indicator engine | `chart-indicator-engine.test.ts` | 18 | Series lifecycle, rebuild vs incremental, prepend correctness, legend, registry caps |
| Drawings | `chart-drawings.test.ts` | 31 | Round-trip all five types, malformed records discarded, projection, ray direction, Fibonacci both ways, hit testing, storage isolation |
| Preferences | `chart-preferences.test.ts` | 11 | Fail-closed, unsupported timeframe → default, account scoping, cap enforcement, nothing financial stored |
| Toolbar + legend | `chart-toolbar.test.tsx` | 18 | Radiogroup semantics, arrow keys, named checkboxes, density, no volume/VWAP |
| **Interaction priority** | `chart-interaction-priority.test.tsx` | 15 | SL/TP/pending/alert drags still fire with drawings present; tool mode suppresses trade gestures; Delete touches only drawings; symbol isolation; backfill shift in the real component |
| Mobile tools | `chart-mobile-tools.test.tsx` | 8 | Five timeframes at 390 px, sheet flow, drawing on touch, one config across breakpoints |
| Render ownership | `chart-render-ownership.test.tsx` | 3 | 25 ticks → 0 chrome renders; drag → 1 storage write; no preference write per tick |
| W4 execution | `execution-controls.test.tsx` | 27 | **Unchanged** — Execution Center intact |
| W3 isolation | `chart-history-isolation.test.tsx` | 12 | **Unchanged** — history cannot execute |
| W1/W2 chrome | `workstation-render-ownership.test.tsx`, `workstation-chrome.test.tsx` | 25 | **Unchanged** |
| **Live browser** | `pnpm test:e2e:trade` (desktop + mobile projects) | **59** | Order lifecycle, rejection, SL/TP, Close All, reconnection, partial close, keyboard access, axe scans, W1 shell, W2 navigator/dock, W3 history and timeframes, W4 execution — all against a real realtime process |

### 12.1 A shared renderer double

W5 widened the renderer surface (line series, crosshair subscription, logical
range read/write). Three hand-rolled lightweight-charts fakes would have drifted
until one silently stopped exercising a path, so
`apps/web/tests/support/lightweight-charts-double.ts` is now the single double
every chart test uses.

### 12.2 Failures investigated, not retried

Three real defects surfaced during the test pass and were fixed at the root:

1. **jsdom's `PointerEvent` drops `clientX`/`clientY`** from its init dictionary,
   so a drawing hit test received `NaN` coordinates. The test now assigns the
   properties onto a plain `Event`, which is what React reads anyway. No
   production code was weakened to accommodate the environment.
2. **`BottomSheet` is a `<dialog>` and keeps its children mounted when closed**,
   which put a hidden second copy of every indicator checkbox and tool button in
   the accessibility tree alongside the desktop popover's. Fixed in the component
   by rendering the sheet's content only while open — a real accessibility defect
   the test found.
3. **The first history request fired at the default timeframe** before stored
   preferences loaded, then immediately fired again. Fixed by gating both the
   hydration and the indicator configure on a `loaded` flag (§8.3).

### 12.3 Three more found by engineering review of the evidence harness

Review of the committed evidence spec found two harness defects and the live run
found a third. All three are test-only; no product behaviour changed.

4. **The evidence spec could not honestly execute.** One shared readiness gate
   required every default indicator to hold a value before *any* screenshot.
   Because the preset includes SMA 100, that silently demanded 100 genuinely
   observed candles on every timeframe it was called for — 8 min on 5s, 25 min on
   15s, 1 h 40 on 1m, **5 h on 3m** — against a 10-minute timeout. Readiness is
   now state-specific (§13.1). The fix could not have been to speed the market up
   even if that were allowed: candles are wall-clock bucketed, so raising the
   simulator's tick rate does not raise the candle rate.
5. **Backfill evidence was sampled, not awaited.** The older page is
   asynchronous, so reading the candle count straight after the pan could record
   `pageLanded: false` before the response arrived. The harness now polls for a
   truthful terminal outcome (§13.2).
6. **The drawing layer was painting underneath the chart.** The one that
   mattered. lightweight-charts sets `z-index: 1` on its canvas; nothing between
   that canvas and the chart column created a stacking context, so the `1` beat
   every sibling overlay's `z-index: auto` **regardless of DOM order** — and the
   §57 hierarchy in §7 above, which reasons entirely from DOM order, was
   describing something CSS was not doing. Every geometry assertion passed the
   whole time: the anchors, the projection, the strokes and the SVG box were all
   correct, and none of it was visible. Fixed with `isolation: isolate` on the
   chart container, which keeps the library's z-index the library's business and
   makes DOM order authoritative again. Now asserted in
   `warix-w5-drawing-visibility.spec.ts`.
7. **Drawings defaulted to the crosshair's own colour.** `#9AA3B1` **is**
   `--wariba-chart-crosshair`, and `#6684FF` in the palette **is**
   `--wariba-chart-position`. Even once the layer painted, a reviewer could not
   separate a trend line from the pointer. The palette is now chosen against the
   operational colours rather than for variety (see `DRAWING_COLORS`).
8. **A 1 px stroke put drawings below the indicators.** The required order is
   `… > selected drawing > drawing > indicators > grid`, and at width 1 with
   0.85 opacity a trader's own analysis read as fainter than a moving average.
   Default width is now 2 and normal opacity 0.95 — still short of the labelled
   HTML chips every trading overlay carries, so §127 holds.
9. **A W3 E2E test broke on W5's accessibility improvement.** `warix-w3.spec.ts`
   selected timeframes with `getByRole('button') + aria-pressed`; §86
   deliberately made the control a real `radiogroup`. Caught by the live run, not
   by the unit suite, which does not exercise the E2E helpers. Both W3 specs now
   use `role="radio"` + `aria-checked`; the behaviour under test is unchanged.

---

## 13. VISUAL EVIDENCE

`apps/web/tests/e2e/warix-w5-evidence.spec.ts`, tagged `@warix-w5-evidence`,
writing to `apps/web/test-results/warix-w5-review/`. Not part of any gate; no
pixel-diff acceptance.

```
# One invocation — Playwright wipes test-results at the start of each run, so
# running these separately deletes the previous spec's artifacts.
pnpm --filter @wariba/web exec playwright test \
  tests/e2e/warix-w5-drawing-visibility.spec.ts \
  tests/e2e/warix-w5-backfill.spec.ts \
  tests/e2e/warix-w5-evidence.spec.ts --project=desktop
```

Three specs, because two of the questions a reviewer asked could not be answered
by the survey spec alone:

| Spec | Answers |
|---|---|
| `warix-w5-drawing-visibility.spec.ts` | Is each drawing type *visible*? Ten checks per type — stored record, projection, layer box, expected SVG geometry, coordinates inside the plot, computed stroke, stacking, pointer-events, selection handles, and that no stroke resolves to the crosshair colour. Pointer parked outside the plot for every capture |
| `warix-w5-backfill.spec.ts` | Did an older page genuinely load? Reads the history conversation off the WebSocket, so "bounded first page" and "page size" are facts rather than inferences |
| `warix-w5-evidence.spec.ts` | The workstation survey: timeframes, indicators, drawings, mobile, overflow matrix |

Eleven captures: NAS100 5s with four warmed moving averages · the indicator menu
· NAS100 15s and 3m timeframe proofs · EURUSD 3m with a trend line and a
horizontal line · EURUSD with Fibonacci and a rectangle · before and after a
pan-left backfill · the full 1920×1080 workstation · and four mobile states at
390×844.

### 13.1 Readiness is state-specific, because history is honest

W3 history is observed process memory at one accepted tick per second per
symbol. Candles are bucketed by wall clock, so **depth costs real time and
nothing can shorten it without lying**. Each capture therefore asks for the
readiness it actually needs:

| Proof | Requires | Does **not** require |
|---|---|---|
| Indicator (§A) | 5s only — the shortest honest interval — with ≥ 100 genuinely observed candles and a legend holding a value for every default indicator, SMA 100 included | — |
| Timeframe (§B) | the interval became active, and history resolved to `ready` **or** `empty` | any indicator to be warm |
| Drawing (§C) | specs loaded, history resolved, a plot to click in | 100 candles of the drawn interval |

Sparse 1m/3m history on a young process is a **correct W3 state**, not a
failure. The manifest records the observed depth per interval and labels it,
rather than pretending it away. What is never acceptable, and is still barred
everywhere, is photographing `loading`.

### 13.2 Backfill is proved from the wire, not inferred from the DOM

Two DOM-based attempts were wrong before this one, and both failure modes are
worth recording because they look like passes:

1. **The client had accumulated every retained bar live.** It was open while the
   process was young, so there was genuinely nothing older to fetch:
   `candlesBefore == candlesAfter`, `hasMore = false`. That is not a backfill
   test, it is the absence of one. The fix is ordering — warm the *server*
   first, then open a fresh client.
2. **A live candle finalized during the pan.** On a 5s chart
   `data-history-candles` increments every five seconds on its own, so "the
   count went up" was satisfied by the market ticking over. That recorded a
   `prependedCount` of 1 and called it a page.

The signal now comes from the WebSocket: a `market_history_result` correlated to
a request that carried a `before` cursor. The page size is what the server sent.
The DOM delta is still recorded alongside it, and labelled, because it
legitimately includes live growth.

### 13.3 Viewport preservation, measured with a ruler the product already has

The harness polls for one of two truthful terminal outcomes: an older page lands
and the candle count rises, or the server reports no older retained page — the
§23 retention floor, which is an end state rather than a failure. The manifest
says which, and carries `candlesBefore`, `candlesAfter`, `pageLanded`,
`hasMoreOlder` before and after, `sourceEpoch` before and after with a stability
flag, and the timeframe.

A drawing is anchored to a candle *time* and projected through the same
coordinate adapter the chart uses, so the `x1` of a trend line is a direct
readout of where that instant sits on screen. Place one, pan in uniform 90 px
steps sampling it before each step, and compare across the prepend: if the
logical range shifted correctly the anchor does not move; if it did not, the
anchor moves by roughly 1 200 px (400 bars' worth). The recorded shift was
**54 px** — less than one pan step, against a 120 px tolerance and a ~20×
margin to the failure case.

A coarse-then-fine pan cannot work here, and it is worth saying why: nothing
observable reports "you are nearly at the oldest bar", so a coarse phase lands
the page itself and no clean pre-prepend sample ever exists. Uniform stepping is
what makes the tolerance honest rather than convenient.

The OHLC legend reading is kept as a secondary record — it is bar-quantised and
cannot resolve the difference as finely. The *exact* shift remains asserted where
it can be measured precisely: `chart-interaction-priority.test.tsx` pins
`setVisibleLogicalRange({from: from+N})` and the absence of `fitContent`.

### 13.1 Human review questions

To be answered by the reviewer against the captures:

- Does the chart still dominate the workstation?
- Are the four moving averages readable rather than cluttered?
- Are trading overlays instantly distinguishable from drawings?
- Is the toolbar compact at 1440×900?
- Can a trader switch timeframe in one action?
- Can a trader add and delete a drawing without confusion?
- Does pan-left loading preserve visual position?
- Does mobile remain chart-first?
- Do drawing controls interfere with mobile trading actions?
- Is Fibonacci useful without dominating the chart?

---

## 14. DECISION LOG — W5

| # | Decision | Status | Why |
|---|---|---|---|
| W5-D1 | The WariX chart timeframe set is **5s / 15s / 30s / 1m / 3m** | LOCKED | Longer intervals would exceed what process-uptime history can honestly fill; the set is one canonical array every consumer iterates |
| W5-D2 | **No tick charts** until an exchange-trade-event semantic exists | LOCKED | The feed publishes quote updates. Labelling a 1000-quote bar "1000T" would fabricate a market semantic |
| W5-D3 | Retention stays at **2 000** per (symbol, timeframe); footprint recalculated to ≈ 15 MB | LOCKED for W5 | Re-derived rather than inherited. Reducing it to hold the old 9 MB would cost the pan-left depth W5 delivers, for ~6 MB |
| W5-D4 | Backfill activates the **W3 pagination contract**; one page in flight per (symbol, timeframe, generation) | LOCKED | The protocol already existed; W5 adds a trigger and a guard, not a second history path |
| W5-D5 | Older-page prepend **shifts the logical range** by the prepended count; `fitContent()` is never called after a backfill | LOCKED | The trader panned there deliberately. Refitting would undo the gesture that requested the data |
| W5-D6 | EMA is seeded with the **SMA of the first N observed closes**; α = 2/(N+1) | LOCKED | Libraries disagree; an undocumented default would make two charts of the same market disagree |
| W5-D7 | Indicator analytics are **visual and non-authoritative**, calculated in `number` and isolated to the chart layer | LOCKED | They must never be reachable from risk, orders, alerts, SL/TP or payout — which is also why they stay out of `@wariba/domain` |
| W5-D8 | Indicator gap breaks are placed on the **first candle after the gap** | LOCKED | Whitespace at the missing bucket's own time would add a chart slot no series occupies, shifting bar indices and breaking W5-D5's compensation |
| W5-D9 | The drawing model is **renderer-independent**; one adapter file is the only lightweight-charts import | LOCKED | W0's ARCH-028 seam. Proved by tests that run the whole model without a chart engine |
| W5-D10 | Drawings are **browser-local, account-scoped, symbol-scoped, not timeframe-scoped** | LOCKED for W5 | A level is a level across intervals. Account scoping keeps an evaluation account's analysis off a funded account's chart. No table, no sync, no migration |
| W5-D11 | **Trading overlays take interaction priority** in Select mode, enforced by DOM layering rather than z-index arithmetic | LOCKED | A drawing layer that could swallow a stop-loss drag is the one failure this milestone could not ship |
| W5-D12 | **No free-form text drawing** in W5 | LOCKED | Removes the stored-XSS surface entirely rather than sanitising it |
| W5-D13 | Custom indicator periods are **modelled and validated but not editable in the UI** | OPEN | Half-implementing an editor was the worse option. `CUSTOM_INDICATOR_PERIOD_READY = false`; adding it later needs no model change |

---

## 15. KNOWN LIMITATIONS

1. **History depth is still bounded by process uptime** (W3's DATA-003,
   unchanged). Backfill reaches the oldest *retained* candle, not the beginning
   of the market, and `hasMore = false` says exactly that. Nothing survives a
   realtime restart.
2. **A young process has shallow long-interval history.** A 3m chart on a
   freshly started process shows one in-progress bar. This is honest and
   deliberate.
3. **Drawings and indicator settings do not follow the trader to another
   device.** They are browser-local. Cross-device would need a server preference
   store, which W5 does not introduce.
4. **Custom indicator periods are not editable** (W5-D13).
5. **No keyboard-only drawing placement.** The toolbar is keyboard accessible;
   placing an anchor needs a pointer.
6. **One drawn indicator point is suppressed at each genuine history gap**
   (W5-D8) — the cost of breaking the line without inventing a chart slot.
7. **One older page loads on hydration, before any pan.** Found by the live
   evidence run, not by the unit suite. Hydration ends with `fitContent()`
   (W3 §44), which puts the whole loaded series in view — so the leftmost
   visible logical index is ≈ 0, the 50-bar threshold in §4.1 is already
   crossed, and the backfill fires immediately. One page, not a loop: the
   prepend preserves the viewport, which puts the left edge 400 bars away and
   stops further triggering.

   Nothing about it is incorrect — the merge deduplicates, the viewport is
   compensated, single-inflight holds, `sourceEpoch` is stable — but it is a
   deviation from §17/§18's "when the trader pans", and it costs one extra
   ~35 KB history request per hydration and per symbol or timeframe switch.
   **Deliberately not changed in this pass**, which is scoped out of production
   history behaviour; the evidence manifest carries `candlesAtPanStart` and
   names the mechanism so the decision sits with a human. The obvious remedies
   (arm the trigger only after the first user-driven range change, or exempt the
   range change that `fitContent` itself causes) are both one-line and both
   change history behaviour, so neither was applied.
8. **No volume, VWAP, DOM, Level II or Time & Sales.** The feed carries no
   authoritative volume or trade-tape semantics, so none is displayed.

---

## 16. W5 FLAGS

```
W5_CHART_AUDIT_READY                    = true

W5_TIMEFRAME_CONTRACT_READY             = true
W5_15S_READY                            = true
W5_3M_READY                             = true
W5_TIMEFRAME_SWITCH_READY               = true

W5_HISTORY_BACKFILL_READY               = true
W5_BACKFILL_VIEWPORT_PRESERVATION_READY = true
W5_BACKFILL_RACE_READY                  = true

W5_INDICATOR_ENGINE_READY               = true
W5_SMA_READY                            = true
W5_EMA_READY                            = true
W5_INDICATOR_LIVE_UPDATE_READY          = true
W5_INDICATOR_GAP_RENDERING_READY        = true
W5_INDICATOR_PREFERENCES_READY          = true

W5_DEFAULT_EMA20_READY                  = true
W5_DEFAULT_SMA20_READY                  = true
W5_DEFAULT_SMA50_READY                  = true
W5_DEFAULT_SMA100_READY                 = true

W5_DRAWING_MODEL_READY                  = true
W5_HORIZONTAL_LINE_READY                = true
W5_TREND_LINE_READY                     = true
W5_RAY_READY                            = true
W5_RECTANGLE_READY                      = true
W5_FIBONACCI_READY                      = true
W5_DRAWING_PERSISTENCE_READY            = true
W5_DRAWING_EDIT_READY                   = true

W5_TRADING_OVERLAY_PRIORITY_READY       = true
W5_CHART_TOOLBAR_READY                  = true

W5_MOBILE_TIMEFRAMES_READY              = true
W5_MOBILE_INDICATORS_READY              = true
W5_MOBILE_DRAWINGS_READY                = true
W5_MOBILE_OVERFLOW_READY                = true

W5_ACCESSIBILITY_READY                  = true
W5_RENDER_OWNERSHIP_READY               = true
W5_PERFORMANCE_READY                    = true
W5_VISUAL_EVIDENCE_READY                = true

W5_W3_REGRESSION_READY                  = true
W5_W4_REGRESSION_READY                  = true
W5_TRADE_E2E_READY                      = true      (59/59 against the local stack; see §17.1)
W5_FAST_GATE_READY                      = true

W5_ACCEPTED                             = pending human visual review
```

### Implemented truth

```
CHART_RENDERER                              = lightweight-charts 4.2
SUPPORTED_TIMEFRAMES                        = 5s, 15s, 30s, 1m, 3m
DEFAULT_CHART_TIMEFRAME                     = 5s
SERVER_HISTORY_TIMEFRAMES                   = 5s, 15s, 30s, 1m, 3m
SERVER_HISTORY_RETENTION_PER_SYMBOL_TIMEFRAME = 2000
W5_APPROX_HISTORY_CACHE_ENTRIES             = 50000  (5 symbols × 5 timeframes × 2000)
W5_APPROX_HISTORY_MEMORY                    = ~15 MB at full occupancy
HISTORY_BACKFILL_TRIGGER                    = visible logical range; leftmost bar index ≤ 50
HISTORY_BACKFILL_PAGE_SIZE                  = 400
HISTORY_BACKFILL_MAX_INFLIGHT               = 1
AUTOMATIC_PAN_LEFT_BACKFILL_READY           = true

INDICATOR_PRICE_SOURCE                      = CANDLE_CLOSE_MID
EMA_SEED                                    = SMA_OF_FIRST_N_OBSERVED_CLOSES
EMA_ALPHA                                   = 2/(N+1)
SMA_WINDOW                                  = LAST_N_OBSERVED_CANDLE_CLOSES
MAX_ACTIVE_INDICATORS                       = 8
DEFAULT_INDICATORS                          = EMA20, SMA20, SMA50, SMA100
CUSTOM_INDICATOR_PERIOD_READY               = false
INDICATOR_GAP_VISUAL_POLICY                 = whitespace_at_first_candle_after_gap

DRAWING_TYPES                               = horizontal_line, trend_line, ray, rectangle, fibonacci
DRAWING_STORAGE_MODE                        = BROWSER_LOCAL_VERSIONED
DRAWING_SCOPE                               = account + symbol (not timeframe)
MAX_DRAWINGS_PER_SYMBOL                     = 100
DRAWING_RENDERER                            = SVG overlay, pointer-events: none
DRAWING_COORDINATE_ADAPTER                  = chart-renderer-adapters.ts → ChartCoordinateAdapter
TRADING_OVERLAY_INTERACTION_PRIORITY        = trading_overlay > drawing > chart
```

### Correctness evidence

```
BUCKET_BOUNDARIES_5S            = PASS
BUCKET_BOUNDARIES_15S           = PASS
BUCKET_BOUNDARIES_30S           = PASS
BUCKET_BOUNDARIES_1M            = PASS
BUCKET_BOUNDARIES_3M            = PASS

TIMEFRAME_HISTORY_PARITY        = PASS
TIMEFRAME_SWITCH_RACE           = PASS

BACKFILL_SINGLE_INFLIGHT        = PASS
BACKFILL_DEDUP                  = PASS
BACKFILL_VIEWPORT_PRESERVED     = PASS
BACKFILL_SOURCE_EPOCH_RACE      = PASS

SMA20_MATH                      = PASS
SMA50_MATH                      = PASS
SMA100_MATH                     = PASS
EMA20_MATH                      = PASS
CURRENT_CANDLE_INDICATOR_UPDATE = PASS
INDICATOR_GAP_BREAK             = PASS

DRAWING_HORIZONTAL              = PASS
DRAWING_TREND                   = PASS
DRAWING_RAY                     = PASS
DRAWING_RECTANGLE               = PASS
DRAWING_FIBONACCI               = PASS

DRAWING_SYMBOL_ISOLATION        = PASS
DRAWING_TIMEFRAME_SHARING       = PASS
DRAWING_PERSISTENCE             = PASS
DRAWING_DELETE_ISOLATION        = PASS

SL_DRAG_PARITY                  = PASS
TP_DRAG_PARITY                  = PASS
PENDING_DRAG_PARITY             = PASS
ALERT_OVERLAY_PARITY            = PASS
MOBILE_LONG_PRESS_PARITY        = PASS

W3_HISTORY_REGRESSION           = PASS
W4_EXECUTION_REGRESSION         = PASS
```

### Preserved

```
DATABASE_SCHEMA_CHANGED                  = false
TRADING_DOMAIN_MATH_CHANGED              = false
PAYOUT_MATH_CHANGED                      = false
60_SECOND_ELIGIBILITY_CHANGED            = false
MARKET_ORDER_SEMANTICS_CHANGED           = false
PENDING_ORDER_SEMANTICS_CHANGED          = false
SL_TP_SEMANTICS_CHANGED                  = false
PARTIAL_CLOSE_SEMANTICS_CHANGED          = false
REALTIME_EXECUTION_SEMANTICS_CHANGED     = false
W3_SOURCE_EPOCH_SEMANTICS_CHANGED        = false
W3_HISTORY_LIVE_STITCH_SEMANTICS_CHANGED = false
W4_EXECUTION_CENTER_ARCHITECTURE_CHANGED = false
LIGHTWEIGHT_CHARTS_REPLACED              = false
REAL_MARKET_DATA_PROVIDER_READY          = false
REAL_MARKET_HISTORY_PROVIDER_READY       = false
TICK_CHARTS_READY                        = false
VWAP_READY                               = false
LEVEL_II_READY                           = false
TIME_AND_SALES_READY                     = false
PERSONAL_RISK_GUARD_STARTED              = false
PERFORMANCE_INTELLIGENCE_STARTED         = false
WORKSPACE_PRESETS_STARTED                = false
W6_STARTED                               = false
```

Scope check, from the diff: `packages/domain`, `packages/policies`,
`packages/application` and every `supabase/migrations` path are **untouched**.
`services/realtime/src/market-history-store.ts` changed by **comments only** —
the two new intervals are picked up by an existing loop over `CANDLE_TIMEFRAMES`.

---

## 17. WHAT W5 DID NOT RUN, AND WHY

- **WARIBA Full Certification** — out of scope per §148.
- **Load / HA / failover** — leadership, fencing and execution infrastructure
  were not modified, so §148's precondition for running them was not met.

### 17.1 The data plane the live runs used

The repository's `.env.local` points at a **remote** Supabase project. The
config guard (`assertLocalDataPlane`) refuses to start `APP_ENV=local` against
it, and that guard was **not** overridden — creating test accounts, orders and
positions on a remote data plane to produce screenshots is exactly what it
exists to prevent. The live runs therefore used the local Supabase stack
(`127.0.0.1:54321` / `:54322`) with `MARKET_DATA_PROVIDER=mock`, one realtime
process, and a seeded trade account created by the existing `tradeAccount`
fixture. No historical candle was fabricated at any point; every bar in the
evidence is one the realtime process genuinely observed from its own accepted
tick stream.

### 17.2 Indicator warm-up is wall-clock time, not a knob

`MARKET_TICK_INTERVAL_MS` is configurable, and lowering it would *not* have
shortened the indicator warm-up by a second: candles are bucketed by UTC wall
clock, so a 5s bar takes five real seconds however many quotes arrive inside it.
Tick rate is not candle rate. The evidence run therefore waited for the realtime
process to genuinely observe the bars it needed — roughly 8 minutes for SMA 100
on 5s, and roughly 34 minutes before a second history page existed to page back
into. That wait is the honest cost of W3's observed-memory history, and the
alternative (seeding candles) is the one thing this milestone must never do.
