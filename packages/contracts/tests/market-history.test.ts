import { describe, expect, it } from 'vitest';
import {
  INITIAL_HISTORY_CANDLE_LIMIT,
  MAX_HISTORY_CANDLE_LIMIT,
  marketHistoryRequestSchema,
  marketHistoryResultSchema,
  mergeFinalizedCandles,
  replayAfterSequence,
  validateHistoryWindow,
  type MarketCandle,
} from '../src/index';

/**
 * W3 B3 — the history contract's own guarantees: exact request bounds, exact
 * cutover watermark selection, validation that rejects instead of repairing,
 * and a same-epoch merge that refuses to guess.
 */

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

const baseResult = {
  timeframe: '1m' as const,
  candles: [] as MarketCandle[],
  currentCandle: null as MarketCandle | null,
  historyThrough: null as number | null,
  nextCursor: null as number | null,
};

describe('history request contract (W3 §16/§27)', () => {
  it('publishes an initial limit inside the 300-500 target and a bounded ceiling above it', () => {
    expect(INITIAL_HISTORY_CANDLE_LIMIT).toBeGreaterThanOrEqual(300);
    expect(INITIAL_HISTORY_CANDLE_LIMIT).toBeLessThanOrEqual(500);
    expect(MAX_HISTORY_CANDLE_LIMIT).toBeGreaterThan(INITIAL_HISTORY_CANDLE_LIMIT);
  });

  it('rejects an unlimited or oversized request', () => {
    const base = { requestId: 'r1', symbol: 'EURUSD', timeframe: '1m' as const };
    expect(marketHistoryRequestSchema.safeParse({ ...base, limit: 0 }).success).toBe(false);
    expect(
      marketHistoryRequestSchema.safeParse({ ...base, limit: MAX_HISTORY_CANDLE_LIMIT + 1 })
        .success,
    ).toBe(false);
    expect(marketHistoryRequestSchema.safeParse({ ...base, limit: 1.5 }).success).toBe(false);
    expect(
      marketHistoryRequestSchema.safeParse({ ...base, limit: INITIAL_HISTORY_CANDLE_LIMIT })
        .success,
    ).toBe(true);
  });

  it('rejects a symbol or timeframe outside the supported set', () => {
    const base = { requestId: 'r1', limit: 10 };
    expect(
      marketHistoryRequestSchema.safeParse({ ...base, symbol: 'BTCUSD', timeframe: '1m' }).success,
    ).toBe(false);
    expect(
      marketHistoryRequestSchema.safeParse({ ...base, symbol: 'EURUSD', timeframe: '15m' }).success,
    ).toBe(false);
    expect(
      marketHistoryRequestSchema.safeParse({ ...base, symbol: 'EURUSD', timeframe: '5s' }).success,
    ).toBe(true);
  });

  it('carries no provider parameters', () => {
    const parsed = marketHistoryRequestSchema.parse({
      requestId: 'r1',
      symbol: 'EURUSD',
      timeframe: '1m',
      limit: 10,
      providerUrl: 'https://example.invalid/candles',
      apiKey: 'secret',
    });
    expect(parsed).not.toHaveProperty('providerUrl');
    expect(parsed).not.toHaveProperty('apiKey');
  });
});

describe('history result contract (W3 §21/§22)', () => {
  const wireResult = {
    requestId: 'r1',
    symbol: 'EURUSD',
    timeframe: '1m',
    source: 'observed_memory_cache',
    sourceEpoch: 'epoch-a',
    priceBasis: 'mid',
    candles: [candle(0)],
    currentCandle: null,
    finalizedObservedThroughSequence: 12,
    currentCandleObservedThroughSequence: null,
    historyThrough: 60,
    hasMore: false,
    nextCursor: 0,
  };

  it('accepts the honest observed-memory source', () => {
    expect(marketHistoryResultSchema.safeParse(wireResult).success).toBe(true);
  });

  it('rejects a source that claims provider or exchange history', () => {
    for (const source of ['provider_history', 'exchange_history', 'FCS_history']) {
      expect(marketHistoryResultSchema.safeParse({ ...wireResult, source }).success).toBe(false);
    }
  });

  it('rejects a price basis other than mid', () => {
    expect(marketHistoryResultSchema.safeParse({ ...wireResult, priceBasis: 'bid' }).success).toBe(
      false,
    );
  });

  it('has no volume, trade-count or tick-count field', () => {
    const parsed = marketHistoryResultSchema.parse({
      ...wireResult,
      candles: [{ ...candle(0), volume: '1000', tickCount: 42 }],
    });
    expect(parsed.candles[0]).not.toHaveProperty('volume');
    expect(parsed.candles[0]).not.toHaveProperty('tickCount');
  });

  it('requires an explicit null rather than an absent field', () => {
    const { currentCandle: _omitted, ...withoutCurrent } = wireResult;
    expect(marketHistoryResultSchema.safeParse(withoutCurrent).success).toBe(false);
  });
});

describe('replay watermark selection (W3 §18)', () => {
  it('prefers the current-candle watermark when a seed is present', () => {
    expect(
      replayAfterSequence({
        currentCandle: candle(60),
        currentCandleObservedThroughSequence: 92,
        finalizedObservedThroughSequence: 89,
      }),
    ).toBe(92);
  });

  it('falls back to the finalized watermark with no seed', () => {
    expect(
      replayAfterSequence({
        currentCandle: null,
        currentCandleObservedThroughSequence: null,
        finalizedObservedThroughSequence: 89,
      }),
    ).toBe(89);
  });

  it('is null when the server represented nothing, so the whole buffer replays', () => {
    expect(
      replayAfterSequence({
        currentCandle: null,
        currentCandleObservedThroughSequence: null,
        finalizedObservedThroughSequence: null,
      }),
    ).toBeNull();
  });

  it('ignores a seed whose watermark is missing rather than inventing one', () => {
    expect(
      replayAfterSequence({
        currentCandle: candle(60),
        currentCandleObservedThroughSequence: null,
        finalizedObservedThroughSequence: 89,
      }),
    ).toBe(89);
  });
});

describe('history window validation — rejects, never repairs (W3 §67)', () => {
  const limit = { limit: 100 };

  it('accepts a well-formed window', () => {
    expect(
      validateHistoryWindow(
        { ...baseResult, candles: [candle(0), candle(60)], historyThrough: 120, nextCursor: 0 },
        limit,
      ),
    ).toEqual({ ok: true });
  });

  it('rejects a misaligned bucket', () => {
    const result = validateHistoryWindow(
      { ...baseResult, candles: [candle(30)], historyThrough: 90, nextCursor: 30 },
      limit,
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('not aligned');
  });

  it('rejects duplicate candle timestamps', () => {
    const result = validateHistoryWindow(
      { ...baseResult, candles: [candle(0), candle(0)], historyThrough: 60, nextCursor: 0 },
      limit,
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('duplicate');
  });

  it('rejects non-ascending candle timestamps', () => {
    const result = validateHistoryWindow(
      { ...baseResult, candles: [candle(60), candle(0)], historyThrough: 60, nextCursor: 60 },
      limit,
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('not ascending');
  });

  it.each([
    ['invalid decimal', { open: '1,08450' }],
    ['invalid decimal', { close: 'NaN' }],
    ['high < open', { high: '1.08400', open: '1.08450', low: '1.08390', close: '1.08395' }],
    ['high < close', { high: '1.08450', open: '1.08440', low: '1.08430', close: '1.08460' }],
    ['low > open', { low: '1.08460', open: '1.08450', high: '1.08470', close: '1.08465' }],
    ['low > close', { low: '1.08456', open: '1.08457', high: '1.08460', close: '1.08455' }],
    ['high < low', { high: '1.08440', low: '1.08450', open: '1.08445', close: '1.08445' }],
  ])('rejects %s', (_label, overrides) => {
    const result = validateHistoryWindow(
      {
        ...baseResult,
        candles: [candle(0, overrides)],
        historyThrough: 60,
        nextCursor: 0,
      },
      limit,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects more candles than were requested', () => {
    const result = validateHistoryWindow(
      {
        ...baseResult,
        candles: [candle(0), candle(60), candle(120)],
        historyThrough: 180,
        nextCursor: 0,
      },
      { limit: 2 },
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('limit');
  });

  it('rejects a historyThrough that does not match the newest finalized bucket', () => {
    const result = validateHistoryWindow(
      { ...baseResult, candles: [candle(0), candle(60)], historyThrough: 180, nextCursor: 0 },
      limit,
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('historyThrough');
  });

  it('rejects a historyThrough set with no finalized candles', () => {
    const result = validateHistoryWindow({ ...baseResult, historyThrough: 60 }, limit);
    expect(result.ok).toBe(false);
  });

  it('rejects a nextCursor that is not the oldest returned candle', () => {
    const result = validateHistoryWindow(
      { ...baseResult, candles: [candle(0), candle(60)], historyThrough: 120, nextCursor: 60 },
      limit,
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('nextCursor');
  });

  it('rejects a current candle that is not after the newest finalized bucket', () => {
    const result = validateHistoryWindow(
      {
        ...baseResult,
        candles: [candle(0), candle(60)],
        currentCandle: candle(60),
        historyThrough: 120,
        nextCursor: 0,
      },
      limit,
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('not after');
  });

  it('rejects an incoherent current candle', () => {
    const result = validateHistoryWindow(
      {
        ...baseResult,
        candles: [candle(0)],
        currentCandle: candle(60, { high: '1.08400', low: '1.08450' }),
        historyThrough: 60,
        nextCursor: 0,
      },
      limit,
    );
    expect(result.ok).toBe(false);
  });

  it('accepts an empty window with a current candle and no finalized history', () => {
    expect(validateHistoryWindow({ ...baseResult, currentCandle: candle(60) }, limit)).toEqual({
      ok: true,
    });
  });

  it('accepts a genuine gap between finalized candles', () => {
    // W3 permits gaps: an interval with no accepted tick produces no candle.
    expect(
      validateHistoryWindow(
        { ...baseResult, candles: [candle(0), candle(300)], historyThrough: 360, nextCursor: 0 },
        limit,
      ),
    ).toEqual({ ok: true });
  });
});

describe('same-epoch finalized merge (W3 §66)', () => {
  it('dedupes identical repeats', () => {
    const result = mergeFinalizedCandles([candle(0), candle(60)], [candle(60), candle(120)]);
    expect(result.status).toBe('merged');
    expect(result.status === 'merged' && result.candles.map((c) => c.startTime)).toEqual([
      0, 60, 120,
    ]);
  });

  it('keeps the merged series strictly ascending', () => {
    const result = mergeFinalizedCandles([candle(120)], [candle(0), candle(60)]);
    expect(result.status === 'merged' && result.candles.map((c) => c.startTime)).toEqual([
      0, 60, 120,
    ]);
  });

  it('reports a conflict rather than last-write-wins', () => {
    const result = mergeFinalizedCandles(
      [candle(60, { high: '1.08460' })],
      [candle(60, { high: '1.08999' })],
    );
    expect(result).toEqual({ status: 'conflict', startTime: 60 });
  });

  it('merges into an empty local series', () => {
    const result = mergeFinalizedCandles([], [candle(0)]);
    expect(result.status === 'merged' && result.candles).toEqual([candle(0)]);
  });

  it('does not mutate its inputs', () => {
    const existing = [candle(0)];
    const incoming = [candle(60)];
    mergeFinalizedCandles(existing, incoming);
    expect(existing).toHaveLength(1);
    expect(incoming).toHaveLength(1);
  });
});
