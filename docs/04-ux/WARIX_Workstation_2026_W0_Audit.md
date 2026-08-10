# WariX Workstation 2026 — W0 forensic audit & target architecture

Audit only. No redesign implemented. Every claim below carries a file or a
measurement; items the brief asked to "verify, do not assume" are marked
**CONFIRMED** or **REJECTED**.

Baseline: `main` @ `8d2ce25` (post-Prompt-09 merge). Branch:
`feat/warix-workstation-2026`.

---

## 0. ACCEPTANCE & REVIEW CLARIFICATIONS

W0 passed human architecture review. The forensic measurements below are
unchanged; the four clarifications recorded here **override** any wording in
later sections that reads more strongly than intended.

**A. Market history — persistence is not yet decided.** A future
`MarketHistoryPort` is accepted. §8's "OHLC persistence" must *not* be read as
a locked architectural decision: W3 will choose between a provider historical
API, WARIBA-owned persistence, WARIBA caching, or a hybrid, from the actual
capabilities and licensing of the market-data provider once it is known. W1
does not touch this.

**B. Certification cadence.** W1 does **not** run WARIBA Full Certification —
§11's exit column is amended accordingly. Per-milestone gates are: focused
unit/component tests → relevant application/account integration → the WariX
trade E2E affected by the change → relevant realtime functional and
account-isolation tests → mobile WariX tests → accessibility regression → one
PR Fast Gate. Full Certification is reserved for the final Workstation
certification milestone unless a later architectural change requires
otherwise.

**C. Render-count semantics.** Risk-register item 3 is amended: the assertion
is *not* "the entire dock renders zero times for N ticks".
`PositionsTabPanel` legitimately subscribes to every tick to show live P&L.
What must be proven is that a selected-symbol tick does not unnecessarily
re-render `WorkstationShell`, `NavRail`, `WorkstationStatusBar`, the account
switcher, dock chrome/tab bar, inactive dock panels, closed dialogs, or
unrelated market rows. Legitimate consumers are the selected chart workspace,
the Execution Center / current-quote presentation, the affected Market
Navigator row, and visible Positions content whose live P&L depends on that
tick.

**D. Drawings, indicators, energies — unchanged.** Indicators come after real
history; no fake EMA/SMA over session-only candle state; the drawing
architecture retains the existing renderer-independent HTML overlay boundary
unless future evidence disproves it; no empty Energies category is rendered
while no authoritative instruments exist. None of these are implemented in W1.

---

## 1. CURRENT_WARIX_ARCHITECTURE

`apps/web/app/(trade)/` — 23 files, 6 030 lines.

| File | Lines | Role |
|---|---|---|
| `layout.tsx` | 15 | Dark theme wrapper. **No navigation of any kind.** |
| `trade/page.tsx` | 47 | RSC entry. Auth → `getLatestAccountForUser` → `TradeClient`. |
| `trade/TradeClient.tsx` | **1 709** | Everything else: WS lifecycle, snapshot, all command handlers, layout, dock, 6 dialogs. |
| `trade/TradeChart.tsx` | **1 209** | Lightweight Charts + candle builder + 3 overlay systems + context menu. **26 props.** |
| `trade/PartialCloseSheet.tsx` | 406 | Partial close bottom sheet. |
| `trade/ChartPositionOverlay.tsx` | 303 | Draggable SL/TP overlay. |
| `trade/PayoutCenterPanel.tsx` | 259 | Payout request panel, rendered **inside the execution dock**. |
| `trade/NotificationCenter.tsx` | 240 | Alert notifications drawer. |
| `trade/OrderTicket.tsx` | 237 | Order form (21 props, all controlled from `TradeClient`). |
| `trade/ModifyPendingOrderDialog.tsx` | 204 | |
| `trade/ChartContextMenu.tsx` | 197 | |
| `trade/ModifyPositionDialog.tsx` | 179 | |
| `trade/ChartPendingOverlay.tsx` | 177 | Pending-order + alert overlay. |
| `trade/CloseAllDialog.tsx` | 150 | |
| `trade/PendingOrderConfirm.tsx` | 134 | |
| `trade/QuickOrderConfirm.tsx` | 115 | |
| `trade/PositionsTabPanel.tsx` | 114 | |
| `trade/WatchlistPanel.tsx` | 99 | Static symbol list. |
| `trade/TradeRiskDetail.tsx` | 96 | |
| `trade/TradeHeaderPanel.tsx` | 92 | Account context + balance/equity/eligible + RiskRibbon. |
| `trade/tick-store.ts` | ~60 | External tick store, `useSyncExternalStore`. |
| `trade/chart-overlay-geometry.ts` | — | Overlay collision resolution. |
| `trade/error.tsx` | 48 | |

Shared UI consumed from `@wariba/ui`: `AccountContext`, `RiskRibbon`,
`Guardian`, `PayoutBreakdown`, `ExecutionState`, `OpenPositionsTable`,
`WariXPositionsTable`, `BottomSheet`, `Tabs`, `DataTable`.

**Structural observation.** `TradeClient` is not a container — it is the
application. Layout, transport, command orchestration and six dialogs share
one 1 709-line client component with no seam between them. Every redesign
item in this brief passes through that file, which is why W1 must open a seam
before anything visual changes.

---

## 2. CURRENT_CAPABILITY_MATRIX

| Capability | State | Evidence |
|---|---|---|
| Market buy/sell | **EXISTS** | `TradeClient` → server command path, certified Prompt 07 |
| Buy/Sell Limit & Stop | **EXISTS** | `OrderTicket.TicketOrderKind`, Appendix 07-D |
| GTC persistence + trigger-time revalidation | **EXISTS** | `packages/database/src/pending-orders.ts` |
| SL / TP | **EXISTS** | Ticket + draggable chart overlay |
| Partial / full close, Flatten | **EXISTS** | `PartialCloseSheet`, `CloseAllDialog` |
| Position reduction queue | **EXISTS** | `position-reduction-queue.ts` |
| Price alerts | **EXISTS** | `price-alerts.ts`, chart overlay, `NotificationCenter` |
| Stale / outage gating | **EXISTS** | `tick-gate.ts`, market status in ticket + watchlist |
| 60 s eligibility | **EXISTS** | `profit-eligibility.ts`, 59 999/60 000 boundary tested |
| HA / fencing | **EXISTS** | `realtime-leadership.ts` |
| Tick isolation | **PARTIAL** | Store is correct; `TradeClient` itself subscribes — see §3/P |
| Candle chart | **PARTIAL** | Live only; **session-local**, no history |
| Timeframes | **PARTIAL** | Exactly **5s / 30s / 1m** (`TradeChart.tsx:108`) |
| Historical candles | **BLOCKED_BY_DATA** | No tick/OHLC table exists in any migration (DATA-003) |
| Indicators (EMA/SMA/…) | **MISSING** | No `addLineSeries`, no indicator module anywhere |
| Drawing tools | **MISSING** | Crosshair only (Lightweight Charts default) |
| Account switching in WariX | **MISSING** | `page.tsx:26` auto-selects; no selector rendered |
| Market search / favorites / categories | **MISSING** | `WatchlistPanel` maps `TRADABLE_SYMBOLS` verbatim |
| Trader navigation rail | **MISSING** | `(trade)/layout.tsx` is 15 lines, zero links |
| Workspace presets | **MISSING** | — |
| Personal risk controls | **MISSING** | No table, no column, no read model |
| Trade statistics (win rate, profit factor) | **MISSING** | No such computation in `domain` or `application` |
| DOM / Time & Sales / Level II | **OUT_OF_SCOPE** | No depth, trade-print or book data exists |

---

## 3. VERIFICATION OF THE BRIEF'S SUSPECTED PROBLEMS

### A. Account context

1. **CONFIRMED.** `trade/page.tsx:26` — `getLatestAccountForUser(db, { userId })`,
   then `account.status !== 'active'` → empty state. The chosen account is
   never surfaced or changeable.
2. **CONFIRMED (cannot switch).** `TradeClient` receives `accountId` as a
   prop from the server component; no selector, no `searchParams`, no
   outbound link — `grep -n "href=\|Link" TradeClient.tsx` returns nothing.
   `listAccountsForUser` and the `AccountSelector` component both already
   exist and are used by the Hub, so the read model is not the gap.
3. **CONFIRMED.** UX-NAV-001 (`DECISION_LOG.md:452`) requires a **full
   document navigation** for account switching — `next/link` and
   `router.push` both silently failed. Any WariX account selector must obey
   this: a hard navigation, not a client transition.
4. **CONFIRMED — and it is a correctness bug, not styling.**
   `TradeHeaderPanel.tsx:38` passes `program="WARIBA ONE"` as a literal, so a
   `WARIBA_PERFORMANCE` account is mislabeled in the terminal header. The
   snapshot already carries `programType` (`TradeClient` reads
   `snapshot?.programType` at the dock). `page.tsx:31` likewise hardcodes
   "compte WARIBA ONE actif".

### B. Global header — measured

Rendered header block is **214 px at 1366, 1440, 1920 and 2560** — fixed, never
compacts. Composition: `AccountContext` (program + nominal + public id +
status) → `<dl>` of Balance / Equity / Balance éligible → `RiskRibbon` →
`TradeRiskDetail` → a second row for "Marché {symbol}" + Notifications.

- **Duplication:** connection state appears twice — `AccountContext.statusLabel`
  ("Actif"/"Connexion...") and `RiskRibbon`'s own dot. The brief's suspicion
  is confirmed; the code comment at `TradeClient.tsx:1300` explicitly
  acknowledges two different concerns sharing one visual language.
- **Server-authoritative:** balance, equity, `programEligibleBalance`, all of
  `AccountRisk` (DLL, maximum loss, target, consistency) — from
  `AccountSnapshot`.
- **Presentation-derived:** `riskRibbonStatus`, `connectionOk`, `isResyncing`,
  the `MARKET_STATUS_LABEL` mapping, and `accountId.slice(0,8).toUpperCase()`
  as a display id.
- **Update frequency:** snapshot-driven (not per-tick), and `memo`'d — the
  header is *not* the rerender problem.

### C. Workstation geometry — measured

| Viewport | Header | Watchlist | **Chart canvas** | Chart % of viewport height | Doc scroll height |
|---|---|---|---|---|---|
| 1366×768 | 214 | 320×466 | 604×**332** | **43 %** | 828 (**60 px below fold**) |
| 1440×900 | 214 | 320×538 | 678×**332** | 37 % | 900 |
| 1920×1080 | 214 | 320×718 | 1168×**332** | 31 % | 1080 |
| 2560×1440 | 214 | 320×1078 | 1798×**332** | **23 %** | 1440 |
| 390×844 | **304** | 390×395 | 310×**332** | — | 1348, **scrollWidth 425** |

**CONFIRMED — the 360 px fixed height is real and worse than described.**
`TradeChart.tsx:294` sets `height: 360` at `createChart`, and the resize
handler (`:319-322`) applies **`width` only**. The chart therefore gains
1 194 px of width between 1366 and 2560 and **exactly zero pixels of height**.
At 2560×1440 the watchlist column is 1 078 px tall next to a 332 px chart.

**New finding not in the brief:** at 390 px the trade route overflows the
document horizontally — `scrollWidth 425 > clientWidth 390`. The offender is
the **dock tab strip** (six `<button>`s, last one ending at x=425); the
`DataTable`s are correctly contained by their own `overflow-x-auto`
(`packages/ui/src/components/DataTable.tsx:11`), reaching x=490 without
extending the document. Same defect class as the Control shell overflow fixed
in Prompt 09 M6.

### D/E. Chart & timeframes

- Lightweight Charts **^4.2.2** (`apps/web/package.json:37`). Keep.
- Candle lifecycle: `bucketStart()` floors tick time into a bucket;
  `seriesRef.update(candle)` per tick; `candlesRef` is a `Map` in a ref.
- **Session-local — CONFIRMED explicitly.** `TradeChart.tsx:348-358` clears
  the buffer and calls `setData([])` on every symbol *or* timeframe change,
  and the doc block at `:171-177` states no tick history is persisted or
  fetched anywhere. `grep` across `schema.ts` and every migration finds no
  ticks/candles/OHLC table.
- Timeframes: **5s, 30s, 1m** only (`:108-112`) — a deliberate, documented
  consequence of DATA-003, not an oversight.
- Present: crosshair/zoom/pan (library defaults), bid/ask price lines,
  position lines, SL/TP lines, pending-order and alert lines, fill markers
  (restored from `AccountSnapshot.recentFills`), right-click context menu,
  mobile long-press, `role="group"` + `aria-label` on the container.
- Absent: indicators, drawings, vertical resize, history.

**No fake history will be proposed.** The required abstraction is a real
`MarketHistoryPort` — see §7.

### F/G. Indicators & drawings

Both **MISSING** — verified by absence of `addLineSeries`, `EMA`, `SMA`,
`indicator` or `drawing` anywhere in `TradeChart.tsx`.

Indicators are a pure function of the candle buffer, so they can live entirely
in the presentation layer without touching the engine — but EMA/SMA over a
5-second session buffer are close to meaningless. **Indicators should be
sequenced after history (W3), not before.**

For drawings, the renderer-independent boundary is the **existing HTML
overlay pattern**, not Lightweight Charts primitives: `ChartPositionOverlay`
and `ChartPendingOverlay` already position DOM elements via
`series.priceToCoordinate` + `timeScale().timeToCoordinate`, with collision
resolution in `chart-overlay-geometry.ts`. Reusing it keeps ARCH-028's
`ChartEngineAdapter` option open; committing to v4 primitives would close it.

### H. Market navigator

`WatchlistPanel.tsx:82` maps `TRADABLE_SYMBOLS` (5 symbols, from
`@wariba/contracts`). No search, no favorites, no categories, no
provider-driven catalogue. **All four suspicions CONFIRMED.**

MARKET-006 already locks "provider-driven, never a hardcoded list" as the
target. The five real symbols map onto the proposed IA as Forex
(EURUSD/GBPUSD/USDJPY), Metals (XAUUSD), Indices (NAS100) — **Energies would
have no instruments and must not be rendered as an empty promise.**

### I. Execution center

`OrderTicket` (21 props) and `Guardian` (8 props) are siblings, both fully
controlled by `TradeClient`. Ticket owns: symbol, spec, tick, order kind,
quantity, trigger price, SL, TP, submit, pending, disabled reason, rejection.
Guardian owns: quantity echo, estimated margin, DLL remaining, maximum-loss
remaining, concentration buckets, stale flag.

Merging them is a **presentation** change: both already consume
server-authoritative values and canonical domain helpers. The constraint for
W4 is that every estimate keeps its existing helper and its "estimate"
labelling — no new arithmetic in the browser.

### J. Trading dock

Current tabs (`TradeClient.tsx:1503-1510`): Positions · En attente · Ordres ·
Historique · Payout (Performance accounts only) · **Journal**.

`Journal` (`:1699`) renders one sentence: *"le journal de trading … arrive
dans un prompt ultérieur"* — a placeholder, exactly what the brief says must
not survive. Payout is a **program** surface sitting in an **execution** dock.
The dock is not collapsible, not resizable, and its tab strip overflows at
390 px.

### K. Trader navigation

`(trade)/layout.tsx` is 15 lines: a themed `<div>`. There is **no navigation
between Trade, Hub, Accounts, Payout, Risk or Settings** — and no outbound
link anywhere in `TradeClient`. A trader entering `/trade` can only leave via
browser back or a typed URL. **CONFIRMED.**

### L. Performance data

Existing and reusable: `buildAccountMissionView`,
`buildAccountPerformanceMissionView`, `buildAccountHubView`,
`buildRecentActivityView`, `buildAccountRiskView`, `AccountSnapshot`
(balance, equity, `programEligibleBalance`, `recentFills`), payout
eligibility read models, consistency and Best Day from the risk engine.

**Missing (would need new read models, not new calculations):** win rate,
average win/loss, profit factor, eligible vs short-duration-ineligible split
as a time series. `grep` confirms none exist in `domain` or `application`.
The inputs are all in `app.fills` (`realized_pnl`,
`ineligible_short_duration_profit`), so these are aggregation read models —
they must live server-side beside the existing ones, never in the browser.

### M. Personal risk guard

**MISSING entirely** — no `personal_risk`, `daily_loss_limit`, `max_trades` or
`cooldown` anywhere in the schema. This is net-new and must be
server-authoritative from day one: a browser-enforced limit is a suggestion.
It must be strictly *additive* to program rules — a personal limit can only
ever be tighter.

### N. Mobile

At 390 px: header grows to **304 px** (36 % of an 844 px viewport), the
watchlist becomes a full-width 395 px block *above* the chart, and the chart
starts at y=751 — **below the fold**. Document height 1 348 px for one screen
of trading. Plus the 425 px horizontal overflow above.

### O. Visual system

Tokens are healthy and stay. Relevant sizing tokens:
`--wariba-size-trade-watchlist-max: 320px`,
`--wariba-size-trade-order-ticket-max: 360px`,
`--wariba-component-trade-panel-padding: 12px`
(`packages/design-tokens/src/tokens.css:147,149,441`).

The problem is not the palette — it is that panels are separated by 12 px
padding and 1 px borders with no depth hierarchy, so nothing reads as a
workstation surface. Deltas in §10.

### P. Render ownership — the real rerender defect

The tick store is correct and well-isolated (`tick-store.ts`, per-symbol
`useSyncExternalStore`). **But `TradeClient.tsx:734` calls
`useTick(tickStore, selectedSymbol)` inside `TradeClient` itself.** Every tick
on the selected symbol therefore re-renders the entire 1 709-line component:
the dock tables, all six dialogs' JSX, the ticket and the chart wrapper.
`TradeHeaderPanel` and `WatchlistPanel` escape only because they are
individually `memo`'d.

So the answer to "one tick → entire terminal rerender" is: **partially, yes,
today.** Not because the store is wrong, but because the selected tick is
read at the top of the tree.

### Q. Security / execution safety

Nothing in the redesign scope touches server authority, idempotency,
revalidation, gating, ledger, lifecycle, snapshot ordering or fencing. §12
lists the tests that must prove it.

---

## 4. UX_GAP_MATRIX (current, 0–10)

| Dimension | Score | Basis |
|---|---|---|
| Information architecture | **3** | Payout in the execution dock; placeholder Journal; no navigation |
| Visual hierarchy | **4** | 214 px header before any price; uniform panel weight |
| Chart usability | **3** | 332 px fixed at every resolution; 3 short timeframes; no history |
| Execution UX | **5** | Complete and safe, but a form beside a separate risk card |
| Market navigation | **3** | 5 static rows, no search/favorites/categories |
| Account switching | **1** | Impossible from WariX; wrong program label |
| Trading dock | **4** | Right data, wrong membership, not collapsible, overflows at 390 |
| Performance visibility | **3** | Rich read models exist, none surfaced in the terminal |
| Risk settings | **0** | Feature does not exist |
| Mobile | **3** | Chart below the fold, 304 px header, 35 px horizontal overflow |
| Accessibility | **7** | Labelled controls, `aria-live`, `role=group`, keyboard chart menu; no focus management across a shell that does not exist yet |
| Runtime performance | **6** | Store design excellent; defeated by the top-level `useTick` |

---

## 5. PRESERVE_LIST — do not rewrite

`packages/domain/*` · `packages/database/*` · `packages/application/*` ·
`services/realtime/*` (leadership, fencing, tick-gate, alert monitor) ·
`services/worker/*` · `tick-store.ts` · `chart-overlay-geometry.ts` ·
`ChartPositionOverlay` / `ChartPendingOverlay` interaction semantics ·
`PartialCloseSheet` / `CloseAllDialog` / `ModifyPositionDialog` /
`ModifyPendingOrderDialog` / `QuickOrderConfirm` / `PendingOrderConfirm`
confirmation flows · every WS message contract in `@wariba/contracts` ·
Lightweight Charts 4.2.2 · all Prompt 09 Control surfaces.

---

## 6. REFACTOR_LIST — restructure, behaviour identical

| Component | Change |
|---|---|
| `TradeClient.tsx` | Split into `WorkstationShell` (layout) + `TradeSession` (transport/commands/state). Move `useTick(selectedSymbol)` **down** into the leaves that need it. |
| `TradeChart.tsx` | Container owns height; `resize` applies width **and** height; 26 props → grouped context. |
| `TradeHeaderPanel` | → compact horizontal status bar; `program` from `snapshot.programType`. |
| `WatchlistPanel` | → Market Navigator with search/favorites/categories. |
| `OrderTicket` + `Guardian` | → one Execution Center. |
| Dock | → collapsible/resizable; Payout out; Journal deleted. |
| `(trade)/layout.tsx` | → workstation shell with a 52–56 px icon rail. |
| `trade/page.tsx` | Accept `?account=`; validate ownership server-side; keep UX-NAV-001 hard navigation. |

---

## 7. NEW_COMPONENT_LIST

`WorkstationShell` (CSS grid + resizable panels) · `NavRail` ·
`WorkstationStatusBar` · `AccountSwitcher` (WariX) · `MarketNavigator`
(search/favorites/categories) · `ChartToolbar` · `ExecutionCenter` ·
`WorkstationDock` · `WorkspacePresetSwitcher` · `PerformancePanel` ·
`PersonalRiskPanel` · `IndicatorOverlay` · `DrawingOverlay` +
`useWorkspaceLayout` persistence hook.

---

## 8. DATA_GAPS

| Gap | Impact | Required |
|---|---|---|
| **Market history** | Blocks real timeframes, indicators, drawings | New `MarketHistoryPort` in `@wariba/adapters` + OHLC persistence + a hydrate-then-continue contract in `TradeChart`. **No fabricated candles.** |
| **Indicator prerequisites** | EMA/SMA meaningless on a 5 s buffer | Depends entirely on history |
| **Trade statistics** | No win rate / profit factor / avg win-loss | New server read models over `app.fills` |
| **Personal risk persistence** | Feature cannot exist | New table + server enforcement, additive to program rules only |
| **Instrument catalogue** | Categories/Energies would be empty | Provider-driven catalogue (MARKET-006) |

---

## 9. TARGET_DESKTOP_WIREFRAME

```
┌────────────────────────────────────────────────────────────────────┐
│ RAIL │ STATUS BAR — account ▼ · equity · DLL · max loss · target …  │ 48px
├──────┼──────────────┬────────────────────────────┬─────────────────┤
│ 56px │ NAVIGATOR    │ CHART TOOLBAR        40px  │ EXECUTION       │
│      │ 260–320px    ├────────────────────────────┤ 320–360px       │
│      │ resizable    │ CHART — 1fr, owns all      │ resizable       │
│      │              │ remaining vertical space   │                 │
├──────┴──────────────┴────────────────────────────┴─────────────────┤
│ DOCK — Positions │ Orders │ Trades │ Alerts │ Account        ▲/▼   │
└────────────────────────────────────────────────────────────────────┘
```

```css
.workstation {
  display: grid;
  height: 100dvh;
  grid-template-columns: 56px var(--nav-w, 280px) minmax(0, 1fr) var(--exec-w, 340px);
  grid-template-rows: 48px minmax(0, 1fr) var(--dock-h, 220px);
}
```

`minmax(0, 1fr)` on both the chart column and the middle row is the whole
fix: it lets the chart shrink *and* grow instead of being pinned. The chart
must be sized by a `ResizeObserver` applying **width and height**, with no
height literal anywhere.

Breakpoints: **≥1920** nav 320 / exec 360 / dock 260 · **1440–1919** nav 280 /
exec 340 / dock 220 · **1280–1439** nav 240 / exec 320 / dock 200 ·
**1024–1279** navigator collapses to icons · **<1024** mobile layout.

At 1440×900 this yields a chart of ~800×592 — **1.78× the current 332 px**.

## 9b. TARGET_MOBILE_WIREFRAME (320–430)

Status bar 44 px (account + equity + DLL, tap to expand) → chart fills
remaining space → sticky action bar (Buy / Sell / Positions·n) → navigator as
a left drawer, execution as a bottom sheet (both already-certified patterns),
dock as a second sheet. Chart above the fold at every width; **document must
never scroll horizontally** — the dock tab strip needs `overflow-x-auto`.

---

## 10. VISUAL_SYSTEM_DELTA

Keep Ink / Cobalt / Copper / Bone and all semantic colours. Add, do not
replace:

- `--wariba-workstation-rail-width: 56px`
- `--wariba-workstation-statusbar-height: 48px`
- `--wariba-workstation-toolbar-height: 40px`
- `--wariba-workstation-nav-width: 280px` (+ `-compact: 240px`, `-wide: 320px`)
- `--wariba-workstation-exec-width: 340px` (+ compact/wide)
- `--wariba-workstation-dock-height: 220px` (+ `-collapsed: 40px`)
- `--wariba-workstation-panel-gap: 1px` (hairline seams instead of 12 px padding)
- `--wariba-surface-raised` / `--wariba-surface-sunken` for panel depth
- `--wariba-font-size-data-xs` for dense tabular rows

Density: panel padding 12 → 8 px inside panels; radius 0 on panel seams,
retained on controls; numerics stay `wariba-data` tabular. Buy/Sell get the
only high-saturation treatment on the screen.

---

## 11. WORKSTREAM PLAN

| Milestone | Scope | Exit |
|---|---|---|
| **W1** Shell & seam | Split `TradeClient`; grid shell; nav rail; status bar; account switcher (UX-NAV-001); chart owns its height; push `useTick` down | Geometry re-measured; zero behaviour change; full certification |
| **W2** Navigator & dock | Market Navigator (search/favorites/categories); dock collapsible/resizable/keyboard; Payout relocated; Journal deleted; 390 px overflow fixed | Mobile overflow test green |
| **W3** Market history | `MarketHistoryPort` + OHLC persistence + hydrate-then-continue; real timeframes | No fabricated candles; live continuation proven |
| **W4** Execution Center | Merge ticket + Guardian; presets; keyboard | No new browser arithmetic |
| **W5** Indicators & drawings | EMA/SMA; minimal drawing set on the existing overlay boundary | Renderer-independent |
| **W6** Performance Intelligence | New server read models; Performance surface | No duplicated financial math |
| **W7** Personal Risk Guard | Schema + server enforcement + UI | Provably cannot loosen program rules |

W3 gates W5. W1 gates everything.

---

## 12. RISK_REGISTER

| # | Risk | Protection |
|---|---|---|
| 1 | Splitting `TradeClient` breaks command/idempotency wiring | Full `test:e2e:trade` + payout + realtime functional before merge |
| 2 | Chart height change breaks overlay coordinates | Overlay geometry unit tests + drag/commit E2E at 3 viewports |
| 3 | Shell rerenders on every tick | Render-count assertion: N ticks ⇒ status bar and dock render 0 extra times |
| 4 | Account switcher regresses UX-NAV-001 | Reuse the certified hard-navigation anchor; E2E asserts URL + reloaded context |
| 5 | Account switcher becomes an IDOR | Server-side ownership check on `?account=`; E2E with a foreign id |
| 6 | Presets desync from actual layout | Preset state derives from one source; snapshot tests per preset |
| 7 | History hydration fabricates data | Contract test: empty provider ⇒ empty chart, never synthetic candles |
| 8 | Personal risk misread as loosening program rules | Property test: effective limit = min(program, personal), always |
| 9 | Mobile regression | Keep the document-overflow test; extend to `/trade` |
| 10 | Dock/rail break keyboard access | Axe + explicit focus-order tests |

---

## 13. SCREENSHOT_BASELINE

`apps/web/tests/e2e/warix-w0-baseline.spec.ts` (tagged `@warix-baseline`, not
in any gate). Captured to `test-results/warix-w0-baseline/`:
`warix-current-1366x768.png`, `-1440x900`, `-1920x1080`, `-2560x1440`,
`-390x844`, alongside the measurements in §3C.

---

## 14. W0 FLAGS

```
W0_CURRENT_STATE_AUDITED        = true
W0_DESKTOP_ARCHITECTURE_DEFINED = true
W0_MOBILE_ARCHITECTURE_DEFINED  = true
W0_DATA_GAPS_IDENTIFIED         = true
W0_PRESERVE_BOUNDARIES_DEFINED  = true

W0_ACCEPTED = true    (architecture review passed — see §0)
```

W1 is delivered in `WARIX_Workstation_2026_W1_Shell.md`.
