import { beforeEach, describe, expect, it } from 'vitest';
import type {
  MarketCandle,
  MarketHistoryErrorMessage,
  MarketHistoryRequest,
  MarketHistoryResult,
  MarketTick,
  TradableSymbol,
} from '@wariba/contracts';
import { createTickStore, type TickStore } from '../app/(trade)/trade/tick-store';
import {
  CLIENT_HISTORY_HYDRATION_TICK_BUFFER_MAX,
  createChartHistoryController,
  type ChartHistoryController,
} from '../app/(trade)/trade/chart-history';

/**
 * W3 B5-B7 — the browser's history/live stitch.
 *
 * The properties under test are the ones that cannot be eyeballed in a browser:
 * that no accepted tick is lost between "history was built" and "live took
 * over", that a same-second tick is not silently deduplicated, that a late
 * response for a symbol the trader has already left cannot touch the chart, and
 * that a restarted server cannot be spliced onto the old series as if the gap
 * had not happened.
 */

const PRECISION = 5;

interface FakeTransport {
  requests: MarketHistoryRequest[];
  request(request: MarketHistoryRequest): void;
  onResult(listener: (result: MarketHistoryResult) => void): () => void;
  onError(listener: (error: MarketHistoryErrorMessage) => void): () => void;
  onSocketOpen(listener: () => void): () => void;
  deliver(result: MarketHistoryResult): void;
  deliverError(error: MarketHistoryErrorMessage): void;
  reopenSocket(): void;
  lastRequestId(): string;
  requestIdAt(index: number): string;
}

function fakeTransport(): FakeTransport {
  const requests: MarketHistoryRequest[] = [];
  const resultListeners = new Set<(result: MarketHistoryResult) => void>();
  const errorListeners = new Set<(error: MarketHistoryErrorMessage) => void>();
  const openListeners = new Set<() => void>();
  return {
    requests,
    request: (request) => requests.push(request),
    onResult(listener) {
      resultListeners.add(listener);
      return () => resultListeners.delete(listener);
    },
    onError(listener) {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    onSocketOpen(listener) {
      openListeners.add(listener);
      return () => openListeners.delete(listener);
    },
    deliver: (result) => resultListeners.forEach((l) => l(result)),
    deliverError: (error) => errorListeners.forEach((l) => l(error)),
    reopenSocket: () => openListeners.forEach((l) => l()),
    lastRequestId: () => requests[requests.length - 1]?.requestId ?? '',
    requestIdAt: (index) => requests[index]?.requestId ?? '',
  };
}

interface SinkLog {
  setData: MarketCandle[][];
  update: MarketCandle[];
  fitContentCalls: number;
  /** W5 §21 — one entry per older-page prepend, with the shift the renderer was told to apply. */
  prepend: { candles: MarketCandle[]; prependedCount: number }[];
  visibleTimeRanges: { from: number; to: number }[];
}

function fakeSink(log: SinkLog) {
  return {
    setData: (candles: readonly MarketCandle[]) => log.setData.push([...candles]),
    update: (candle: MarketCandle) => log.update.push(candle),
    fitContent: () => {
      log.fitContentCalls += 1;
    },
    prepend: (candles: readonly MarketCandle[], prependedCount: number) =>
      log.prepend.push({ candles: [...candles], prependedCount }),
    setVisibleTimeRange: (range: { from: number; to: number }) => log.visibleTimeRanges.push(range),
  };
}

function candle(startTime: number, overrides: Partial<MarketCandle> = {}): MarketCandle {
  return {
    startTime,
    open: '1.08450',
    high: '1.08460',
    low: '1.08440',
    close: '1.08455',
    ...overrides,
  };
}

function result(
  overrides: Partial<MarketHistoryResult> & { requestId: string },
): MarketHistoryResult {
  const candles = overrides.candles ?? [];
  const newest = candles.at(-1);
  return {
    symbol: 'EURUSD',
    timeframe: '1m',
    source: 'observed_memory_cache',
    sourceEpoch: 'epoch-a',
    priceBasis: 'mid',
    currentCandle: null,
    finalizedObservedThroughSequence: null,
    currentCandleObservedThroughSequence: null,
    historyThrough: newest === undefined ? null : newest.startTime + 60,
    hasMore: false,
    nextCursor: candles[0]?.startTime ?? null,
    ...overrides,
    candles,
  };
}

/** A tick whose mid is exactly `mid` at precision 5. */
function tick(params: {
  seconds: number;
  mid: string;
  sequence: number;
  symbol?: TradableSymbol;
}): MarketTick {
  const value = Number(params.mid);
  return {
    symbol: params.symbol ?? 'EURUSD',
    bid: (value - 0.00001).toFixed(5),
    ask: (value + 0.00001).toFixed(5),
    timestamp: new Date(params.seconds * 1000).toISOString(),
    sequence: params.sequence,
    marketStatus: 'open',
  };
}

let store: TickStore;
let transport: FakeTransport;
let log: SinkLog;
let controller: ChartHistoryController;
let requestCounter: number;

function build(options: { bufferMax?: number } = {}): void {
  store = createTickStore();
  transport = fakeTransport();
  log = { setData: [], update: [], fitContentCalls: 0, prepend: [], visibleTimeRanges: [] };
  requestCounter = 0;
  controller = createChartHistoryController({
    transport,
    ticks: store,
    sink: fakeSink(log),
    newRequestId: () => `req-${++requestCounter}`,
    ...(options.bufferMax === undefined ? {} : { bufferMax: options.bufferMax }),
  });
}

function startEurusd1m(): void {
  controller.start({ symbol: 'EURUSD', timeframe: '1m', pricePrecision: PRECISION });
}

beforeEach(() => {
  build();
});

describe('subscribe-then-request order (W3 §32)', () => {
  it('is subscribed to accepted ticks before the request goes out', () => {
    let subscribedBeforeRequest = false;
    const probe: TickStore = {
      ...createTickStore(),
      subscribeTickEvents: (symbol, listener) => {
        subscribedBeforeRequest = transport.requests.length === 0;
        return store.subscribeTickEvents(symbol, listener);
      },
    };
    const local = createChartHistoryController({
      transport,
      ticks: probe,
      sink: fakeSink(log),
      newRequestId: () => 'req-probe',
    });
    local.start({ symbol: 'EURUSD', timeframe: '1m', pricePrecision: PRECISION });

    expect(subscribedBeforeRequest).toBe(true);
    expect(transport.requests).toHaveLength(1);
    local.dispose();
  });

  it('reports loading while the request is in flight', () => {
    startEurusd1m();
    expect(controller.snapshot().status).toBe('loading');
  });

  it('requests the bounded initial limit for the selected symbol and timeframe', () => {
    controller.start({ symbol: 'XAUUSD', timeframe: '5m', pricePrecision: 2 });
    expect(transport.requests[0]).toMatchObject({ symbol: 'XAUUSD', timeframe: '5m', limit: 400 });
  });
});

describe('sequence cutover (W3 §37/§62)', () => {
  it('replays only the buffered ticks the server had not represented', () => {
    startEurusd1m();

    // Live ticks arrive while hydration is in flight.
    store.update(tick({ seconds: 60, mid: '1.08500', sequence: 100 }));
    store.update(tick({ seconds: 60, mid: '1.08520', sequence: 101 }));
    store.update(tick({ seconds: 60, mid: '1.08600', sequence: 102 }));

    // The server's snapshot already folded in 100 and 101.
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(0)],
        currentCandle: {
          startTime: 60,
          open: '1.08500',
          high: '1.08520',
          low: '1.08500',
          close: '1.08520',
        },
        finalizedObservedThroughSequence: 99,
        currentCandleObservedThroughSequence: 101,
      }),
    );

    // Exactly tick 102 replays: not all three (which would double-count 100/101
    // into the high) and not none (which would lose 1.08600 entirely).
    expect(controller.series().current).toEqual({
      startTime: 60,
      open: '1.08500',
      high: '1.08600',
      low: '1.08500',
      close: '1.08600',
    });
  });

  it('replays nothing when the server already represented every buffered tick', () => {
    startEurusd1m();
    store.update(tick({ seconds: 60, mid: '1.08500', sequence: 100 }));

    const seeded = candle(60, { high: '1.08500', close: '1.08500' });
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(0)],
        currentCandle: seeded,
        finalizedObservedThroughSequence: 99,
        currentCandleObservedThroughSequence: 100,
      }),
    );

    expect(controller.series().current).toEqual(seeded);
  });

  it('replays the whole buffer when the server represented nothing', () => {
    startEurusd1m();
    store.update(tick({ seconds: 0, mid: '1.08450', sequence: 1 }));
    store.update(tick({ seconds: 10, mid: '1.08490', sequence: 2 }));
    store.update(tick({ seconds: 20, mid: '1.08410', sequence: 3 }));

    transport.deliver(result({ requestId: transport.lastRequestId() }));

    expect(controller.series().current).toEqual({
      startTime: 0,
      open: '1.08450',
      high: '1.08490',
      low: '1.08410',
      close: '1.08410',
    });
    expect(controller.snapshot().status).toBe('empty');
  });

  it('uses the finalized watermark when there is no current-candle seed', () => {
    startEurusd1m();
    store.update(tick({ seconds: 60, mid: '1.08500', sequence: 50 }));
    store.update(tick({ seconds: 60, mid: '1.08700', sequence: 51 }));

    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(0)],
        finalizedObservedThroughSequence: 50,
      }),
    );

    // The first replayed tick opens the bucket (W3 §39).
    expect(controller.series().current).toEqual({
      startTime: 60,
      open: '1.08700',
      high: '1.08700',
      low: '1.08700',
      close: '1.08700',
    });
  });
});

describe('current-candle seed (W3 §38/§63)', () => {
  it('keeps the pre-mount open, high and low and continues from the live tick', () => {
    startEurusd1m();

    // The browser was not there for ticks 90-92; the server was.
    // 90 opened the bucket, 91 set the high, 92 set the low.
    const seeded: MarketCandle = {
      startTime: 60,
      open: '1.08450',
      high: '1.08900',
      low: '1.08100',
      close: '1.08300',
    };

    // Tick 93 arrives during hydration.
    store.update(tick({ seconds: 90, mid: '1.08500', sequence: 93 }));

    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(0)],
        currentCandle: seeded,
        finalizedObservedThroughSequence: 89,
        currentCandleObservedThroughSequence: 92,
      }),
    );

    expect(controller.series().current).toEqual({
      startTime: 60,
      open: '1.08450', // from tick 90 — unrecoverable from any post-mount tick
      high: '1.08900', // from tick 91
      low: '1.08100', // from tick 92
      close: '1.08500', // from tick 93
    });
  });

  it('does not re-derive the current open from the first post-mount tick', () => {
    startEurusd1m();
    store.update(tick({ seconds: 90, mid: '1.09999', sequence: 93 }));

    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [],
        currentCandle: candle(60, { open: '1.08450' }),
        currentCandleObservedThroughSequence: 92,
      }),
    );

    expect(controller.series().current?.open).toBe('1.08450');
  });

  it('renders the seed after the finalized series in one setData', () => {
    startEurusd1m();

    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(0), candle(60)],
        currentCandle: candle(120),
        finalizedObservedThroughSequence: 5,
        currentCandleObservedThroughSequence: 6,
      }),
    );

    // One whole-series write, seed last (W3 §42).
    expect(log.setData.at(-1)?.map((c) => c.startTime)).toEqual([0, 60, 120]);
    // ...and the historical array itself stays finalized-only.
    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([0, 60]);
  });
});

describe('same-second ticks are not deduplicated (W3 §47/§64)', () => {
  it('lets every accepted tick in one second contribute after cutover', () => {
    startEurusd1m();

    store.update(tick({ seconds: 30, mid: '1.08500', sequence: 10 }));
    store.update(tick({ seconds: 30, mid: '1.08900', sequence: 11 }));
    store.update(tick({ seconds: 30, mid: '1.08100', sequence: 12 }));
    store.update(tick({ seconds: 30, mid: '1.08400', sequence: 13 }));

    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        currentCandleObservedThroughSequence: null,
        finalizedObservedThroughSequence: null,
      }),
    );

    expect(controller.series().current).toEqual({
      startTime: 0,
      open: '1.08500',
      high: '1.08900',
      low: '1.08100',
      close: '1.08400',
    });
  });

  it('cuts over mid-second by sequence, not by timestamp', () => {
    startEurusd1m();
    // All four share timestamp second 30; the server saw the first two.
    store.update(tick({ seconds: 30, mid: '1.08500', sequence: 10 }));
    store.update(tick({ seconds: 30, mid: '1.08900', sequence: 11 }));
    store.update(tick({ seconds: 30, mid: '1.08100', sequence: 12 }));
    store.update(tick({ seconds: 30, mid: '1.08400', sequence: 13 }));

    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        currentCandle: {
          startTime: 0,
          open: '1.08500',
          high: '1.08900',
          low: '1.08500',
          close: '1.08900',
        },
        currentCandleObservedThroughSequence: 11,
      }),
    );

    // 12 and 13 replay; 10 and 11 do not, so the low comes from 12 exactly once.
    expect(controller.series().current).toEqual({
      startTime: 0,
      open: '1.08500',
      high: '1.08900',
      low: '1.08100',
      close: '1.08400',
    });
  });
});

describe('live continuation (W3 §41/§42)', () => {
  it('writes one incremental update per accepted tick, never a whole series', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));
    const setDataCalls = log.setData.length;

    store.update(tick({ seconds: 60, mid: '1.08500', sequence: 1 }));
    store.update(tick({ seconds: 61, mid: '1.08510', sequence: 2 }));

    expect(log.setData).toHaveLength(setDataCalls);
    expect(log.update.length).toBeGreaterThanOrEqual(2);
  });

  it('finalizes locally observed buckets and leaves the empty state', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId() }));
    expect(controller.snapshot().status).toBe('empty');

    store.update(tick({ seconds: 0, mid: '1.08450', sequence: 1 }));
    store.update(tick({ seconds: 60, mid: '1.08500', sequence: 2 }));

    expect(controller.snapshot().status).toBe('ready');
    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([0]);
  });

  it('fits content once per identity, never per tick', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));
    expect(log.fitContentCalls).toBe(1);

    for (let i = 1; i <= 5; i += 1) {
      store.update(tick({ seconds: 60 + i, mid: '1.08500', sequence: i }));
    }
    expect(log.fitContentCalls).toBe(1);

    controller.start({ symbol: 'XAUUSD', timeframe: '1m', pricePrecision: 2 });
    transport.deliver(
      result({ requestId: transport.lastRequestId(), symbol: 'XAUUSD', candles: [candle(0)] }),
    );
    expect(log.fitContentCalls).toBe(2);
  });

  it('ignores a tick for a symbol that is not selected', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));

    store.update(tick({ seconds: 60, mid: '2000.00', sequence: 1, symbol: 'XAUUSD' }));

    expect(controller.series().current).toBeNull();
  });
});

describe('symbol switch race (W3 §45)', () => {
  it('ignores a late response for the symbol the trader has left', () => {
    startEurusd1m();
    const staleRequestId = transport.lastRequestId();

    controller.start({ symbol: 'XAUUSD', timeframe: '1m', pricePrecision: 2 });
    const activeRequestId = transport.lastRequestId();
    const setDataCallsBefore = log.setData.length;
    const fitBefore = log.fitContentCalls;

    // The EURUSD response finally arrives.
    transport.deliver(
      result({
        requestId: staleRequestId,
        symbol: 'EURUSD',
        candles: [candle(0), candle(60)],
        currentCandle: candle(120),
        finalizedObservedThroughSequence: 5,
        currentCandleObservedThroughSequence: 6,
      }),
    );

    // No data, no error, no viewport move, no state change.
    expect(log.setData).toHaveLength(setDataCallsBefore);
    expect(log.fitContentCalls).toBe(fitBefore);
    expect(controller.snapshot().status).toBe('loading');
    expect(controller.series().finalized).toEqual([]);

    // ...and the active symbol still hydrates normally afterwards.
    transport.deliver(
      result({ requestId: activeRequestId, symbol: 'XAUUSD', candles: [candle(0)] }),
    );
    expect(controller.snapshot().status).toBe('ready');
    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([0]);
  });

  it('does not show the stale response’s error either', () => {
    startEurusd1m();
    const staleRequestId = transport.lastRequestId();
    controller.start({ symbol: 'XAUUSD', timeframe: '1m', pricePrecision: 2 });

    transport.deliverError({
      requestId: staleRequestId,
      code: 'unavailable',
      message: 'Historique indisponible.',
    });

    expect(controller.snapshot().status).toBe('loading');
  });

  it('clears the renderer on switch so a late response has nothing to land on', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));

    controller.start({ symbol: 'XAUUSD', timeframe: '1m', pricePrecision: 2 });

    expect(log.setData.at(-1)).toEqual([]);
    expect(controller.series().finalized).toEqual([]);
  });

  it('drops buffered ticks from the previous symbol', () => {
    startEurusd1m();
    store.update(tick({ seconds: 0, mid: '1.08450', sequence: 1 }));

    controller.start({ symbol: 'XAUUSD', timeframe: '1m', pricePrecision: 2 });
    transport.deliver(result({ requestId: transport.lastRequestId(), symbol: 'XAUUSD' }));

    expect(controller.series().current).toBeNull();
  });
});

describe('timeframe switch race (W3 §46)', () => {
  it('cannot let late interval results mutate the active 1m chart', () => {
    startEurusd1m();
    const oneMinuteRequest = transport.lastRequestId();

    controller.start({ symbol: 'EURUSD', timeframe: '5m', pricePrecision: PRECISION });
    const thirtySecondRequest = transport.lastRequestId();

    controller.start({ symbol: 'EURUSD', timeframe: '1m', pricePrecision: PRECISION });
    const fiveSecondRequest = transport.lastRequestId();

    transport.deliver(
      result({ requestId: oneMinuteRequest, timeframe: '1m', candles: [candle(0), candle(60)] }),
    );
    transport.deliver(
      result({
        requestId: thirtySecondRequest,
        timeframe: '5m',
        candles: [candle(0), candle(300)],
        historyThrough: 600,
      }),
    );

    expect(controller.series().finalized).toEqual([]);
    expect(controller.snapshot().status).toBe('loading');

    transport.deliver(
      result({
        requestId: fiveSecondRequest,
        timeframe: '1m',
        candles: [candle(0), candle(60)],
        historyThrough: 120,
      }),
    );
    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([0, 60]);
  });

  it('buckets live ticks at the newly selected timeframe', () => {
    controller.start({ symbol: 'EURUSD', timeframe: '1m', pricePrecision: PRECISION });
    transport.deliver(result({ requestId: transport.lastRequestId(), timeframe: '1m' }));

    store.update(tick({ seconds: 67, mid: '1.08450', sequence: 1 }));

    expect(controller.series().current?.startTime).toBe(60);
  });
});

describe('response validation (W3 §34/§67)', () => {
  it('counts genuine missing buckets instead of hiding them', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(0), candle(120), candle(180)],
        historyThrough: 240,
      }),
    );

    expect(controller.snapshot()).toMatchObject({ status: 'ready', gapsDetected: 1 });
  });

  it('rejects a mismatched symbol on an otherwise current requestId', () => {
    startEurusd1m();
    transport.deliver(
      result({ requestId: transport.lastRequestId(), symbol: 'XAUUSD', candles: [candle(0)] }),
    );
    expect(controller.series().finalized).toEqual([]);
    expect(controller.snapshot().status).toBe('loading');
  });

  it('fails the chart, without repairing, on a non-ascending series', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60), candle(0)],
        historyThrough: 60,
        nextCursor: 60,
      }),
    );
    expect(controller.snapshot().status).toBe('error');
    expect(controller.series().finalized).toEqual([]);
  });

  it('fails the chart on an incoherent candle', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(0, { high: '1.08400', low: '1.08500' })],
      }),
    );
    expect(controller.snapshot().status).toBe('error');
  });

  it('fails the chart on a misaligned bucket', () => {
    startEurusd1m();
    transport.deliver(
      result({ requestId: transport.lastRequestId(), candles: [candle(30)], historyThrough: 90 }),
    );
    expect(controller.snapshot().status).toBe('error');
  });

  it('surfaces a correlated server error', () => {
    startEurusd1m();
    transport.deliverError({
      requestId: transport.lastRequestId(),
      code: 'unavailable',
      message: 'Historique indisponible.',
    });
    expect(controller.snapshot()).toMatchObject({ status: 'error', errorReason: 'unavailable' });
  });
});

describe('hydration buffer bound (W3 §33)', () => {
  it('publishes a finite bound', () => {
    expect(CLIENT_HISTORY_HYDRATION_TICK_BUFFER_MAX).toBe(500);
  });

  it('fails the hydration rather than silently discarding accepted ticks', () => {
    build({ bufferMax: 3 });
    startEurusd1m();

    for (let i = 1; i <= 4; i += 1) {
      store.update(tick({ seconds: i, mid: '1.08450', sequence: i }));
    }

    expect(controller.snapshot().status).toBe('error');
    expect(controller.snapshot().errorReason).toContain('buffer exceeded');
  });

  it('ignores the response for a hydration that already failed on overflow', () => {
    build({ bufferMax: 2 });
    startEurusd1m();
    const requestId = transport.lastRequestId();
    for (let i = 1; i <= 3; i += 1) {
      store.update(tick({ seconds: i, mid: '1.08450', sequence: i }));
    }

    transport.deliver(result({ requestId, candles: [candle(0)] }));

    expect(controller.snapshot().status).toBe('error');
    expect(controller.series().finalized).toEqual([]);
  });
});

describe('reconnect on the same epoch (W3 §36/§49)', () => {
  it('backfills the finalized candles observed during the disconnect', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(0), candle(60)],
        finalizedObservedThroughSequence: 10,
      }),
    );
    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([0, 60]);

    transport.reopenSocket();
    expect(transport.requests).toHaveLength(2);

    // The server kept observing: two more buckets closed while we were away.
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60), candle(120), candle(180)],
        currentCandle: candle(240),
        finalizedObservedThroughSequence: 40,
        currentCandleObservedThroughSequence: 41,
      }),
    );

    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([0, 60, 120, 180]);
    expect(controller.series().current?.startTime).toBe(240);
    expect(controller.snapshot().sourceEpoch).toBe('epoch-a');
  });

  it('does not duplicate a candle present on both sides of the merge', () => {
    startEurusd1m();
    transport.deliver(
      result({ requestId: transport.lastRequestId(), candles: [candle(0), candle(60)] }),
    );

    transport.reopenSocket();
    transport.deliver(
      result({ requestId: transport.lastRequestId(), candles: [candle(0), candle(60)] }),
    );

    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([0, 60]);
  });

  it('replaces the current candle from the authoritative server seed', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        currentCandle: candle(0, { close: '1.08455' }),
        currentCandleObservedThroughSequence: 5,
      }),
    );

    transport.reopenSocket();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        currentCandle: candle(0, { high: '1.08999', close: '1.08800' }),
        currentCandleObservedThroughSequence: 30,
      }),
    );

    expect(controller.series().current).toEqual(candle(0, { high: '1.08999', close: '1.08800' }));
  });

  it('does not move the viewport on a reconnect rehydration', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));
    expect(log.fitContentCalls).toBe(1);

    transport.reopenSocket();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));

    expect(log.fitContentCalls).toBe(1);
  });

  it('replays only post-response buffered ticks after the reconnect', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId() }));

    transport.reopenSocket();
    store.update(tick({ seconds: 0, mid: '1.08500', sequence: 70 }));
    store.update(tick({ seconds: 0, mid: '1.08900', sequence: 71 }));

    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        currentCandle: {
          startTime: 0,
          open: '1.08450',
          high: '1.08500',
          low: '1.08450',
          close: '1.08500',
        },
        currentCandleObservedThroughSequence: 70,
      }),
    );

    expect(controller.series().current).toEqual({
      startTime: 0,
      open: '1.08450',
      high: '1.08900',
      low: '1.08450',
      close: '1.08900',
    });
  });
});

describe('reconnect onto a new epoch (W3 §35/§50/§51)', () => {
  it('discards the old process-memory series and leaves an honest gap', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        sourceEpoch: 'epoch-a',
        candles: [candle(0), candle(60), candle(120)],
      }),
    );
    expect(controller.series().finalized).toHaveLength(3);

    transport.reopenSocket();
    // The realtime process restarted: new epoch, and it has only just started
    // observing, so it holds nothing from before.
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        sourceEpoch: 'epoch-b',
        candles: [],
        currentCandle: candle(600),
        currentCandleObservedThroughSequence: 2,
      }),
    );

    // No fabricated bars bridging 120 -> 600, and no old candles kept as if the
    // new process had certified them.
    expect(controller.series().finalized).toEqual([]);
    expect(controller.series().current?.startTime).toBe(600);
    expect(controller.snapshot().sourceEpoch).toBe('epoch-b');
    expect(controller.snapshot().status).toBe('empty');
  });

  it('installs whatever the new epoch genuinely has', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        sourceEpoch: 'epoch-a',
        candles: [candle(0)],
      }),
    );

    transport.reopenSocket();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        sourceEpoch: 'epoch-b',
        candles: [candle(600), candle(660)],
        historyThrough: 720,
        nextCursor: 600,
      }),
    );

    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([600, 660]);
  });

  it('keeps the new epoch authoritative when a late old-epoch response arrives (W3 §65)', () => {
    startEurusd1m();
    const epochARequest = transport.lastRequestId();
    transport.deliver(
      result({ requestId: epochARequest, sourceEpoch: 'epoch-a', candles: [candle(0)] }),
    );

    transport.reopenSocket();
    const epochBRequest = transport.lastRequestId();
    transport.deliver(
      result({
        requestId: epochBRequest,
        sourceEpoch: 'epoch-b',
        candles: [candle(600)],
        historyThrough: 660,
        nextCursor: 600,
      }),
    );
    expect(controller.snapshot().sourceEpoch).toBe('epoch-b');

    // A second, even later epoch-A response for the already-answered request.
    transport.deliver(
      result({
        requestId: epochARequest,
        sourceEpoch: 'epoch-a',
        candles: [candle(0), candle(60)],
      }),
    );

    expect(controller.snapshot().sourceEpoch).toBe('epoch-b');
    expect(controller.series().finalized.map((c) => c.startTime)).toEqual([600]);
  });

  it('never compares sequences across epochs', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        sourceEpoch: 'epoch-a',
        currentCandle: candle(0),
        currentCandleObservedThroughSequence: 5_000_000,
      }),
    );

    transport.reopenSocket();
    // A restarted mock provider begins its per-symbol sequence again at 1.
    store.update(tick({ seconds: 600, mid: '1.08500', sequence: 2 }));
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        sourceEpoch: 'epoch-b',
        currentCandle: {
          startTime: 600,
          open: '1.08450',
          high: '1.08450',
          low: '1.08450',
          close: '1.08450',
        },
        currentCandleObservedThroughSequence: 1,
      }),
    );

    // Tick 2 must replay. Comparing it against epoch A's 5,000,000 watermark
    // would have discarded it.
    expect(controller.series().current?.close).toBe('1.08500');
  });
});

describe('merge conflict handling (W3 §66)', () => {
  it('rehydrates instead of last-write-wins, then accepts the fresh snapshot', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60, { high: '1.08460' })],
        historyThrough: 120,
        nextCursor: 60,
      }),
    );

    transport.reopenSocket();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60, { high: '1.08999' })],
        historyThrough: 120,
        nextCursor: 60,
      }),
    );

    // Local series thrown away and a controlled rehydrate issued.
    expect(transport.requests).toHaveLength(3);
    expect(controller.snapshot().status).toBe('loading');

    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60, { high: '1.08999' })],
        historyThrough: 120,
        nextCursor: 60,
      }),
    );
    expect(controller.series().finalized).toEqual([candle(60, { high: '1.08999' })]);
    expect(controller.snapshot().status).toBe('ready');
  });

  it('gives up honestly if the conflict repeats', () => {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60, { high: '1.08460' })],
        historyThrough: 120,
        nextCursor: 60,
      }),
    );

    transport.reopenSocket();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60, { high: '1.08999' })],
        historyThrough: 120,
        nextCursor: 60,
      }),
    );
    // The rehydrate lands, then a further reconnect conflicts again.
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60, { high: '1.08999' })],
        historyThrough: 120,
        nextCursor: 60,
      }),
    );
    transport.reopenSocket();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60, { high: '1.08111' })],
        historyThrough: 120,
        nextCursor: 60,
      }),
    );
    transport.reopenSocket();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(60, { high: '1.08222' })],
        historyThrough: 120,
        nextCursor: 60,
      }),
    );

    expect(controller.snapshot().status).toBe('error');
  });
});

describe('snapshot identity (W3 §76)', () => {
  it('does not notify subscribers on every tick', () => {
    let notifications = 0;
    const off = controller.subscribe(() => {
      notifications += 1;
    });
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));
    const afterHydration = notifications;

    for (let i = 1; i <= 20; i += 1) {
      store.update(tick({ seconds: 60 + i, mid: '1.08500', sequence: i }));
    }

    expect(notifications).toBe(afterHydration);
    off();
  });

  it('returns a stable snapshot object while nothing changes', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));
    const first = controller.snapshot();
    store.update(tick({ seconds: 60, mid: '1.08500', sequence: 1 }));
    expect(controller.snapshot()).toBe(first);
  });
});

describe('lifecycle', () => {
  it('detaches from ticks and forgets the series on stop', () => {
    startEurusd1m();
    transport.deliver(result({ requestId: transport.lastRequestId(), candles: [candle(0)] }));

    controller.stop();
    store.update(tick({ seconds: 60, mid: '1.08500', sequence: 1 }));

    expect(controller.snapshot().status).toBe('idle');
    expect(controller.series().finalized).toEqual([]);
    expect(controller.series().current).toBeNull();
  });

  it('does not rehydrate after stop when the socket reopens', () => {
    startEurusd1m();
    controller.stop();
    transport.reopenSocket();
    expect(transport.requests).toHaveLength(1);
  });

  it('stops responding to the transport after dispose', () => {
    startEurusd1m();
    const requestId = transport.lastRequestId();
    controller.dispose();
    transport.deliver(result({ requestId, candles: [candle(0)] }));
    expect(controller.series().finalized).toEqual([]);
  });
});

/**
 * W5 B3 — automatic pan-left backfill (§17-§23, §95-§97).
 *
 * The properties under test are the ones a browser cannot show you: that
 * dragging left for a second produces one request rather than sixty, that the
 * renderer is told exactly how far to shift so the candle under the cursor stays
 * put, and that a page requested from a process that has since restarted cannot
 * be spliced onto the process that replaced it.
 */
describe('older-history backfill (W5 §17-§23)', () => {
  /** Hydrates 1m EURUSD with `count` finalized candles ending at `newestStart`. */
  function hydrate(params: { count: number; newestStart: number; hasMore: boolean }): void {
    const candles = Array.from({ length: params.count }, (_, index) =>
      candle(params.newestStart - (params.count - 1 - index) * 60),
    );
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles,
        hasMore: params.hasMore,
        nextCursor: candles[0]?.startTime ?? null,
      }),
    );
  }

  it('requests one older page when the pan reaches the left edge', () => {
    hydrate({ count: 10, newestStart: 600, hasMore: true });
    const before = transport.requests.length;

    controller.maybeRequestOlder(3);

    expect(transport.requests).toHaveLength(before + 1);
    const request = transport.requests.at(-1);
    // Exclusive cursor = the oldest candle the chart holds (600 - 9 × 60).
    expect(request?.before).toBe(60);
    expect(request?.timeframe).toBe('1m');
    expect(request?.symbol).toBe('EURUSD');
  });

  it('does not request while the viewport is still far from the oldest bar', () => {
    hydrate({ count: 10, newestStart: 600, hasMore: true });
    const before = transport.requests.length;
    controller.maybeRequestOlder(500);
    expect(transport.requests).toHaveLength(before);
  });

  it('stops at the retention floor rather than asking past it (§23)', () => {
    hydrate({ count: 10, newestStart: 600, hasMore: false });
    const before = transport.requests.length;

    controller.maybeRequestOlder(0);

    expect(transport.requests).toHaveLength(before);
    expect(controller.snapshot().hasMoreOlder).toBe(false);
  });

  it('allows exactly one request in flight however hard the trader drags (§19/§96)', () => {
    hydrate({ count: 10, newestStart: 600, hasMore: true });
    const before = transport.requests.length;

    for (let attempt = 0; attempt < 40; attempt += 1) controller.maybeRequestOlder(2);

    expect(transport.requests).toHaveLength(before + 1);
    expect(controller.snapshot().backfilling).toBe(true);

    // Once the page lands, the next threshold crossing may fetch the next page.
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(-120), candle(-60)],
        hasMore: true,
        nextCursor: -120,
        historyThrough: 0,
      }),
    );
    expect(controller.snapshot().backfilling).toBe(false);

    controller.maybeRequestOlder(2);
    expect(transport.requests).toHaveLength(before + 2);
    expect(transport.requests.at(-1)?.before).toBe(-120);
  });

  it('prepends without duplicating a candle both pages contain (§20/§95)', () => {
    hydrate({ count: 3, newestStart: 120, hasMore: true });
    controller.maybeRequestOlder(1);
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        // -60 is new; 0 is a candle the chart already holds, unchanged.
        candles: [candle(-60), candle(0)],
        hasMore: true,
        nextCursor: -60,
        historyThrough: 60,
      }),
    );

    expect(controller.series().finalized.map((entry) => entry.startTime)).toEqual([
      -60, 0, 60, 120,
    ]);
  });

  it('tells the renderer exactly how many bars to shift by (§21)', () => {
    hydrate({ count: 3, newestStart: 120, hasMore: true });
    controller.maybeRequestOlder(1);
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(-180), candle(-120), candle(-60), candle(0)],
        hasMore: true,
        nextCursor: -180,
        historyThrough: 60,
      }),
    );

    const prepend = log.prepend.at(-1);
    // Three genuinely older bars; the fourth (`0`) deduplicated and shifts nothing.
    expect(prepend?.prependedCount).toBe(3);
    expect(prepend?.candles.map((entry) => entry.startTime)).toEqual([-180, -120, -60, 0, 60, 120]);
  });

  it('never refits the viewport on a prepend (§21)', () => {
    hydrate({ count: 3, newestStart: 120, hasMore: true });
    const fits = log.fitContentCalls;

    controller.maybeRequestOlder(1);
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: [candle(-60)],
        hasMore: true,
        nextCursor: -60,
        historyThrough: 0,
      }),
    );

    expect(log.fitContentCalls).toBe(fits);
    // One prepend, not one setData per incoming candle (§75).
    expect(log.prepend).toHaveLength(1);
  });

  it('ignores an older page produced by a different source epoch (§22/§97)', () => {
    hydrate({ count: 3, newestStart: 120, hasMore: true });
    controller.maybeRequestOlder(1);
    const staleRequestId = transport.lastRequestId();

    // The realtime process restarts and the chart rehydrates onto epoch B.
    transport.reopenSocket();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        sourceEpoch: 'epoch-b',
        candles: [candle(600)],
        historyThrough: 660,
        nextCursor: 600,
      }),
    );
    const afterReset = controller.series().finalized.map((entry) => entry.startTime);

    // Epoch A's older page finally arrives.
    transport.deliver(
      result({
        requestId: staleRequestId,
        sourceEpoch: 'epoch-a',
        candles: [candle(-60), candle(-120)].sort((a, b) => a.startTime - b.startTime),
        hasMore: true,
        nextCursor: -120,
        historyThrough: 0,
      }),
    );

    expect(controller.series().finalized.map((entry) => entry.startTime)).toEqual(afterReset);
    expect(controller.snapshot().sourceEpoch).toBe('epoch-b');
  });

  it('ignores an older page for a timeframe the trader has already left (§19)', () => {
    hydrate({ count: 3, newestStart: 120, hasMore: true });
    controller.maybeRequestOlder(1);
    const staleRequestId = transport.lastRequestId();

    controller.start({ symbol: 'EURUSD', timeframe: '3m', pricePrecision: PRECISION });
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        timeframe: '3m',
        candles: [candle(0), candle(180)],
        historyThrough: 360,
        nextCursor: 0,
      }),
    );
    const after3m = controller.series().finalized.map((entry) => entry.startTime);

    transport.deliver(
      result({
        requestId: staleRequestId,
        candles: [candle(-60)],
        nextCursor: -60,
        historyThrough: 0,
      }),
    );

    expect(controller.series().finalized.map((entry) => entry.startTime)).toEqual(after3m);
  });

  it('keeps the chart intact when an older page fails (§19)', () => {
    hydrate({ count: 3, newestStart: 120, hasMore: true });
    controller.maybeRequestOlder(1);

    transport.deliverError({
      requestId: transport.lastRequestId(),
      code: 'unavailable',
      message: 'Historique indisponible.',
    });

    expect(controller.snapshot().status).toBe('ready');
    expect(controller.series().finalized).toHaveLength(3);
    expect(controller.snapshot().backfilling).toBe(false);
  });

  it('does not paginate while a hydration is still in flight', () => {
    startEurusd1m();
    const before = transport.requests.length;
    controller.maybeRequestOlder(0);
    expect(transport.requests).toHaveLength(before);
  });
});

describe('WX2 range and viewport restoration', () => {
  function hydrateWindow(starts: readonly number[], options: { hasMore?: boolean } = {}): void {
    startEurusd1m();
    transport.deliver(
      result({
        requestId: transport.lastRequestId(),
        candles: starts.map((startTime) => candle(startTime)),
        hasMore: options.hasMore ?? false,
        nextCursor: starts[0] ?? null,
      }),
    );
  }

  it('applies a range preset immediately when durable history already covers it', () => {
    hydrateWindow(Array.from({ length: 61 }, (_, index) => index * 60));

    controller.requestRange(1_800);

    expect(log.visibleTimeRanges).toEqual([{ from: 1_800, to: 3_600 }]);
    expect(transport.requests).toHaveLength(1);
  });

  it('backfills first and then applies a range preset without fitting content', () => {
    hydrateWindow(
      Array.from({ length: 11 }, (_, index) => 3_000 + index * 60),
      { hasMore: true },
    );
    const fits = log.fitContentCalls;

    controller.requestRange(3_600);
    const olderRequest = transport.requests.at(-1);
    expect(olderRequest?.before).toBe(3_000);

    transport.deliver(
      result({
        requestId: olderRequest?.requestId ?? '',
        candles: Array.from({ length: 50 }, (_, index) => index * 60).map((startTime) =>
          candle(startTime),
        ),
        hasMore: false,
        nextCursor: 0,
      }),
    );

    expect(log.visibleTimeRanges.at(-1)).toEqual({ from: 0, to: 3_600 });
    expect(log.fitContentCalls).toBe(fits);
  });

  it('restores a saved viewport only for a valid covered time range', () => {
    hydrateWindow(Array.from({ length: 31 }, (_, index) => index * 60));

    controller.restoreViewport({ from: 600, to: 1_200 });
    controller.restoreViewport({ from: 1_200, to: 600 });

    expect(log.visibleTimeRanges).toEqual([{ from: 600, to: 1_200 }]);
  });
});
