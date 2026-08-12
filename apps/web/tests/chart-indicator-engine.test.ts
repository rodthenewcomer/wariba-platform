import { beforeEach, describe, expect, it } from 'vitest';
import type { MarketCandle } from '@wariba/contracts';
import {
  createChartIndicatorEngine,
  type ChartIndicatorEngine,
} from '../app/(trade)/trade/chart-indicator-engine';
import { calculateSma, type IndicatorPoint } from '../app/(trade)/trade/chart-indicator-math';
import {
  DEFAULT_CHART_INDICATORS,
  MAX_ACTIVE_INDICATORS,
  canEnableAnotherIndicator,
  isValidIndicatorPeriod,
  normalizeChartIndicators,
  parseChartIndicator,
  type ChartIndicator,
} from '../app/(trade)/trade/chart-indicator-model';

/**
 * W5 §34/§35/§100/§102/§103/§122/§123 — the engine that turns candles into
 * lines without recomputing the world on every tick, and without leaking a
 * renderer series when an indicator is switched off.
 */

interface RendererLog {
  created: string[];
  removed: string[];
  setData: { id: string; points: IndicatorPoint[] }[];
  updates: { id: string; point: IndicatorPoint }[];
}

function fakeRenderer(log: RendererLog) {
  return {
    create: (indicator: ChartIndicator) => log.created.push(indicator.id),
    remove: (id: string) => log.removed.push(id),
    setData: (id: string, points: readonly IndicatorPoint[]) =>
      log.setData.push({ id, points: [...points] }),
    update: (id: string, point: IndicatorPoint) => log.updates.push({ id, point }),
  };
}

function candle(startTime: number, close: number): MarketCandle {
  return {
    startTime,
    open: String(close),
    high: String(close),
    low: String(close),
    close: String(close),
  };
}

const SMA_3: ChartIndicator = {
  id: 'sma-3',
  type: 'sma',
  period: 3,
  enabled: true,
  style: { color: '#3673C9', width: 1 },
};

let log: RendererLog;
let finalized: MarketCandle[];
let current: MarketCandle | null;
let engine: ChartIndicatorEngine;

function build(): void {
  log = { created: [], removed: [], setData: [], updates: [] };
  finalized = [];
  current = null;
  engine = createChartIndicatorEngine({
    renderer: fakeRenderer(log),
    candles: () => ({ finalized, current }),
    timeframe: '1m',
  });
}

beforeEach(build);

describe('series ownership — W5 §122/§123', () => {
  it('creates exactly one series per enabled indicator', () => {
    engine.configure(DEFAULT_CHART_INDICATORS, '1m');
    expect(log.created).toEqual(['ema-20', 'sma-20', 'sma-50', 'sma-100']);
    expect(log.removed).toEqual([]);
  });

  it('destroys the series when an indicator is switched off', () => {
    engine.configure(DEFAULT_CHART_INDICATORS, '1m');
    engine.configure(
      DEFAULT_CHART_INDICATORS.map((indicator) =>
        indicator.id === 'sma-50' ? { ...indicator, enabled: false } : indicator,
      ),
      '1m',
    );
    expect(log.removed).toEqual(['sma-50']);
  });

  it('does not create a second series when the same set is configured again', () => {
    engine.configure(DEFAULT_CHART_INDICATORS, '1m');
    engine.configure(DEFAULT_CHART_INDICATORS, '1m');
    engine.configure(DEFAULT_CHART_INDICATORS, '1m');
    expect(log.created).toHaveLength(4);
  });

  it('releases every series on dispose', () => {
    engine.configure(DEFAULT_CHART_INDICATORS, '1m');
    engine.dispose();
    expect([...log.removed].sort()).toEqual(['ema-20', 'sma-100', 'sma-20', 'sma-50']);
  });

  it('recalculates, without churning series objects, when the timeframe changes', () => {
    finalized = Array.from({ length: 5 }, (_, index) => candle(index * 60, index + 1));
    engine.configure([SMA_3], '1m');
    const created = log.created.length;
    const writes = log.setData.length;

    engine.configure([SMA_3], '3m');

    expect(log.created).toHaveLength(created + 1); // re-styled in place, not a new id
    expect(log.removed).toEqual([]);
    expect(log.setData.length).toBeGreaterThan(writes);
  });
});

describe('rebuild versus incremental update — W5 §34/§35', () => {
  it('writes the whole series once on rebuild', () => {
    finalized = Array.from({ length: 10 }, (_, index) => candle(index * 60, index + 1));
    engine.configure([SMA_3], '1m');

    const write = log.setData.at(-1);
    expect(write?.id).toBe('sma-3');
    expect(write?.points.map((point) => point.value)).toEqual(
      calculateSma(finalized, 3, 60).map((point) => point.value),
    );
  });

  it('updates only the current point on a live tick — never the whole series', () => {
    finalized = Array.from({ length: 10 }, (_, index) => candle(index * 60, index + 1));
    engine.configure([SMA_3], '1m');
    const writes = log.setData.length;

    current = candle(600, 20);
    engine.onLiveUpdate();
    current = candle(600, 30);
    engine.onLiveUpdate();
    current = candle(600, 25);
    engine.onLiveUpdate();

    // §35 — three ticks, three one-point writes, zero full rebuilds.
    expect(log.setData).toHaveLength(writes);
    expect(log.updates).toHaveLength(3);
    expect(log.updates.every((entry) => entry.point.time === 600)).toBe(true);
    // §36 — the intrabar value genuinely moves with each tick.
    const seen = log.updates.map((entry) => entry.point.value);
    expect(new Set(seen).size).toBe(3);
  });

  it('commits the final value once the bar closes, with no duplicate point (§100)', () => {
    finalized = Array.from({ length: 10 }, (_, index) => candle(index * 60, index + 1));
    engine.configure([SMA_3], '1m');

    current = candle(600, 25);
    engine.onLiveUpdate();

    // The bar closes at 25 and the next bucket opens — exactly what the history
    // controller does: append to `finalized`, then move `current` forward.
    finalized = [...finalized, candle(600, 25)];
    current = candle(660, 26);
    engine.onLiveUpdate();

    const full = calculateSma([...finalized, current], 3, 60);
    const points = engine.points('sma-3');
    expect(points.map((point) => point.time)).toEqual(full.map((point) => point.time));
    expect(points.at(-2)?.value).toBeCloseTo(full.at(-2)?.value ?? Number.NaN, 10);
    expect(points.at(-1)?.value).toBeCloseTo(full.at(-1)?.value ?? Number.NaN, 10);
  });

  it('rebuilds correctly after an older page is prepended (§102/§133)', () => {
    finalized = Array.from({ length: 5 }, (_, index) => candle((index + 5) * 60, index + 6));
    engine.configure([SMA_3], '1m');
    const latestBefore = engine.points('sma-3').at(-1)?.value;

    // Five older bars arrive; the newest values must be unchanged, and the
    // formerly-oldest edge now has enough warm-up to carry values.
    finalized = [
      ...Array.from({ length: 5 }, (_, index) => candle(index * 60, index + 1)),
      ...finalized,
    ];
    engine.rebuild();

    const points = engine.points('sma-3');
    expect(points).toHaveLength(10);
    expect(points.at(-1)?.value).toBeCloseTo(latestBefore ?? Number.NaN, 10);
    // Previously null because the series started there; now warm.
    expect(points[4]?.value).not.toBeNull();
    // No duplicate times survived the prepend.
    expect(new Set(points.map((point) => point.time)).size).toBe(points.length);
  });

  it('breaks the live point when the current bar follows a genuine gap (§32)', () => {
    finalized = Array.from({ length: 5 }, (_, index) => candle(index * 60, index + 1));
    engine.configure([SMA_3], '1m');

    current = candle(6000, 99);
    engine.onLiveUpdate();

    expect(log.updates.at(-1)?.point).toEqual({ time: 6000, value: null });
  });
});

describe('legend — W5 §39', () => {
  it('names every enabled indicator and reports its latest value', () => {
    finalized = Array.from({ length: 10 }, (_, index) => candle(index * 60, index + 1));
    engine.configure([SMA_3], '1m');

    const [entry] = engine.legend();
    expect(entry?.label).toBe('SMA 3');
    expect(entry?.color).toBe('#3673C9');
    expect(entry?.value).toBeCloseTo(9, 10); // mean(8,9,10)
  });

  it('lists only enabled indicators', () => {
    engine.configure([{ ...SMA_3, enabled: false }], '1m');
    expect(engine.legend()).toEqual([]);
  });

  it('reports no value while an indicator is still warming up (§37)', () => {
    finalized = [candle(0, 1)];
    engine.configure([SMA_3], '1m');
    expect(engine.legend()[0]?.value).toBeNull();
  });
});

describe('the indicator registry — W5 §25/§27/§28/§103', () => {
  it('ships the four default WariX moving averages, all enabled', () => {
    expect(DEFAULT_CHART_INDICATORS.map((indicator) => indicator.id)).toEqual([
      'ema-20',
      'sma-20',
      'sma-50',
      'sma-100',
    ]);
    expect(DEFAULT_CHART_INDICATORS.every((indicator) => indicator.enabled)).toBe(true);
    expect(DEFAULT_CHART_INDICATORS.map((indicator) => indicator.period)).toEqual([
      20, 20, 50, 100,
    ]);
  });

  it('accepts only integer periods inside the documented range', () => {
    for (const valid of [2, 3, 20, 100, 499, 500]) expect(isValidIndicatorPeriod(valid)).toBe(true);
    for (const invalid of [
      0,
      1,
      -20,
      501,
      20.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '20',
      null,
      undefined,
    ]) {
      expect(isValidIndicatorPeriod(invalid), String(invalid)).toBe(false);
    }
  });

  it('discards a malformed stored record rather than repairing it', () => {
    const valid = { ...SMA_3 };
    expect(parseChartIndicator(valid)).toEqual(valid);

    for (const malformed of [
      null,
      'sma',
      { ...valid, type: 'rsi' },
      { ...valid, period: 0 },
      { ...valid, period: 1000 },
      { ...valid, enabled: 'yes' },
      { ...valid, id: '' },
      { ...valid, style: { color: 'red', width: 1 } },
      { ...valid, style: { color: '#3673C9', width: 9 } },
    ]) {
      expect(parseChartIndicator(malformed)).toBeNull();
    }
  });

  it('caps the number of simultaneously enabled indicators (§28)', () => {
    const many: ChartIndicator[] = Array.from({ length: 12 }, (_, index) => ({
      ...SMA_3,
      id: `sma-${index}`,
      period: index + 2,
    }));
    const normalized = normalizeChartIndicators(many);

    expect(normalized).toHaveLength(12); // configuration is kept…
    expect(normalized.filter((indicator) => indicator.enabled)).toHaveLength(MAX_ACTIVE_INDICATORS);
    expect(canEnableAnotherIndicator(normalized)).toBe(false);
  });

  it('drops duplicate ids so one stored record cannot render twice', () => {
    const normalized = normalizeChartIndicators([SMA_3, { ...SMA_3, period: 9 }]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.period).toBe(3);
  });
});
