'use client';

import { timeframeSeconds, type CandleTimeframe, type MarketCandle } from '@wariba/contracts';
import type { ChartIndicator } from './chart-indicator-model';

/**
 * Moving-average calculation — W5 §29-§37.
 *
 * Every semantic here is written down rather than inherited from a charting
 * library's defaults, because "which bar does the line start on" and "what seeds
 * the EMA" are exactly the questions that make two charts of the same market
 * disagree. Both are specified, and both are tested against hand-computed values.
 *
 * **Price source.** Candle *closes*, which are the canonical MID basis W3
 * established (`INDICATOR_PRICE_SOURCE = CANDLE_CLOSE_MID`). Never bid, never
 * ask, never a fill price, never account P&L.
 *
 * **Numeric basis.** JavaScript `number`. This is display analytics, and it is
 * isolated to this file: values leave as `number | null` straight into a
 * lightweight-charts line series and reach no execution, risk or order path
 * (§33/§84). Canonical prices stay decimal strings everywhere else.
 */

/**
 * One rendered point. `value === null` is a **whitespace** item: the renderer
 * draws nothing and, crucially, does not connect the neighbours across it.
 */
export interface IndicatorPoint {
  time: number;
  value: number | null;
}

/**
 * W5 §32/§101 — how a genuine history gap is drawn.
 *
 * W3 permits real temporal gaps: an interval with no accepted tick produces no
 * candle. The moving average may legitimately continue across such a gap — it is
 * an average of the closes that were observed — but the *line* must not be drawn
 * through it, because a continuous stroke over a ten-minute outage asserts a
 * price path nobody observed.
 *
 * The break is placed on the first candle after the gap, as a whitespace item.
 * That choice is deliberate: whitespace at the missing bucket's own timestamp
 * would break the line just as well, but it would also introduce a time to the
 * chart's scale that no series has data for, shifting every logical bar index
 * and quietly breaking the backfill viewport compensation in §21. Every
 * indicator point therefore sits on a real candle time, and the count of chart
 * slots stays exactly the count of candles.
 *
 * What is *not* done: no interpolation, no carried-forward close, no synthetic
 * candle. One drawn point is suppressed; no price is invented.
 */
export const INDICATOR_GAP_VISUAL_POLICY = 'whitespace_at_first_candle_after_gap';

function hasGapBefore(
  candles: readonly MarketCandle[],
  index: number,
  intervalSeconds: number,
): boolean {
  if (index === 0) return false;
  const previous = candles[index - 1];
  const current = candles[index];
  if (!previous || !current) return false;
  return current.startTime - previous.startTime > intervalSeconds;
}

/**
 * W5 §30 — canonical SMA.
 *
 * For period N there is no value for the first N-1 observed candles; the value
 * at candle N is the arithmetic mean of closes 1…N, and each subsequent value is
 * the mean of the latest N **observed** closes. "Observed" is the load-bearing
 * word: a gap does not reset the window and does not get filled, so the window
 * is always the last N bars that genuinely exist.
 */
export function calculateSma(
  candles: readonly MarketCandle[],
  period: number,
  intervalSeconds: number,
): IndicatorPoint[] {
  const points: IndicatorPoint[] = [];
  let sum = 0;

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    if (!candle) continue;
    sum += Number(candle.close);
    if (index >= period) {
      const leaving = candles[index - period];
      if (leaving) sum -= Number(leaving.close);
    }
    const warm = index >= period - 1;
    const broken = hasGapBefore(candles, index, intervalSeconds);
    points.push({ time: candle.startTime, value: warm && !broken ? sum / period : null });
  }

  return points;
}

/**
 * W5 §31 — canonical EMA.
 *
 * `alpha = 2 / (N + 1)`. The seed is the **SMA of the first N observed closes**,
 * so the first EMA value appears at candle N, exactly where the SMA of the same
 * period does. From there `EMA_t = close_t × alpha + EMA_(t-1) × (1 - alpha)`.
 *
 * Stated explicitly because charting libraries disagree: some seed with the
 * first close (which makes the early line depend entirely on one bar), some
 * start the recursion at bar 1 with no warm-up at all. Neither is used here, and
 * `chart-indicator-math.test.ts` pins the arithmetic to hand-computed values so
 * a future dependency cannot change it silently.
 */
export function calculateEma(
  candles: readonly MarketCandle[],
  period: number,
  intervalSeconds: number,
): IndicatorPoint[] {
  const alpha = 2 / (period + 1);
  const points: IndicatorPoint[] = [];
  let seedSum = 0;
  let previous: number | null = null;

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    if (!candle) continue;
    const close = Number(candle.close);

    if (previous === null) {
      seedSum += close;
      if (index < period - 1) {
        points.push({ time: candle.startTime, value: null });
        continue;
      }
      previous = seedSum / period;
    } else {
      previous = close * alpha + previous * (1 - alpha);
    }

    const broken = hasGapBefore(candles, index, intervalSeconds);
    points.push({ time: candle.startTime, value: broken ? null : previous });
  }

  return points;
}

/**
 * W5 §34 — the full rebuild.
 *
 * Allowed on hydration, symbol change, timeframe change, older-history prepend
 * and settings change; **not** on a market tick. The live path is
 * `nextIndicatorValue` below, which is O(1) per indicator per tick.
 */
export function calculateIndicator(
  indicator: Pick<ChartIndicator, 'type' | 'period'>,
  candles: readonly MarketCandle[],
  timeframe: CandleTimeframe,
): IndicatorPoint[] {
  const intervalSeconds = timeframeSeconds(timeframe);
  return indicator.type === 'sma'
    ? calculateSma(candles, indicator.period, intervalSeconds)
    : calculateEma(candles, indicator.period, intervalSeconds);
}

/**
 * W5 §35/§36 — the incremental state one indicator carries between ticks.
 *
 * Holds only what the next point needs: the last N **finalized** closes for an
 * SMA, and the last finalized EMA plus the seed accumulator for an EMA. The
 * current, still-moving candle is never folded into this state — it is applied
 * on top of it, so an intrabar point can move up and down without corrupting the
 * series it will eventually join.
 */
export interface IndicatorLiveState {
  type: 'sma' | 'ema';
  period: number;
  /** Finalized closes, newest last, at most `period` of them (SMA). */
  window: number[];
  /** Last finalized EMA, or null while still warming up (EMA). */
  previousEma: number | null;
  /** Sum of finalized closes seen while warming up (EMA seed). */
  seedSum: number;
  /** How many finalized closes have been observed in total. */
  observed: number;
}

export function createIndicatorLiveState(
  indicator: Pick<ChartIndicator, 'type' | 'period'>,
  finalized: readonly MarketCandle[],
): IndicatorLiveState {
  const state: IndicatorLiveState = {
    type: indicator.type,
    period: indicator.period,
    window: [],
    previousEma: null,
    seedSum: 0,
    observed: 0,
  };
  for (const candle of finalized) commitIndicatorClose(state, Number(candle.close));
  return state;
}

/**
 * Folds one **finalized** close into the rolling state (§35).
 *
 * Called when a candle closes, never per tick within a candle: the current
 * bucket's close is not final and folding it in would make the average depend on
 * how many ticks happened to arrive before the bucket rolled over.
 */
export function commitIndicatorClose(state: IndicatorLiveState, close: number): void {
  state.observed += 1;
  if (state.type === 'sma') {
    state.window.push(close);
    if (state.window.length > state.period) state.window.shift();
    return;
  }
  if (state.previousEma === null) {
    state.seedSum += close;
    if (state.observed >= state.period) state.previousEma = state.seedSum / state.period;
    return;
  }
  const alpha = 2 / (state.period + 1);
  state.previousEma = close * alpha + state.previousEma * (1 - alpha);
}

/**
 * The indicator value for the **current, unfinished** candle (§36).
 *
 * O(1): the finalized state is already rolled, so this applies one close on top
 * of it. Returns `null` while the indicator is still warming up, which is what
 * keeps the line from starting on fabricated warm-up data (§37).
 */
export function nextIndicatorValue(state: IndicatorLiveState, currentClose: number): number | null {
  if (state.type === 'sma') {
    // The current bar takes the place the oldest finalized close would lose when
    // it eventually closes — so the window is always exactly `period` values.
    const needed = state.period - 1;
    if (state.window.length < needed) return null;
    const tail = state.window.slice(state.window.length - needed);
    let sum = currentClose;
    for (const value of tail) sum += value;
    return sum / state.period;
  }
  if (state.previousEma === null) {
    // One short of the seed: the current bar completes it, and the seed is the
    // SMA of the first N closes — the same rule the full calculation uses.
    if (state.observed !== state.period - 1) return null;
    return (state.seedSum + currentClose) / state.period;
  }
  const alpha = 2 / (state.period + 1);
  return currentClose * alpha + state.previousEma * (1 - alpha);
}
