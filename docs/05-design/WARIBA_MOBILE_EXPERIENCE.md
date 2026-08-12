# WARIBA Mobile Experience 2026

Status: WX0 architecture; mobile-native transformation of the accepted single-tree WariX design.

## 1. Mobile promise

The first screen answers: account safe, market current, chart readable, Trade and Activity reachable. It does not reproduce desktop side panels.

Locked structure:

1. account instrumentation;
2. symbol/live quote;
3. interval/tools;
4. full-width plot;
5. Trade / Activity bottom actions.

Target pre-plot chrome is ≤116 px versus 174 px measured in W5.

## 2. Account and market chrome

The 40 px account bar shows program/account shorthand, equity, risk entry, connection and notifications. DLL/MLL details remain in the risk sheet. The 32 px market row shows symbol, bid/ask and text market status; tapping opens the existing Market Navigator sheet.

Do not repeat `MARCHÉ EURUSD Ouvert` as a separate row. OHLC is a compact on-chart legend that can collapse to current/change; indicator values use a second line only when active.

## 3. Interval behavior

After WX2 makes the family real, direct access is `1m · 3m · 5m · 15m · 1h`; More contains `30m · 4h · 1D · 1W · 1M`. A More-selected interval replaces the `1h` label in the direct row for the session so the current value remains visible.

Before WX2, WX1 may apply the same component grammar only to current intervals. It must not render disabled future intervals or silently synthesize bars.

Each practical target is ≥44 px; dense visual hit areas may overlap allocated row cells but never each other. The active state uses surface + edge + `aria-checked`.

## 4. Tools palette

The Tools sheet has three groups:

- **Indicators**: toggle rows with line-color preview and active count;
- **Drawings**: 2-column icon + label grid for Select, Horizontal, Trend, Ray, Rectangle, Fibonacci;
- **View**: Fit and Reset, only where behavior exists.

Selecting a drawing closes the sheet and displays a compact active-tool chip with Cancel. Toggling indicators keeps the sheet open. No duplicate hidden tool tree remains mounted.

## 5. Drawing interaction

- Anchors remain pointer/touch placed; WX1 does not claim keyboard placement.
- Selected handles are ≥24 px visual with ≥44 px invisible touch region that does not intercept trading overlays.
- Context actions sit in a bottom-safe compact bar or just above bottom actions: Style, Delete, Done.
- Drawing context never includes Buy/Sell or any financial command.
- Trading overlay priority remains above drawings.

## 6. Execution sheet

Execution remains the only mounted execution tree below 1024 px. Target sheet:

- height 78–82dvh with safe-area inset;
- sticky module title and quote deck;
- scrollable type/quantity/protection/impact body;
- sticky bilateral Sell/Buy footer;
- rejection/warning remains next to the affected action or field;
- closing preserves draft through existing external draft store;
- Escape/backdrop close returns focus to `Trade {symbol}`.

No swipe dismissal is allowed while a pointer is editing a numeric field unless the gesture begins on the handle region.

## 7. Activity sheet

Tabs remain Positions, Orders, Trades, Alerts, Account. Mobile does not render desktop tables shrunk to fit. It uses `MobileStructuredRow`:

- primary line: symbol/type/status;
- secondary line: quantity and time;
- trailing authoritative value/action;
- expandable detail for SL/TP, fill eligibility or server code.

The active panel alone is mounted. Empty panels use one compact sentence and retain tab context.

## 8. Market sheet

Reuse the same market state/controller. Presentation uses 44 px rows, full symbol, bid/ask, spread, status and favorite. Search remains direct. No percentage, volume, sparkline or unsupported symbol.

## 9. Accessibility

- every action ≥44 px;
- sheet is a named dialog with focus containment and return;
- Escape/back navigation closes the topmost sheet;
- icon controls have names; selected state is not color-only;
- no hidden duplicate DOM tree;
- reduced motion removes spatial transitions;
- status and rejection changes use appropriate live-region behavior without announcing every tick;
- chart drawing placement remains explicitly pointer/touch-only.

## 10. Performance

Closed sheets are unmounted. Chart tools, execution and activity subscribe only while visible. The account bar remains tick-independent. Quote-direction feedback stays inside the selected-symbol consumer and never lifts tick state into the mobile shell.

## 11. Evidence matrix

WX1 must capture 320×844, 360×800, 375×812, 390×844, 412×915 and 430×932 in chart-first, Tools, selected drawing, execution Market/Limit/rejection, Activity empty/populated, stale/reconnecting and reduced-motion states.
