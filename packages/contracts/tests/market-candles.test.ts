import { describe, expect, it } from 'vitest';
import {
  bucketStartSeconds,
  createCandleAggregator,
  midPrice,
  timeframeSeconds,
  type CandleTimeframe,
} from '../src/market-candles';

/** Epoch ms for a UTC wall-clock instant, so no test depends on the runner's timezone. */
function utc(h: number, m: number, s: number, ms = 0): number {
  return Date.UTC(2026, 0, 1, h, m, s, ms);
}

describe('bucketStartSeconds — W3 §9', () => {
  const cases: { tf: CandleTimeframe; boundary: number }[] = [
    { tf: '5s', boundary: utc(10, 0, 30) },
    { tf: '30s', boundary: utc(10, 0, 30) },
    { tf: '1m', boundary: utc(10, 1, 0) },
  ];

  for (const { tf, boundary } of cases) {
    it(`${tf}: is left-inclusive at an exact boundary`, () => {
      const duration = timeframeSeconds(tf);
      const boundarySeconds = boundary / 1000;

      // 1 ms before the boundary still belongs to the previous bucket…
      expect(bucketStartSeconds(boundary - 1, tf)).toBe(boundarySeconds - duration);
      // …the boundary itself opens the new one…
      expect(bucketStartSeconds(boundary, tf)).toBe(boundarySeconds);
      // …and 1 ms after stays in it.
      expect(bucketStartSeconds(boundary + 1, tf)).toBe(boundarySeconds);
    });
  }

  it('is UTC-aligned and independent of local time', () => {
    // Epoch 0 is 1970-01-01T00:00:00Z; every timeframe buckets it to itself
    // regardless of the runner's timezone offset.
    for (const tf of ['5s', '30s', '1m'] as CandleTimeframe[]) {
      expect(bucketStartSeconds(0, tf)).toBe(0);
    }
    expect(bucketStartSeconds(utc(23, 59, 59, 999), '1m')).toBe(utc(23, 59, 0) / 1000);
  });

  it('floors sub-second input rather than implying precision the feed lacks', () => {
    expect(bucketStartSeconds(utc(10, 0, 4, 999), '5s')).toBe(utc(10, 0, 0) / 1000);
    expect(bucketStartSeconds(utc(10, 0, 5, 1), '5s')).toBe(utc(10, 0, 5) / 1000);
  });
});

describe('midPrice — W3 §8', () => {
  it('is decimal, not binary float', () => {
    // The shipped chart computed this in float and produced values like
    // 1.0843699999999998; the canonical helper must not.
    expect(midPrice('1.08430', '1.08444', 5)).toBe('1.08437');
    expect(midPrice('0.1', '0.2', 5)).toBe('0.15000');
  });

  it('rounds to the symbol’s own precision', () => {
    expect(midPrice('150.100', '150.121', 3)).toBe('150.111');
    expect(midPrice('18000.0', '18002.0', 1)).toBe('18001.0');
  });
});

describe('createCandleAggregator — W3 §7/§10', () => {
  const tf: CandleTimeframe = '30s';
  const base = utc(10, 0, 0);

  it('preserves the high from an intermediate observation (W3 §52)', () => {
    // The defect W3 Phase A found: A opens, B spikes, C closes lower. If the
    // aggregator only ever saw the newest value it would report high = C.
    const aggregator = createCandleAggregator(tf);
    aggregator.observe({ timestampMs: base + 1000, price: '1.10000' });
    aggregator.observe({ timestampMs: base + 2000, price: '1.10500' });
    const last = aggregator.observe({ timestampMs: base + 3000, price: '1.10100' });

    expect(last.current).toEqual({
      startTime: base / 1000,
      open: '1.10000',
      high: '1.10500',
      low: '1.10000',
      close: '1.10100',
    });
  });

  it('preserves the low from an intermediate observation (W3 §53)', () => {
    const aggregator = createCandleAggregator(tf);
    aggregator.observe({ timestampMs: base + 1000, price: '1.10000' });
    aggregator.observe({ timestampMs: base + 2000, price: '1.09500' });
    const last = aggregator.observe({ timestampMs: base + 3000, price: '1.09900' });

    expect(last.current.low).toBe('1.09500');
    expect(last.current.close).toBe('1.09900');
    expect(last.current.high).toBe('1.10000');
  });

  it('reports open/high/low/close over many observations (W3 §54)', () => {
    const aggregator = createCandleAggregator(tf);
    const prices = ['1.10000', '1.10300', '1.09800', '1.10200', '1.09900'];
    let update = aggregator.observe({ timestampMs: base, price: prices[0] as string });
    for (const [index, price] of prices.slice(1).entries()) {
      update = aggregator.observe({ timestampMs: base + (index + 1) * 1000, price });
    }
    expect(update.current).toEqual({
      startTime: base / 1000,
      open: '1.10000',
      high: '1.10300',
      low: '1.09800',
      close: '1.09900',
    });
  });

  it('finalizes exactly once when the stream enters a later bucket', () => {
    const aggregator = createCandleAggregator(tf);
    aggregator.observe({ timestampMs: base, price: '1.10000' });
    aggregator.observe({ timestampMs: base + 5000, price: '1.10400' });

    const crossing = aggregator.observe({ timestampMs: base + 30_000, price: '1.10050' });
    expect(crossing.finalized).toEqual({
      startTime: base / 1000,
      open: '1.10000',
      high: '1.10400',
      low: '1.10000',
      close: '1.10400',
    });
    expect(crossing.openedNewBucket).toBe(true);
    expect(crossing.current.startTime).toBe(base / 1000 + 30);

    // A second observation inside the new bucket must not re-finalize.
    const following = aggregator.observe({ timestampMs: base + 31_000, price: '1.10060' });
    expect(following.finalized).toBeNull();
    expect(following.openedNewBucket).toBe(false);
  });

  it('never finalizes a candle for an interval with no observation', () => {
    // Skipping a whole bucket produces one finalized candle for the bucket
    // that actually had ticks — not a flat filler for the empty one (§10/§40).
    const aggregator = createCandleAggregator(tf);
    aggregator.observe({ timestampMs: base, price: '1.10000' });
    const jump = aggregator.observe({ timestampMs: base + 90_000, price: '1.20000' });

    expect(jump.finalized?.startTime).toBe(base / 1000);
    expect(jump.current.startTime).toBe(base / 1000 + 90);
    expect(jump.current.open).toBe('1.20000');
  });

  it('ignores an observation older than the open bucket', () => {
    const aggregator = createCandleAggregator(tf);
    aggregator.observe({ timestampMs: base + 30_000, price: '1.10000' });
    const stale = aggregator.observe({ timestampMs: base, price: '9.99999' });

    expect(stale.finalized).toBeNull();
    expect(stale.current.startTime).toBe(base / 1000 + 30);
    expect(stale.current.high).toBe('1.10000');
  });
});
