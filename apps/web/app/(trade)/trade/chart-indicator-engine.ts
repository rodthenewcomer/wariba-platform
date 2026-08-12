'use client';

import { timeframeSeconds, type CandleTimeframe, type MarketCandle } from '@wariba/contracts';
import {
  calculateIndicator,
  commitIndicatorClose,
  createIndicatorLiveState,
  nextIndicatorValue,
  type IndicatorLiveState,
  type IndicatorPoint,
} from './chart-indicator-math';
import { indicatorLabel, type ChartIndicator } from './chart-indicator-model';

/**
 * The indicator engine — W5 §34/§35/§74/§122/§123.
 *
 * Imperative and React-free for the same reason `chart-history.ts` is: an
 * accepted tick must move a line on a canvas without re-rendering the
 * workstation shell, the nav rail, the status bar, the account switcher, the
 * dock or the Market Navigator (W1/W2 render ownership, W5 §72). Nothing here
 * calls `setState`, and nothing subscribes to it through React.
 *
 * **The two paths, kept strictly apart.** A full recalculation runs on
 * hydration, symbol change, timeframe change, an older-history prepend and a
 * settings change — five events, each of which genuinely changes the input
 * series. A market tick runs the incremental path instead: one `nextIndicatorValue`
 * per enabled indicator, O(1), one renderer `update`. Recomputing 400 points ×
 * 4 indicators per tick is the trap this split exists to avoid (§35).
 *
 * **Series ownership** (§123). One line series per *enabled* indicator, created
 * when it is switched on and destroyed when it is switched off or the chart
 * unmounts. Never created during a React render; the engine is the only thing
 * that ever calls `create`/`remove`, and it holds the ids so a disabled
 * indicator's series cannot be leaked (§122).
 */

/** The renderer boundary. Implemented against lightweight-charts in TradeChart. */
export interface IndicatorSeriesRenderer {
  create(indicator: ChartIndicator): void;
  remove(id: string): void;
  setData(id: string, points: readonly IndicatorPoint[]): void;
  update(id: string, point: IndicatorPoint): void;
}

/** What the chart's compact legend shows — a name and a value, never a bare colour (§39/§128). */
export interface IndicatorLegendEntry {
  id: string;
  label: string;
  color: string;
  /** `null` while the indicator is still warming up or the line is broken by a gap. */
  value: number | null;
}

/** The candle series as the history controller holds it (`ChartHistoryController.series()`). */
export interface IndicatorCandleSource {
  (): { finalized: readonly MarketCandle[]; current: MarketCandle | null };
}

export interface ChartIndicatorEngine {
  /** Enabled set, periods, styles or timeframe changed — recalculates everything. */
  configure(indicators: readonly ChartIndicator[], timeframe: CandleTimeframe): void;
  /** The candle series was replaced or prepended to — recalculates everything (§34). */
  rebuild(): void;
  /** One accepted tick moved the current candle — incremental only (§35). */
  onLiveUpdate(): void;
  legend(): IndicatorLegendEntry[];
  /** Test/inspection seam: the points currently handed to the renderer. */
  points(id: string): readonly IndicatorPoint[];
  dispose(): void;
}

interface ActiveIndicator {
  indicator: ChartIndicator;
  points: IndicatorPoint[];
  live: IndicatorLiveState;
}

export function createChartIndicatorEngine(options: {
  renderer: IndicatorSeriesRenderer;
  candles: IndicatorCandleSource;
  timeframe: CandleTimeframe;
}): ChartIndicatorEngine {
  const { renderer, candles } = options;

  let timeframe = options.timeframe;
  let configured: readonly ChartIndicator[] = [];
  const active = new Map<string, ActiveIndicator>();
  /** How many finalized candles the incremental path has already folded in. */
  let committedFinalized = 0;

  function enabled(): ChartIndicator[] {
    return configured.filter((indicator) => indicator.enabled);
  }

  /**
   * W5 §32 — is the newest point separated from its predecessor by a genuine
   * history gap? The current candle is not exempt: a line that reconnects to the
   * live bar across an outage is the same false claim in the other direction.
   */
  function currentIsAfterGap(finalized: readonly MarketCandle[], current: MarketCandle): boolean {
    const previous = finalized.at(-1);
    if (!previous) return false;
    return current.startTime - previous.startTime > timeframeSeconds(timeframe);
  }

  function rebuildOne(entry: ActiveIndicator): void {
    const { finalized, current } = candles();
    const series = current === null ? finalized : [...finalized, current];
    entry.points = calculateIndicator(entry.indicator, series, timeframe);
    if (current !== null && currentIsAfterGap(finalized, current)) {
      const last = entry.points.at(-1);
      if (last) entry.points[entry.points.length - 1] = { time: last.time, value: null };
    }
    entry.live = createIndicatorLiveState(entry.indicator, finalized);
    renderer.setData(entry.indicator.id, entry.points);
  }

  function rebuildAll(): void {
    committedFinalized = candles().finalized.length;
    for (const entry of active.values()) rebuildOne(entry);
  }

  return {
    configure(indicators, nextTimeframe) {
      const previousTimeframe = timeframe;
      timeframe = nextTimeframe;
      configured = indicators;

      const wanted = new Map(enabled().map((indicator) => [indicator.id, indicator]));

      // Disabled or removed: the series goes away with it. Leaving a hidden
      // series behind would be a leak the trader cannot see and cannot clear
      // (§122).
      for (const id of [...active.keys()]) {
        if (!wanted.has(id)) {
          renderer.remove(id);
          active.delete(id);
        }
      }

      committedFinalized = candles().finalized.length;
      for (const [id, indicator] of wanted) {
        const existing = active.get(id);
        if (existing === undefined) {
          renderer.create(indicator);
          const entry: ActiveIndicator = {
            indicator,
            points: [],
            live: createIndicatorLiveState(indicator, []),
          };
          active.set(id, entry);
          rebuildOne(entry);
          continue;
        }
        // Period, style or timeframe changed: the existing series is reused (no
        // churn of renderer objects) but its data is no longer valid.
        const changed =
          existing.indicator.period !== indicator.period ||
          existing.indicator.style.color !== indicator.style.color ||
          existing.indicator.style.width !== indicator.style.width ||
          previousTimeframe !== nextTimeframe;
        existing.indicator = indicator;
        if (changed) {
          renderer.create(indicator);
          rebuildOne(existing);
        }
      }
    },

    rebuild: rebuildAll,

    onLiveUpdate() {
      const { finalized, current } = candles();

      // W5 §34/§35 — a bar closing is not a rebuild. The closes that finalized
      // since the last visit are folded into the O(1) rolling state, and their
      // points are already correct (an intrabar point becomes the final point
      // when the bar's last close is its close).
      if (finalized.length < committedFinalized) {
        // The series shrank — only a reset does that, and the caller will
        // rebuild. Re-sync rather than fold negative work into the state.
        rebuildAll();
        return;
      }
      for (let index = committedFinalized; index < finalized.length; index += 1) {
        const closed = finalized[index];
        if (!closed) continue;
        for (const entry of active.values()) {
          commitIndicatorClose(entry.live, Number(closed.close));
          const gapBroken =
            index > 0 &&
            closed.startTime - (finalized[index - 1]?.startTime ?? closed.startTime) >
              timeframeSeconds(timeframe);
          const point: IndicatorPoint = gapBroken
            ? { time: closed.startTime, value: null }
            : {
                time: closed.startTime,
                // The state has just absorbed this close, so the value for the
                // bar that owns it is the state's own value — recomputed here
                // through the same function the live bar uses, with the bar's
                // close standing in for "current".
                value: valueForCommitted(entry.live, Number(closed.close)),
              };
          replaceOrAppend(entry, point);
          renderer.update(entry.indicator.id, point);
        }
      }
      committedFinalized = finalized.length;

      if (current === null) return;
      const broken = currentIsAfterGap(finalized, current);
      for (const entry of active.values()) {
        const value = broken ? null : nextIndicatorValue(entry.live, Number(current.close));
        const point: IndicatorPoint = { time: current.startTime, value };
        replaceOrAppend(entry, point);
        renderer.update(entry.indicator.id, point);
      }
    },

    legend() {
      return enabled().map((indicator) => {
        const entry = active.get(indicator.id);
        return {
          id: indicator.id,
          label: indicatorLabel(indicator),
          color: indicator.style.color,
          value: entry?.points.at(-1)?.value ?? null,
        };
      });
    },

    points: (id) => active.get(id)?.points ?? [],

    dispose() {
      for (const id of active.keys()) renderer.remove(id);
      active.clear();
      configured = [];
      committedFinalized = 0;
    },
  };
}

/**
 * The value of a bar whose close has just been folded into the rolling state.
 *
 * SMA: the window already contains this close, so the mean of the window *is*
 * the value — but only once the window is full. EMA: the state's own
 * `previousEma` is this bar's value, and is null until the seed completes.
 */
function valueForCommitted(state: IndicatorLiveState, close: number): number | null {
  if (state.type === 'sma') {
    if (state.window.length < state.period) return null;
    let sum = 0;
    for (const value of state.window) sum += value;
    return sum / state.period;
  }
  void close;
  return state.previousEma;
}

function replaceOrAppend(entry: ActiveIndicator, point: IndicatorPoint): void {
  const last = entry.points.at(-1);
  if (last && last.time === point.time) {
    entry.points[entry.points.length - 1] = point;
    return;
  }
  entry.points.push(point);
}
