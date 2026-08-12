import { describe, expect, it } from 'vitest';
import type { MarketCandle } from '@wariba/contracts';
import {
  calculateEma,
  calculateIndicator,
  calculateSma,
  commitIndicatorClose,
  createIndicatorLiveState,
  nextIndicatorValue,
} from '../app/(trade)/trade/chart-indicator-math';

/**
 * W5 §98/§99/§100/§101 — the moving-average arithmetic, pinned to hand-computed
 * values.
 *
 * These tests exist because "which bar does the line start on" and "what seeds
 * the EMA" are the two questions charting libraries silently disagree about. A
 * test that compared this implementation against another library's output would
 * only prove the two agree; these compare against arithmetic written out in the
 * assertion, so the semantics survive any future dependency change.
 */

const INTERVAL = 60;

/** Closes 1, 2, 3, … so every expected mean can be written down exactly. */
function ramp(count: number, start = 0, step = INTERVAL): MarketCandle[] {
  return Array.from({ length: count }, (_, index) => ({
    startTime: start + index * step,
    open: String(index + 1),
    high: String(index + 1),
    low: String(index + 1),
    close: String(index + 1),
  }));
}

function values(points: { value: number | null }[]): (number | null)[] {
  return points.map((point) => point.value);
}

describe('SMA — W5 §30/§98', () => {
  it('has no value for the first N-1 candles and the mean of 1…N at candle N', () => {
    const points = calculateSma(ramp(25), 20, INTERVAL);
    // First 19 bars: warming up, nothing drawn. Not zero, not the close.
    expect(values(points).slice(0, 19)).toEqual(Array.from({ length: 19 }, () => null));
    // Bar 20 = mean(1..20) = 210/20.
    expect(points[19]?.value).toBeCloseTo(10.5, 10);
    // Bar 21 = mean(2..21) = 230/20.
    expect(points[20]?.value).toBeCloseTo(11.5, 10);
    // Bar 25 = mean(6..25) = 310/20.
    expect(points[24]?.value).toBeCloseTo(15.5, 10);
  });

  it('is off by exactly nothing at period 50 and period 100', () => {
    const fifty = calculateSma(ramp(120), 50, INTERVAL);
    expect(fifty[48]?.value).toBeNull();
    // mean(1..50) = 1275/50.
    expect(fifty[49]?.value).toBeCloseTo(25.5, 10);
    // mean(2..51) = 1325/50.
    expect(fifty[50]?.value).toBeCloseTo(26.5, 10);

    const hundred = calculateSma(ramp(120), 100, INTERVAL);
    expect(hundred[98]?.value).toBeNull();
    // mean(1..100) = 5050/100.
    expect(hundred[99]?.value).toBeCloseTo(50.5, 10);
    expect(hundred[100]?.value).toBeCloseTo(51.5, 10);
  });

  it('starts nothing at all when there are fewer candles than the period (§37)', () => {
    // No fabricated warm-up: a 100 SMA on 40 observed candles draws nothing.
    expect(values(calculateSma(ramp(40), 100, INTERVAL)).every((value) => value === null)).toBe(
      true,
    );
  });
});

describe('EMA — W5 §31/§99', () => {
  it('seeds with the SMA of the first N closes and then applies alpha = 2/(N+1)', () => {
    const points = calculateEma(ramp(25), 20, INTERVAL);
    expect(values(points).slice(0, 19)).toEqual(Array.from({ length: 19 }, () => null));

    // Bar 20 is the seed: SMA(1..20) = 10.5. Not the first close, not close 20.
    const seed = points[19]?.value;
    expect(seed).toBeCloseTo(10.5, 10);

    const alpha = 2 / 21;
    // Bar 21: close 21 × alpha + seed × (1 - alpha).
    const expected21 = 21 * alpha + 10.5 * (1 - alpha);
    expect(points[20]?.value).toBeCloseTo(expected21, 10);
    // Bar 22, recursively from bar 21's value.
    expect(points[21]?.value).toBeCloseTo(22 * alpha + expected21 * (1 - alpha), 10);
  });

  it('uses the documented alpha, not a library default', () => {
    // A flat series sits exactly on its own average at every bar, whatever
    // alpha is; a step change is what makes the smoothing constant observable.
    const flat: MarketCandle[] = Array.from({ length: 6 }, (_, index) => ({
      startTime: index * INTERVAL,
      open: '100',
      high: '100',
      low: '100',
      close: index === 5 ? '200' : '100',
    }));
    const points = calculateEma(flat, 5, INTERVAL);
    expect(points[4]?.value).toBeCloseTo(100, 10);
    // alpha = 2/6 = 1/3 → 200/3 + 200/3 = 133.333…
    expect(points[5]?.value).toBeCloseTo(200 * (1 / 3) + 100 * (2 / 3), 10);
  });
});

describe('genuine history gaps — W5 §32/§101', () => {
  const gapped: MarketCandle[] = [
    ...ramp(5, 0),
    // A real outage: the 60 s buckets from 300 to 900 produced no candle.
    ...ramp(5, 960).map((candle, index) => ({ ...candle, close: String(index + 6) })),
  ];

  it('breaks the line at the first candle after the gap rather than bridging it', () => {
    const points = calculateSma(gapped, 3, INTERVAL);
    const gapIndex = gapped.findIndex((candle) => candle.startTime === 960);

    expect(points[gapIndex]?.time).toBe(960);
    expect(points[gapIndex]?.value).toBeNull();
    // The bars on either side of the break still carry real values, so the
    // calculation continued over the observed candles (§32).
    expect(points[gapIndex - 1]?.value).not.toBeNull();
    expect(points[gapIndex + 1]?.value).not.toBeNull();
  });

  it('never fabricates a price or a candle to fill the gap', () => {
    const points = calculateSma(gapped, 3, INTERVAL);
    // Exactly one point per observed candle — no synthetic bucket appears.
    expect(points).toHaveLength(gapped.length);
    expect(points.map((point) => point.time)).toEqual(gapped.map((candle) => candle.startTime));
  });

  it('applies the same break to an EMA', () => {
    const points = calculateEma(gapped, 3, INTERVAL);
    const gapIndex = gapped.findIndex((candle) => candle.startTime === 960);
    expect(points[gapIndex]?.value).toBeNull();
    expect(points[gapIndex + 1]?.value).not.toBeNull();
  });

  it('treats a contiguous series as continuous', () => {
    expect(
      values(calculateSma(ramp(10), 3, INTERVAL))
        .slice(2)
        .includes(null),
    ).toBe(false);
  });
});

describe('incremental live update — W5 §35/§100', () => {
  it('SMA: the intrabar value equals the full calculation once the bar closes', () => {
    const finalized = ramp(30);
    const state = createIndicatorLiveState({ type: 'sma', period: 20 }, finalized);

    // Three ticks move the current bar; each produces a fresh current point.
    const currents = ['40', '41', '42'].map((close) => nextIndicatorValue(state, Number(close)));
    expect(currents.every((value) => value !== null)).toBe(true);
    expect(currents[0]).not.toBe(currents[1]);

    // The bar closes at 42: the incremental value must equal a full rebuild.
    const closed: MarketCandle[] = [
      ...finalized,
      { startTime: 30 * INTERVAL, open: '42', high: '42', low: '42', close: '42' },
    ];
    const full = calculateSma(closed, 20, INTERVAL);
    expect(currents.at(-1)).toBeCloseTo(full.at(-1)?.value ?? Number.NaN, 10);
  });

  it('EMA: the intrabar value equals the full calculation once the bar closes', () => {
    const finalized = ramp(30);
    const state = createIndicatorLiveState({ type: 'ema', period: 20 }, finalized);
    const current = nextIndicatorValue(state, 42);

    const closed: MarketCandle[] = [
      ...finalized,
      { startTime: 30 * INTERVAL, open: '42', high: '42', low: '42', close: '42' },
    ];
    const full = calculateEma(closed, 20, INTERVAL);
    expect(current).toBeCloseTo(full.at(-1)?.value ?? Number.NaN, 10);
  });

  it('reports no value until the indicator has genuinely warmed up (§37)', () => {
    // 18 finalized closes for a 20 SMA: the current bar would be the 19th, one
    // short. Nothing is drawn rather than an average of what happens to exist.
    const state = createIndicatorLiveState({ type: 'sma', period: 20 }, ramp(18));
    expect(nextIndicatorValue(state, 19)).toBeNull();

    commitIndicatorClose(state, 19);
    // Now the current bar completes the window.
    expect(nextIndicatorValue(state, 20)).toBeCloseTo(10.5, 10);
  });

  it('EMA warm-up completes on exactly the Nth bar, seeded by the SMA', () => {
    const state = createIndicatorLiveState({ type: 'ema', period: 20 }, ramp(18));
    expect(nextIndicatorValue(state, 19)).toBeNull();
    commitIndicatorClose(state, 19);
    expect(nextIndicatorValue(state, 20)).toBeCloseTo(10.5, 10);
  });

  it('rolling state never depends on how many ticks a bar received', () => {
    // §35/§36 — an intrabar value must not be folded into the finalized state,
    // or a busy bar would drag the average.
    const finalized = ramp(30);
    const busy = createIndicatorLiveState({ type: 'ema', period: 20 }, finalized);
    for (const close of [35, 40, 45, 50, 42]) nextIndicatorValue(busy, close);
    commitIndicatorClose(busy, 42);

    const quiet = createIndicatorLiveState({ type: 'ema', period: 20 }, finalized);
    commitIndicatorClose(quiet, 42);

    expect(busy.previousEma).toBeCloseTo(quiet.previousEma ?? Number.NaN, 12);
  });
});

describe('calculateIndicator dispatch', () => {
  it('routes by type and uses the timeframe for gap detection', () => {
    const candles = ramp(6);
    expect(values(calculateIndicator({ type: 'sma', period: 3 }, candles, '1m'))).toEqual(
      values(calculateSma(candles, 3, 60)),
    );
    expect(values(calculateIndicator({ type: 'ema', period: 3 }, candles, '1m'))).toEqual(
      values(calculateEma(candles, 3, 60)),
    );
  });

  it('detects a gap against the timeframe it was told, not a fixed interval', () => {
    // 60 s apart is a gap on a 5s chart and contiguous on a 1m one. The same
    // candles therefore break in one reading and not in the other — which is
    // why the interval is a parameter rather than inferred from the data.
    const candles = ramp(6);
    const onOneMinute = calculateIndicator({ type: 'sma', period: 2 }, candles, '1m');
    expect(values(onOneMinute).slice(1).includes(null)).toBe(false);

    const onFiveSeconds = calculateIndicator({ type: 'sma', period: 2 }, candles, '5s');
    expect(
      values(onFiveSeconds)
        .slice(1)
        .every((value) => value === null),
    ).toBe(true);
  });
});
