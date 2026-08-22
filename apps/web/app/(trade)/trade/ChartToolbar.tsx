'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ToolbarButton,
  WariXAlertClockIcon,
  WariXAreaChartIcon,
  WariXBarsIcon,
  WariXCameraIcon,
  WariXCandlesIcon,
  WariXChevronDownIcon,
  WariXFitContentIcon,
  WariXFullscreenExitIcon,
  WariXFullscreenIcon,
  WariXLineChartIcon,
  WariXMoreIcon,
  WariXPreferencesIcon,
  WariXRedoIcon,
  WariXRulerIcon,
  WariXSearchIcon,
  WariXStudiesIcon,
  WariXUndoIcon,
} from '@wariba/ui';
import { CANDLE_TIMEFRAMES, type CandleTimeframe } from '@wariba/contracts';
import { useViewportSize } from './use-viewport';

/**
 * The chart toolbar — W5 §14/§38/§61-§63/§86-§89, rebuilt for reopen §20.
 *
 * WX1's strip was an interval track, one indicator popover and a fit button.
 * Against the reference that is not a charting toolbar's *grammar*: a trader
 * scanning the top of a chart expects intervals, then studies, then
 * preferences, then history, and a utility cluster pushed to the far right for
 * fit, snapshot and fullscreen. The order is muscle memory, so it is the order
 * used here.
 *
 * **What is deliberately absent.** §20 names POS Bracket, Add Chart Link and the
 * tick selector as things not to add, and they are not here — they are broker
 * features of another product, and a WariX button that opened nothing would be
 * the exact "many controls" failure §42 warns about. Symbol search is absent for
 * a different reason: WariX has a permanent Market Navigator pane two columns to
 * the left, so a search box in the toolbar would be a second door to a room the
 * trader is already standing in. On a phone, where the Navigator is *not*
 * permanent, the search key is present — see TradeChart's compact row.
 *
 * **Accessibility.** The interval control is a real radiogroup with roving tab
 * focus and arrow-key navigation (§86); every key carries a text name (§88). No
 * control depends on colour alone to say which one is active.
 */

interface TimeframeSelectorProps {
  timeframe: CandleTimeframe;
  onSelect(timeframe: CandleTimeframe): void;
  /** How many interval keys the row can carry here; the rest move behind `⋯`. */
  slots: number;
}

/**
 * Final closure §5 — how many interval keys a phone row can carry.
 *
 * Measured on the rendered strip rather than estimated. The row also carries the
 * instrument, its market state, the chart-type key, `ƒx` and the tools key —
 * 230px of it at 390 — which leaves ~144px for the interval track. A key plus
 * its gap costs 30, and the overflow key costs 28, so three keys and the
 * disclosure fit with room to spare and four do not fit at readable type.
 *
 * That is why 390 carries three rather than the four a first sketch assumed: the
 * alternative was 26px keys with 9px labels, and §5 rules out buying a key by
 * shrinking type past reading. At 320 the same arithmetic leaves room for two.
 *
 * Desktop is never constrained — it has the width for the complete professional
 * family. Compact layouts always retain an overflow key: adding the WX2
 * intervals must not widen the accepted mobile shell.
 */
export function timeframeSlotsForWidth(width: number, compact: boolean): number {
  if (!compact) return CANDLE_TIMEFRAMES.length;
  if (width >= 430) return 4;
  if (width >= 360) return 3;
  return 2;
}

/**
 * Which intervals stay on the row, given the number of slots.
 *
 * The head of the canonical order, with one rule on top: **the active interval
 * is always one of them**. A trader who picked 1M at 430 and then rotated to a
 * narrower window must still see which interval the chart is drawing — an
 * active key hidden behind `⋯` would leave the row reading as though 1m were
 * selected. When that happens the active key takes the last visible slot, so
 * the order the trader learned is otherwise preserved.
 */
export function visibleTimeframes(
  slots: number,
  active: CandleTimeframe,
): readonly CandleTimeframe[] {
  const bounded = Math.max(1, Math.min(slots, CANDLE_TIMEFRAMES.length));
  if (bounded === CANDLE_TIMEFRAMES.length) return CANDLE_TIMEFRAMES;
  const head = CANDLE_TIMEFRAMES.slice(0, bounded);
  if (head.includes(active)) return head;
  return [...CANDLE_TIMEFRAMES.slice(0, bounded - 1), active];
}

/**
 * §86 — a radiogroup, not an undifferentiated row of buttons.
 *
 * Roving tabindex: one stop in the tab order, arrows move within the group. That
 * is the WAI-ARIA radio pattern, and it is what lets a keyboard trader change
 * interval without tabbing past every control they did not want.
 *
 * WX2 exposes the complete canonical professional interval family. Compact
 * layouts keep the active interval visible and move the remaining choices into
 * the existing overflow disclosure.
 */
const TimeframeSelector = memo(function TimeframeSelector({
  timeframe,
  onSelect,
  slots,
}: TimeframeSelectorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const visible = visibleTimeframes(slots, timeframe);
  const hidden = CANDLE_TIMEFRAMES.filter((option) => !visible.includes(option));

  useEffect(() => {
    if (!overflowOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!overflowRef.current?.contains(event.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [overflowOpen]);

  // Roving focus moves through the keys that are actually on the row — the
  // overflowed intervals are reached through their own menu, not by arrowing
  // into a control that is not rendered.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = visible.indexOf(timeframe);
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = visible.length - 1;
    if (next === null) return;
    event.preventDefault();
    const bounded = (next + visible.length) % visible.length;
    const target = visible[bounded];
    if (target === undefined) return;
    onSelect(target);
    containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[bounded]?.focus();
  };

  /*
   * VX1 §31 — the selection *travels*.
   *
   * WX1 repainted two keys on every change: the old one went quiet, the new one
   * lit up, and nothing connected the two. A trader's eye had to find the new
   * state instead of following it. One absolutely-positioned pill now slides
   * between the keys in 140ms — the same object moving, which is what the
   * interaction actually is.
   *
   * It is measured, not computed from an assumed key width: the keys are
   * `min-w` with text-dependent widths, and hard-coding a step would drift the
   * moment an interval label got a character longer. `offsetLeft`/`offsetWidth`
   * are read from the button that is actually selected, in a layout effect so
   * the pill is in place on the first painted frame.
   */
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  // `visible` is rebuilt every render, so the effect keys off its *contents*
  // rather than its identity — and the state write is guarded on the measured
  // numbers, because setting an equal-but-new object would re-run this forever.
  const visibleKey = visible.join(',');
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const index = visible.indexOf(timeframe);
    const keys = container.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    const key = index >= 0 ? keys[index] : undefined;
    setIndicator((current) => {
      if (!key) return current === null ? current : null;
      const next = { left: key.offsetLeft, width: key.offsetWidth };
      if (current && current.left === next.left && current.width === next.width) return current;
      return next;
    });
  }, [timeframe, visibleKey]);

  return (
    <div className="flex h-8 min-w-0 shrink-0 items-center gap-0.5 rounded-[var(--wariba-component-workstation-radius-control)] bg-[color:var(--wariba-component-workstation-surface-canvas)] p-0.5 shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.6)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-hairline)]">
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Intervalle du graphique"
        data-testid="chart-timeframe-group"
        onKeyDown={onKeyDown}
        className="relative flex min-w-0 shrink-0 items-center gap-0.5"
      >
        {indicator ? (
          <span
            aria-hidden="true"
            data-testid="chart-timeframe-indicator"
            className="pointer-events-none absolute inset-y-0 rounded-[5px] bg-[color:var(--wariba-component-workstation-surface-control)] shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong),var(--wariba-component-workstation-elevation-key)] transition-[left,width] duration-[var(--wariba-component-workstation-motion-quick)] ease-[var(--wariba-component-workstation-ease-move)] motion-reduce:transition-none"
            style={{ left: indicator.left, width: indicator.width }}
          >
            <span className="absolute inset-x-2 top-0 h-0.5 rounded-b-full bg-[color:var(--wariba-component-workstation-interaction-selected)] shadow-[0_0_8px_0_rgba(102,132,255,0.55)]" />
          </span>
        ) : null}
        {visible.map((option) => {
          const selected = option === timeframe;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(option)}
              className={`wariba-data relative z-10 h-7 min-w-6 shrink-0 rounded-[5px] px-0.5 text-[10px] font-semibold tabular-nums transition-colors duration-[var(--wariba-component-workstation-motion-quick)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] lg:min-w-9 lg:px-1 lg:text-[length:var(--wariba-component-workstation-type-label)] ${
                selected
                  ? 'text-[color:var(--wariba-component-workstation-text-primary)]'
                  : 'text-[color:var(--wariba-component-workstation-text-tertiary)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* §5 — the overflow is a stated destination, not a clipped edge. It only
          exists when an interval is actually behind it, so a desktop row never
          grows a control that leads nowhere. */}
      {hidden.length > 0 ? (
        <div ref={overflowRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            aria-label={`Autres intervalles : ${hidden.join(', ')}`}
            data-testid="chart-timeframe-overflow"
            onClick={() => setOverflowOpen((open) => !open)}
            className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-[5px] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
              overflowOpen
                ? 'bg-[color:var(--wariba-component-workstation-surface-control)] text-[color:var(--wariba-component-workstation-text-primary)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
            }`}
          >
            <WariXMoreIcon className="h-4 w-4" />
          </button>
          {overflowOpen ? (
            <div
              role="menu"
              aria-label="Autres intervalles"
              data-testid="chart-timeframe-overflow-menu"
              className="absolute left-1/2 top-[calc(100%+6px)] z-[var(--wariba-z-dropdown)] w-24 -translate-x-1/2 overflow-hidden rounded-[var(--wariba-component-workstation-radius-panel)] border border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] p-1 shadow-[var(--wariba-component-workstation-elevation-popover),inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)] motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-quick)_var(--wariba-component-workstation-ease-enter)]"
            >
              {hidden.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={option === timeframe}
                  data-testid={`chart-timeframe-overflow-${option}`}
                  onClick={() => {
                    onSelect(option);
                    setOverflowOpen(false);
                  }}
                  className="wariba-data flex h-11 w-full items-center rounded-[6px] px-2.5 text-left text-[length:var(--wariba-component-workstation-type-data)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)] transition-colors hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

/** §32 — a hairline seam between clusters, not a border on every control. */
function Seam() {
  return (
    <span
      aria-hidden="true"
      className="h-5 w-px shrink-0 bg-[color:var(--wariba-component-workstation-seam-hairline)]"
    />
  );
}

export interface ChartToolbarProps {
  symbol: string;
  marketStatus: 'open' | 'closed' | 'stale' | null;
  onOpenMarkets(): void;
  timeframe: CandleTimeframe;
  onSelectTimeframe(timeframe: CandleTimeframe): void;
  chartStyle: ChartStyle;
  onSelectChartStyle(style: ChartStyle): void;
  /** Opens the Indicators library — a modal on desktop, a sheet on a phone (§13/§28). */
  onOpenIndicators(): void;
  indicatorsActive: boolean;
  onOpenSettings(): void;
  onOpenAlerts(): void;
  onOpenTools?(): void;
  drawingToolActive?: boolean;
  onResetView(): void;
  onSnapshot(): void;
  onToggleFullscreen(): void;
  fullscreen: boolean;
  onUndo(): void;
  onRedo(): void;
  canUndo: boolean;
  canRedo: boolean;
  /** Mobile presentations hide everything but the interval track and use a sheet (§66). */
  compact?: boolean;
}

export type ChartStyle = 'candles' | 'bars' | 'line' | 'area';

/*
 * VX1-C.1 §1/§2 — the instrument row says the instrument, and stops.
 *
 * WX1 closed with `EURUSD ● OUVERT` here, and it was right at the time: the
 * market's state had no other home on the strip. It has three now — the chart's
 * own identity line carries the instrument's dot, the header carries the feed's
 * signal, and the Execution Center speaks up when a quote is not tradable. Four
 * green marks for one healthy condition is not reassurance, it is noise, so this
 * row gives its width back to the chart.
 *
 * `marketStatus` stays on the props: it is still in the accessible name, which
 * is where a screen-reader user gets the state this row no longer draws.
 */

/**
 * The state's name, for assistive technology only.
 *
 * Nothing draws these — the row is silent about a healthy market — but the
 * accessible name still carries the condition, because a screen-reader user
 * cannot see the chart legend's dot that replaced it.
 */
const MARKET_STATUS_NAME: Record<'open' | 'closed' | 'stale', string> = {
  open: 'Marché ouvert',
  closed: 'Marché fermé',
  stale: 'Prix retardé',
};

interface ChartStyleEntry {
  id: ChartStyle;
  label: string;
  icon: React.ReactNode;
}

/** Named separately so the fallback below is a value, not an indexed lookup. */
const CANDLE_STYLE: ChartStyleEntry = {
  id: 'candles',
  label: 'Bougies',
  icon: <WariXCandlesIcon />,
};

const CHART_STYLES: readonly ChartStyleEntry[] = [
  CANDLE_STYLE,
  { id: 'bars', label: 'Barres', icon: <WariXBarsIcon /> },
  { id: 'line', label: 'Ligne', icon: <WariXLineChartIcon /> },
  { id: 'area', label: 'Aire', icon: <WariXAreaChartIcon /> },
];

export const ChartToolbar = memo(function ChartToolbar({
  symbol,
  marketStatus,
  onOpenMarkets,
  timeframe,
  onSelectTimeframe,
  chartStyle,
  onSelectChartStyle,
  onOpenIndicators,
  indicatorsActive,
  onOpenSettings,
  onOpenAlerts,
  onOpenTools,
  drawingToolActive = false,
  onResetView,
  onSnapshot,
  onToggleFullscreen,
  fullscreen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  compact = false,
}: ChartToolbarProps) {
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const activeStyle = CHART_STYLES.find((style) => style.id === chartStyle) ?? CANDLE_STYLE;
  const viewport = useViewportSize();
  const timeframeSlots = timeframeSlotsForWidth(viewport.width, compact);

  useEffect(() => {
    if (!styleMenuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!styleMenuRef.current?.contains(event.target as Node)) setStyleMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [styleMenuOpen]);

  return (
    <div
      data-testid="chart-toolbar"
      /* `shrink`, not `shrink-0`. At 320 the five 44px interval keys plus the
         two toolbar keys beside them measure 2px more than the viewport, so the
         last key clipped at the screen edge. The interval track already owns a
         horizontal overflow; letting the toolbar shrink is what hands the track
         that job instead of pushing the row past the edge. No key drops below
         its 44px touch target — the track scrolls. */
      className="flex h-11 w-full min-w-0 shrink items-center justify-between gap-1 lg:h-10 lg:shrink-0 lg:gap-2"
    >
      {/* §5 — below 360 the row buys its room from spacing before it buys it
          from a control or from type size. */}
      <div className="flex min-w-0 items-center gap-0.5 min-[360px]:gap-1 lg:gap-2">
        {/*
         * §4 — instrument, market state, and the search that changes it, as one
         * control.
         *
         * The magnifier stays on a phone too: without it the chip reads as a
         * label rather than as the way to change instrument, and on a phone
         * there is no Market Navigator column to fall back on. It sits *after*
         * the ticker in the compact row and before it on desktop — the desktop
         * strip reads left-to-right from the action, the phone row leads with
         * the fact — which is one element reordered by flexbox, not two.
         *
         * It opens the same canonical surface it always did (`onOpenMarkets` →
         * the Markets sheet on a phone, the symbol search modal on desktop).
         * There is no second search here.
         */}
        <button
          type="button"
          aria-label={`Rechercher un instrument. Instrument actif : ${symbol}${
            marketStatus === null ? '' : `. ${MARKET_STATUS_NAME[marketStatus]}`
          }`}
          data-testid="chart-symbol-search-trigger"
          onClick={onOpenMarkets}
          className="flex h-8 shrink-0 items-center gap-0.5 rounded-[var(--wariba-component-workstation-radius-control)] px-0.5 text-[color:var(--wariba-component-workstation-text-primary)] transition-[background-color,box-shadow] duration-[var(--wariba-component-workstation-motion-quick)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] min-[360px]:gap-1 min-[360px]:px-1 lg:gap-1.5 lg:px-2"
        >
          {/* One step down below 360 — still the row's largest word, and still
              read at a glance, which is the trade §5 asks for before anything
              leaves the strip. */}
          <span className="wariba-data truncate text-[11px] font-semibold min-[360px]:text-[length:var(--wariba-component-workstation-type-data)]">
            {symbol}
          </span>
          <WariXSearchIcon
            size="toolbar"
            className="h-4 w-4 text-[color:var(--wariba-component-workstation-text-tertiary)] lg:order-first lg:text-[color:inherit]"
          />
        </button>
        {/* The seams separate three clusters on a desktop strip that has width
            to spend on rhythm. On a phone the interval track's own ring already
            does that work, and the pair costs 10px the row does not have. */}
        {!compact ? <Seam /> : null}
        <TimeframeSelector
          timeframe={timeframe}
          onSelect={onSelectTimeframe}
          slots={timeframeSlots}
        />
        {!compact ? <Seam /> : null}
        <div ref={styleMenuRef} className="relative shrink-0">
          <ToolbarButton
            label={`Type de graphique : ${activeStyle.label}`}
            icon={
              <span className="flex items-center gap-0.5">
                {activeStyle.icon}
                {/* The chevron is what tells a trader this key opens a *choice*
                    of chart types rather than toggling one. It survives on a
                    phone — §18 asks for chart type to be immediately
                    discoverable — and gives up only below 360, where the row's
                    remaining 4px belong to the intervals. */}
                <WariXChevronDownIcon className="hidden h-3 w-3 min-[360px]:block" />
              </span>
            }
            showLabel
            labelClassName="hidden"
            active={styleMenuOpen}
            aria-haspopup="menu"
            aria-expanded={styleMenuOpen}
            data-testid="chart-type-trigger"
            onClick={() => setStyleMenuOpen((open) => !open)}
            className="h-8 min-w-8 px-1.5 lg:px-2"
          />
          {styleMenuOpen ? (
            <div
              role="menu"
              aria-label="Type de graphique"
              data-testid="chart-type-menu"
              className="absolute right-0 top-[calc(100%+5px)] z-[var(--wariba-z-dropdown)] w-48 overflow-hidden rounded-[var(--wariba-component-workstation-radius-panel)] border border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] p-1 shadow-[var(--wariba-component-workstation-elevation-popover),inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)] motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-quick)_var(--wariba-component-workstation-ease-enter)] sm:left-0 sm:right-auto"
            >
              {CHART_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={style.id === chartStyle}
                  data-testid={`chart-type-${style.id}`}
                  onClick={() => {
                    onSelectChartStyle(style.id);
                    setStyleMenuOpen(false);
                  }}
                  className={`flex h-9 w-full items-center gap-3 rounded-[var(--wariba-component-workstation-radius-micro)] px-2 text-left text-[length:var(--wariba-component-workstation-type-data)] transition-colors duration-[var(--wariba-component-workstation-motion-quick)] ${
                    style.id === chartStyle
                      ? 'bg-[color:var(--wariba-component-workstation-wash-selected)] text-[color:var(--wariba-component-workstation-interaction-selected-text)]'
                      : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
                  }`}
                >
                  {style.icon}
                  <span>{style.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <ToolbarButton
          label="Indicateurs"
          icon={<WariXStudiesIcon />}
          showLabel
          labelClassName="hidden xl:inline"
          active={indicatorsActive}
          aria-haspopup="dialog"
          data-testid="chart-indicators-trigger"
          onClick={onOpenIndicators}
          className="h-8 min-w-8 px-1.5 lg:px-2"
        />
        {compact && onOpenTools ? (
          <ToolbarButton
            label="Outils"
            icon={<WariXRulerIcon />}
            active={drawingToolActive}
            data-testid="chart-tools-sheet-trigger"
            onClick={onOpenTools}
            className="h-8 min-w-8 px-1.5"
          />
        ) : null}
        {!compact ? (
          <ToolbarButton
            label="Préférences"
            icon={<WariXPreferencesIcon />}
            showLabel
            labelClassName="hidden 2xl:inline"
            aria-haspopup="dialog"
            data-testid="chart-settings-trigger"
            onClick={onOpenSettings}
            className="h-8 min-w-8 px-1.5 lg:px-2"
          />
        ) : null}
      </div>

      {!compact && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Seam />
          <ToolbarButton
            label="Alerte"
            icon={<WariXAlertClockIcon />}
            showLabel
            labelClassName="hidden xl:inline"
            data-testid="chart-alerts-trigger"
            onClick={onOpenAlerts}
          />
          <Seam />
          <div className="flex shrink-0 items-center gap-0.5">
            <ToolbarButton
              label="Annuler"
              icon={<WariXUndoIcon />}
              disabled={!canUndo}
              data-testid="chart-undo"
              onClick={onUndo}
            />
            <ToolbarButton
              label="Rétablir"
              icon={<WariXRedoIcon />}
              disabled={!canRedo}
              data-testid="chart-redo"
              onClick={onRedo}
            />
          </div>
          <Seam />
          <div className="flex shrink-0 items-center gap-0.5">
            {/* §63/§17 — fit only. It touches the time scale and nothing else: no
                drawing is deleted, no indicator is reset, no timeframe changes and
                no command is sent. */}
            <ToolbarButton
              label="Ajuster la vue"
              icon={<WariXFitContentIcon />}
              data-testid="chart-reset-view"
              onClick={onResetView}
            />
            <ToolbarButton
              label="Capture du graphique"
              icon={<WariXCameraIcon />}
              data-testid="chart-snapshot"
              onClick={onSnapshot}
            />
            <ToolbarButton
              label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              icon={fullscreen ? <WariXFullscreenExitIcon /> : <WariXFullscreenIcon />}
              active={fullscreen}
              data-testid="chart-fullscreen"
              onClick={onToggleFullscreen}
            />
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Whether the document is currently showing an element fullscreen.
 *
 * Read from the platform rather than mirrored into state on toggle: a trader who
 * presses Escape leaves fullscreen without going through our button, and a
 * mirrored boolean would then show the wrong icon until the next click.
 */
export function useFullscreen(target: React.RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(() => {
    const node = target.current;
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen().catch(() => {
        // Denied or already exiting — the change event stays authoritative.
      });
      return;
    }
    void node?.requestFullscreen?.().catch(() => {
      // Some browsers refuse without a user gesture chain; nothing to recover.
    });
  }, [target]);

  return { fullscreen, toggle };
}
