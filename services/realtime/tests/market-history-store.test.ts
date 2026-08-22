import { describe, expect, it } from 'vitest';
import {
  CANDLE_TIMEFRAMES,
  SUPPORTED_CANDLE_TIMEFRAMES,
  bucketStartSeconds,
} from '@wariba/contracts';
import type { MarketTick, TradableSymbol } from '@wariba/contracts';
import {
  MemoryMarketHistoryStore,
  SERVER_HISTORY_RETENTION_PER_SYMBOL_TIMEFRAME,
} from '../src/market-history-store';

/**
 * W3 B2 — the observed-memory history store.
 *
 * Every assertion here is about what the store *observed*, never about what it
 * could infer: there is no timer finalization, no flat filler for an interval
 * with no ticks, and no reconstruction of a price for a timestamp the process
 * did not see.
 */

const PRECISION: Record<TradableSymbol, number> = {
  EURUSD: 5,
  GBPUSD: 5,
  USDJPY: 3,
  XAUUSD: 2,
  NAS100: 1,
};

function makeStore(overrides: { retentionPerKey?: number; sourceEpoch?: string } = {}) {
  return new MemoryMarketHistoryStore({ pricePrecision: PRECISION, ...overrides });
}

/** Second-resolution timestamps, exactly like the feed (Phase A §1.F). */
function at(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function tick(params: {
  seconds: number;
  bid: string;
  ask: string;
  sequence: number;
  symbol?: TradableSymbol;
}): MarketTick {
  return {
    symbol: params.symbol ?? 'EURUSD',
    bid: params.bid,
    ask: params.ask,
    timestamp: at(params.seconds),
    sequence: params.sequence,
    marketStatus: 'open',
  };
}

/** A mid-priced tick: bid/ask straddle `mid` by one point at precision 5. */
function midTick(seconds: number, mid: string, sequence: number): MarketTick {
  const value = Number(mid);
  return tick({
    seconds,
    bid: (value - 0.00001).toFixed(5),
    ask: (value + 0.00001).toFixed(5),
    sequence,
  });
}

/** `before` is genuinely optional under exactOptionalPropertyTypes. */
function pageBefore(cursor: number | null): { before?: number } {
  return cursor === null ? {} : { before: cursor };
}

describe('MemoryMarketHistoryStore — one tick, five aggregators (W3 §8 / W5 §10)', () => {
  it('feeds 5s, 15s, 30s, 1m and 3m from a single accepted tick', async () => {
    const store = makeStore();
    const start = Date.UTC(2026, 5, 1) / 1000; // Monday and first of the month.
    store.observeAcceptedTick(midTick(start, '1.08450', 1));
    store.observeAcceptedTick(midTick(Date.UTC(2026, 6, 1) / 1000, '1.08460', 2));

    for (const timeframe of CANDLE_TIMEFRAMES) {
      const window = await store.getCandles({ symbol: 'EURUSD', timeframe, limit: 10 });
      expect(window.candles, timeframe).toHaveLength(1);
      expect(window.candles.at(0)?.startTime, timeframe).toBe(start);
      expect(window.candles.at(0)?.close, timeframe).toBe('1.08450');
    }
  });

  it('aggregates the W5 intervals from observed ticks only, never from reconstruction', async () => {
    // W5 §12 — the store has observed one minute of ticks. A 3m chart must show
    // the one in-progress bucket it genuinely has, not a fabricated back-fill of
    // the 3m buckets that elapsed before the process started.
    const store = makeStore();
    for (let second = 0; second <= 59; second += 1) {
      store.observeAcceptedTick(midTick(second, '1.08450', second + 1));
    }

    const fifteen = await store.getCandles({ symbol: 'EURUSD', timeframe: '15s', limit: 100 });
    expect(fifteen.candles.map((candle) => candle.startTime)).toEqual([0, 15, 30]);
    expect(fifteen.currentCandle?.startTime).toBe(45);

    const three = await store.getCandles({ symbol: 'EURUSD', timeframe: '3m', limit: 100 });
    expect(three.candles).toHaveLength(0);
    expect(three.currentCandle?.startTime).toBe(0);
    expect(three.hasMore).toBe(false);
  });

  it('computes mid with decimal arithmetic at the symbol precision', async () => {
    const store = makeStore();
    // The float version of this mid is 1.0843699999999998 (Phase A §1.E).
    store.observeAcceptedTick(tick({ seconds: 0, bid: '1.08432', ask: '1.08442', sequence: 1 }));
    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    expect(window.currentCandle?.open).toBe('1.08437');
  });

  it('identifies its source and basis honestly', async () => {
    const store = makeStore();
    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 10 });
    expect(window.source).toBe('observed_memory_cache');
    expect(window.priceBasis).toBe('mid');
  });
});

describe('MemoryMarketHistoryStore — finalization is observed, never synthesised (W3 §14/§51)', () => {
  it('finalizes a candle only when a later accepted tick proves a later bucket', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 1));
    store.observeAcceptedTick(midTick(3, '1.08460', 2));

    let window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    expect(window.candles).toHaveLength(0);
    expect(window.currentCandle).not.toBeNull();

    store.observeAcceptedTick(midTick(5, '1.08470', 3));
    window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    expect(window.candles).toHaveLength(1);
    expect(window.candles[0]).toEqual({
      startTime: 0,
      open: '1.08450',
      high: '1.08460',
      low: '1.08450',
      close: '1.08460',
    });
  });

  it('leaves a gap rather than inventing candles for intervals with no ticks', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 1));
    // Nothing at all for 20 seconds, then one tick.
    store.observeAcceptedTick(midTick(25, '1.08500', 2));
    store.observeAcceptedTick(midTick(30, '1.08510', 3));

    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 100 });
    expect(window.candles.map((c) => c.startTime)).toEqual([0, 25]);
  });

  it('preserves intermediate high and low inside a bucket', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 1));
    store.observeAcceptedTick(midTick(1, '1.08490', 2));
    store.observeAcceptedTick(midTick(2, '1.08410', 3));
    store.observeAcceptedTick(midTick(3, '1.08460', 4));
    store.observeAcceptedTick(midTick(5, '1.08470', 5));

    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    expect(window.candles[0]).toEqual({
      startTime: 0,
      open: '1.08450',
      high: '1.08490',
      low: '1.08410',
      close: '1.08460',
    });
  });
});

describe('MemoryMarketHistoryStore — same-second ticks (W3 §47/§64)', () => {
  it('lets every accepted tick sharing one timestamp second contribute', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 10));
    store.observeAcceptedTick(midTick(0, '1.08490', 11));
    store.observeAcceptedTick(midTick(0, '1.08410', 12));
    store.observeAcceptedTick(midTick(0, '1.08460', 13));

    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    expect(window.currentCandle).toEqual({
      startTime: 0,
      open: '1.08450',
      high: '1.08490',
      low: '1.08410',
      close: '1.08460',
    });
    // Not deduplicated by timestamp: the watermark advanced across all four.
    expect(window.currentCandleObservedThroughSequence).toBe(13);
  });
});

describe('MemoryMarketHistoryStore — sequence metadata (W3 §9/§18)', () => {
  it('records the accepted sequence window each finalized candle represents', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 90));
    store.observeAcceptedTick(midTick(1, '1.08460', 91));
    store.observeAcceptedTick(midTick(5, '1.08470', 92));
    store.observeAcceptedTick(midTick(10, '1.08480', 93));

    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    expect(window.candles.map((c) => c.startTime)).toEqual([0, 5]);
    // The newest finalized bar (bucket 5) was observed through sequence 92.
    expect(window.finalizedObservedThroughSequence).toBe(92);
    // The current bar (bucket 10) through 93.
    expect(window.currentCandleObservedThroughSequence).toBe(93);
  });

  it('does not require contiguous sequences', async () => {
    const store = makeStore();
    // FcsMarketDataProvider uses Date.now() as its sequence, so gaps are normal
    // and lastSequence + 1 is never a valid assumption (W3 §19).
    store.observeAcceptedTick(midTick(0, '1.08450', 1_700_000_000_123));
    store.observeAcceptedTick(midTick(5, '1.08460', 1_700_000_005_456));

    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    expect(window.finalizedObservedThroughSequence).toBe(1_700_000_000_123);
    expect(window.currentCandleObservedThroughSequence).toBe(1_700_000_005_456);
  });
});

describe('MemoryMarketHistoryStore — historyThrough (W3 §23)', () => {
  it('is the exclusive end of the newest finalized bucket, per timeframe', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 1));
    store.observeAcceptedTick(midTick(65, '1.08460', 2));

    const fiveSeconds = await store.getCandles({
      symbol: 'EURUSD',
      timeframe: '5s',
      limit: 10,
    });
    expect(fiveSeconds.candles.at(-1)?.startTime).toBe(0);
    expect(fiveSeconds.historyThrough).toBe(5);

    const oneMinute = await store.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 10 });
    expect(oneMinute.candles.at(-1)?.startTime).toBe(0);
    expect(oneMinute.historyThrough).toBe(60);
  });

  it('is null when no finalized candle has been observed', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 1));
    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 10 });
    expect(window.candles).toHaveLength(0);
    expect(window.historyThrough).toBeNull();
    expect(window.currentCandle).not.toBeNull();
  });
});

describe('MemoryMarketHistoryStore — retention (W3 §15/§25)', () => {
  it('bounds each key at the configured retention, discarding oldest first', async () => {
    const store = makeStore({ retentionPerKey: 5 });
    // 9 buckets observed (0..40); the last one is still open, so 8 finalize.
    for (let i = 0; i < 9; i += 1) {
      store.observeAcceptedTick(midTick(i * 5, `1.084${String(50 + i).padStart(2, '0')}`, i + 1));
    }

    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 100 });
    expect(window.candles).toHaveLength(5);
    expect(window.candles.map((c) => c.startTime)).toEqual([15, 20, 25, 30, 35]);
    // Retention floor reached: nothing older survives to page back to.
    expect(window.hasMore).toBe(false);
  });

  it('defaults to a documented finite retention', () => {
    expect(SERVER_HISTORY_RETENTION_PER_SYMBOL_TIMEFRAME).toBe(2000);
  });
});

describe('MemoryMarketHistoryStore — pagination (W3 §24/§60)', () => {
  /** 12 finalized 1m candles: buckets 0..660. */
  function seedMinutes(store: MemoryMarketHistoryStore, count: number): void {
    for (let i = 0; i <= count; i += 1) {
      store.observeAcceptedTick(midTick(i * 60, `1.08${String(400 + i).padStart(3, '0')}`, i + 1));
    }
  }

  it('returns the newest page first, then older pages via the cursor, with no overlap', async () => {
    const store = makeStore();
    seedMinutes(store, 12);

    const recent = await store.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 5 });
    expect(recent.candles.map((c) => c.startTime)).toEqual([420, 480, 540, 600, 660]);
    expect(recent.hasMore).toBe(true);
    expect(recent.nextCursor).toBe(420);

    const older = await store.getCandles({
      symbol: 'EURUSD',
      timeframe: '1m',
      limit: 5,
      ...pageBefore(recent.nextCursor),
    });
    expect(older.candles.map((c) => c.startTime)).toEqual([120, 180, 240, 300, 360]);
    expect(older.hasMore).toBe(true);
    expect(older.nextCursor).toBe(120);

    const oldest = await store.getCandles({
      symbol: 'EURUSD',
      timeframe: '1m',
      limit: 5,
      ...pageBefore(older.nextCursor),
    });
    expect(oldest.candles.map((c) => c.startTime)).toEqual([0, 60]);
    expect(oldest.hasMore).toBe(false);

    const allPages = [...oldest.candles, ...older.candles, ...recent.candles].map(
      (c) => c.startTime,
    );
    expect(new Set(allPages).size).toBe(allPages.length);
    expect([...allPages].sort((a, b) => a - b)).toEqual(allPages);
  });

  it('never attaches a current-candle seed to an older page', async () => {
    const store = makeStore();
    seedMinutes(store, 6);

    const recent = await store.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 3 });
    expect(recent.currentCandle).not.toBeNull();
    expect(recent.currentCandleObservedThroughSequence).not.toBeNull();

    const older = await store.getCandles({
      symbol: 'EURUSD',
      timeframe: '1m',
      limit: 3,
      ...pageBefore(recent.nextCursor),
    });
    expect(older.currentCandle).toBeNull();
    expect(older.currentCandleObservedThroughSequence).toBeNull();
  });

  it('returns an empty page past the oldest retained candle', async () => {
    const store = makeStore();
    seedMinutes(store, 2);
    const window = await store.getCandles({
      symbol: 'EURUSD',
      timeframe: '1m',
      limit: 5,
      before: 0,
    });
    expect(window.candles).toHaveLength(0);
    expect(window.hasMore).toBe(false);
    expect(window.nextCursor).toBeNull();
    expect(window.historyThrough).toBeNull();
  });
});

describe('MemoryMarketHistoryStore — symbol isolation', () => {
  it('keeps each symbol’s observation separate', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 1));
    store.observeAcceptedTick(
      tick({ seconds: 0, bid: '1999.99', ask: '2000.01', symbol: 'XAUUSD', sequence: 1 }),
    );
    store.observeAcceptedTick(midTick(5, '1.08460', 2));

    const eurusd = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    const xauusd = await store.getCandles({ symbol: 'XAUUSD', timeframe: '5s', limit: 10 });
    expect(eurusd.candles).toHaveLength(1);
    expect(xauusd.candles).toHaveLength(0);
    expect(xauusd.currentCandle?.open).toBe('2000.00');
  });

  it('is empty, not broken, for a symbol it has never observed', async () => {
    const store = makeStore();
    const window = await store.getCandles({ symbol: 'NAS100', timeframe: '30s', limit: 10 });
    expect(window).toMatchObject({
      candles: [],
      currentCandle: null,
      historyThrough: null,
      hasMore: false,
      nextCursor: null,
      finalizedObservedThroughSequence: null,
      currentCandleObservedThroughSequence: null,
    });
    expect(window.sourceEpoch).toBe(store.sourceEpoch);
  });
});

describe('MemoryMarketHistoryStore — process epoch (W3 §11/§59)', () => {
  it('gives a fresh store a different epoch and no inherited history', async () => {
    const first = makeStore();
    first.observeAcceptedTick(midTick(0, '1.08450', 1));
    first.observeAcceptedTick(midTick(60, '1.08460', 2));
    const before = await first.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 10 });
    expect(before.candles).toHaveLength(1);

    // The test seam for "the process restarted": a new store instance.
    const second = makeStore();
    expect(second.sourceEpoch).not.toBe(first.sourceEpoch);

    const after = await second.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 10 });
    expect(after.candles).toHaveLength(0);
    expect(after.currentCandle).toBeNull();
    expect(after.sourceEpoch).toBe(second.sourceEpoch);
  });

  it('stamps every window with its own epoch', async () => {
    const store = makeStore({ sourceEpoch: 'epoch-under-test' });
    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    expect(window.sourceEpoch).toBe('epoch-under-test');
  });
});

describe('MemoryMarketHistoryStore — defensive boundaries', () => {
  it('ignores a tick for a symbol it has no precision for, without throwing', () => {
    const store = new MemoryMarketHistoryStore({
      pricePrecision: { EURUSD: 5 } as Record<TradableSymbol, number>,
    });
    expect(() => store.observeAcceptedTick(midTick(0, '1.08450', 1))).not.toThrow();
    expect(() =>
      store.observeAcceptedTick(
        tick({ seconds: 0, bid: '1999.99', ask: '2000.01', symbol: 'XAUUSD', sequence: 1 }),
      ),
    ).not.toThrow();
    // One key per (observed symbol, timeframe); derived so adding an interval
    // cannot make this assertion quietly wrong (W5 §10).
    expect(store.stats().keys).toBe(SUPPORTED_CANDLE_TIMEFRAMES.length);
  });

  it('ignores an unparseable timestamp without throwing', () => {
    const store = makeStore();
    expect(() =>
      store.observeAcceptedTick({
        symbol: 'EURUSD',
        bid: '1.08440',
        ask: '1.08460',
        timestamp: 'not-a-date',
        sequence: 1,
        marketStatus: 'open',
      }),
    ).not.toThrow();
    expect(store.stats().storedCandles).toBe(0);
  });

  it('counts rather than mis-attributes an observation older than the open bucket', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(60, '1.08450', 2));
    // MarketTickGate makes this unreachable for accepted ticks; assert the
    // guard rather than trusting the invariant silently.
    store.observeAcceptedTick(midTick(0, '1.09999', 1));

    const window = await store.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 10 });
    // One stale observation per interval whose bucket genuinely moved between
    // the two ticks. At 60 s that is every interval except 3m, which both ticks
    // share — derived rather than hard-coded so a sixth interval cannot make
    // this pass for the wrong reason.
    const expectedStale = SUPPORTED_CANDLE_TIMEFRAMES.filter(
      (tf) => bucketStartSeconds(60_000, tf) > bucketStartSeconds(0, tf),
    ).length;
    expect(expectedStale).toBe(4);
    expect(store.stats().staleObservations).toBe(expectedStale);
    expect(window.currentCandle?.high).toBe('1.08450');
  });

  it('never hands out its internal arrays', async () => {
    const store = makeStore();
    store.observeAcceptedTick(midTick(0, '1.08450', 1));
    store.observeAcceptedTick(midTick(60, '1.08460', 2));

    const first = await store.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 10 });
    first.candles.length = 0;
    const second = await store.getCandles({ symbol: 'EURUSD', timeframe: '1m', limit: 10 });
    expect(second.candles).toHaveLength(1);
  });
});
