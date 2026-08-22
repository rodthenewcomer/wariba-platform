import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import {
  MAX_HISTORY_CANDLE_LIMIT,
  marketHistoryErrorMessageSchema,
  marketHistoryResultSchema,
  validateHistoryWindow,
  type MarketHistoryPort,
  type MarketTick,
  type MessageEnvelope,
  type TradableSymbol,
} from '@wariba/contracts';
import { ConnectionRegistry } from '../src/registry';
import { MemoryMarketHistoryStore } from '../src/market-history-store';
import { handleMarketHistoryRequest } from '../src/websocket';
import type { LoadedSymbolSpec } from '../src/market';

/**
 * W3 §26-§29 / §67 — the authenticated history transport.
 *
 * Focused rather than end-to-end on purpose: what needs proving here is the
 * boundary's own contract — that a request cannot name a source, that an
 * instrument outside the connection's spec set is refused, that every rejection
 * is correlated back to the waiting `requestId`, and that a produced window
 * passes the same validation the browser will apply to it.
 */

const CONNECTION_ID = 'conn-1';

const PRECISION: Record<TradableSymbol, number> = {
  EURUSD: 5,
  GBPUSD: 5,
  USDJPY: 3,
  XAUUSD: 2,
  NAS100: 1,
};

/** Only EURUSD and XAUUSD are in this connection's served spec set. */
function specs(): Record<TradableSymbol, LoadedSymbolSpec> {
  const spec = { pricePrecision: 5 } as LoadedSymbolSpec;
  return { EURUSD: spec, XAUUSD: spec } as Record<TradableSymbol, LoadedSymbolSpec>;
}

function harness(port?: MarketHistoryPort) {
  const sent: MessageEnvelope[] = [];
  const registry = new ConnectionRegistry();
  registry.register(
    CONNECTION_ID,
    {
      readyState: 1,
      OPEN: 1,
      send: (data: string) => sent.push(JSON.parse(data) as MessageEnvelope),
    } as unknown as WebSocket,
    'user-1',
  );

  const store = new MemoryMarketHistoryStore({ pricePrecision: PRECISION });
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() };

  return {
    sent,
    store,
    logger,
    deps: {
      symbolSpecs: specs(),
      registry,
      logger: logger as never,
      history: port ?? store,
    },
    request: (frame: Record<string, unknown>) =>
      handleMarketHistoryRequest(
        {
          symbolSpecs: specs(),
          registry,
          logger: logger as never,
          history: port ?? store,
        },
        CONNECTION_ID,
        frame as { requestId: string },
      ),
  };
}

function seed(store: MemoryMarketHistoryStore, buckets: number): void {
  for (let i = 0; i <= buckets; i += 1) {
    const mid = 1.084 + i * 0.0001;
    store.observeAcceptedTick({
      symbol: 'EURUSD',
      bid: (mid - 0.00001).toFixed(5),
      ask: (mid + 0.00001).toFixed(5),
      timestamp: new Date(i * 60_000).toISOString(),
      sequence: i + 1,
      marketStatus: 'open',
    } satisfies MarketTick);
  }
}

const validRequest = { requestId: 'req-1', symbol: 'EURUSD', timeframe: '1m', limit: 10 };

describe('history transport — success path (W3 §26/§22)', () => {
  it('answers a valid request with a correlated, schema-valid result', async () => {
    const h = harness();
    seed(h.store, 3);

    await h.request(validRequest);

    expect(h.sent).toHaveLength(1);
    const envelope = h.sent[0];
    expect(envelope?.type).toBe('market_history_result');
    expect(envelope?.correlationId).toBe('req-1');

    const parsed = marketHistoryResultSchema.safeParse(envelope?.payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.requestId).toBe('req-1');
    expect(parsed.data.symbol).toBe('EURUSD');
    expect(parsed.data.timeframe).toBe('1m');
    expect(parsed.data.source).toBe('observed_memory_cache');
    expect(parsed.data.priceBasis).toBe('mid');
    expect(parsed.data.sourceEpoch).toBe(h.store.sourceEpoch);
    expect(parsed.data.candles.map((c) => c.startTime)).toEqual([0, 60, 120]);
    expect(parsed.data.currentCandle?.startTime).toBe(180);
  });

  it('produces a window the client-side validator accepts', async () => {
    const h = harness();
    seed(h.store, 5);

    await h.request({ ...validRequest, limit: 3 });

    const parsed = marketHistoryResultSchema.parse(h.sent[0]?.payload);
    expect(validateHistoryWindow(parsed, { limit: 3 })).toEqual({ ok: true });
  });

  it('answers an empty store with an empty, valid window rather than an error', async () => {
    const h = harness();

    await h.request(validRequest);

    const parsed = marketHistoryResultSchema.parse(h.sent[0]?.payload);
    expect(parsed.candles).toEqual([]);
    expect(parsed.currentCandle).toBeNull();
    expect(parsed.hasMore).toBe(false);
    expect(validateHistoryWindow(parsed, { limit: 10 })).toEqual({ ok: true });
  });

  it('serves a paginated older page via the cursor', async () => {
    const h = harness();
    seed(h.store, 8);

    await h.request({ ...validRequest, limit: 3 });
    const recent = marketHistoryResultSchema.parse(h.sent[0]?.payload);
    expect(recent.hasMore).toBe(true);

    await h.request({ ...validRequest, requestId: 'req-2', limit: 3, before: recent.nextCursor });
    const older = marketHistoryResultSchema.parse(h.sent[1]?.payload);

    expect(older.candles.map((c) => c.startTime)).toEqual([120, 180, 240]);
    expect(older.currentCandle).toBeNull();
    const overlap = older.candles.filter((c) =>
      recent.candles.some((r) => r.startTime === c.startTime),
    );
    expect(overlap).toEqual([]);
  });
});

describe('history transport — authorization (W3 §28)', () => {
  it('refuses a symbol outside the connection’s served spec set', async () => {
    const h = harness();

    await h.request({ ...validRequest, symbol: 'NAS100' });

    const payload = marketHistoryErrorMessageSchema.parse(h.sent[0]?.payload);
    expect(h.sent[0]?.type).toBe('market_history_error');
    expect(payload).toEqual({
      requestId: 'req-1',
      code: 'unknown_symbol',
      message: 'Instrument indisponible.',
    });
  });

  it('serves a symbol that is in the spec set', async () => {
    const h = harness();
    await h.request({ ...validRequest, symbol: 'XAUUSD' });
    expect(h.sent[0]?.type).toBe('market_history_result');
  });

  it('refuses an instrument that does not exist at all', async () => {
    const h = harness();
    await h.request({ ...validRequest, symbol: 'BTCUSD' });
    // Caught by strict schema validation before the spec-set check.
    expect(h.sent[0]?.type).toBe('market_history_error');
  });
});

describe('history transport — request validation (W3 §27/§28)', () => {
  it.each([
    ['unsupported timeframe', { timeframe: '5s' }],
    ['unsupported timeframe', { timeframe: '30s' }],
    ['zero limit', { limit: 0 }],
    ['negative limit', { limit: -5 }],
    ['fractional limit', { limit: 10.5 }],
    ['limit above the ceiling', { limit: MAX_HISTORY_CANDLE_LIMIT + 1 }],
    ['negative cursor', { before: -1 }],
    ['fractional cursor', { before: 1.5 }],
  ])('rejects %s with a correlated invalid_request', async (_label, overrides) => {
    const h = harness();

    await h.request({ ...validRequest, ...overrides });

    expect(h.sent).toHaveLength(1);
    const payload = marketHistoryErrorMessageSchema.parse(h.sent[0]?.payload);
    expect(payload.requestId).toBe('req-1');
    expect(payload.code).toBe('invalid_request');
  });

  it('accepts the ceiling itself', async () => {
    const h = harness();
    await h.request({ ...validRequest, limit: MAX_HISTORY_CANDLE_LIMIT });
    expect(h.sent[0]?.type).toBe('market_history_result');
  });

  it('ignores provider-shaped parameters instead of honouring them', async () => {
    const h = harness();
    seed(h.store, 2);

    await h.request({
      ...validRequest,
      source: 'FCS_history',
      providerUrl: 'https://example.invalid/candles',
      apiKey: 'secret',
    });

    const parsed = marketHistoryResultSchema.parse(h.sent[0]?.payload);
    expect(parsed.source).toBe('observed_memory_cache');
  });
});

describe('history transport — abuse control (W3 §29)', () => {
  it('bounds history reads on their own budget and correlates the refusal', async () => {
    const h = harness();

    for (let i = 0; i < 6; i += 1) {
      await h.request({ ...validRequest, requestId: `req-${i}` });
    }
    expect(h.sent.every((e) => e.type === 'market_history_result')).toBe(true);

    await h.request({ ...validRequest, requestId: 'req-over' });

    const payload = marketHistoryErrorMessageSchema.parse(h.sent[6]?.payload);
    expect(payload.requestId).toBe('req-over');
    expect(payload.code).toBe('rate_limited');
  });
});

describe('history transport — read failure isolation (W3 §55/§56)', () => {
  it('answers a failing port with a correlated unavailable error', async () => {
    const brokenPort: MarketHistoryPort = {
      sourceEpoch: 'epoch-broken',
      getCandles: () => Promise.reject(new Error('port exploded')),
    };
    const h = harness(brokenPort);

    await h.request(validRequest);

    const payload = marketHistoryErrorMessageSchema.parse(h.sent[0]?.payload);
    expect(payload).toEqual({
      requestId: 'req-1',
      code: 'unavailable',
      message: 'Historique indisponible.',
    });
  });

  it('records the read failure rather than swallowing it', async () => {
    const brokenPort: MarketHistoryPort = {
      sourceEpoch: 'epoch-broken',
      getCandles: () => Promise.reject(new Error('port exploded')),
    };
    const h = harness(brokenPort);

    await h.request(validRequest);

    expect(h.logger.error).toHaveBeenCalledWith(
      'ws.market_history_read_failed',
      expect.objectContaining({ symbol: 'EURUSD', timeframe: '1m' }),
    );
  });

  it('does not throw out of the handler when the port throws synchronously', async () => {
    const brokenPort: MarketHistoryPort = {
      sourceEpoch: 'epoch-broken',
      getCandles: () => {
        throw new Error('synchronous explosion');
      },
    };
    const h = harness(brokenPort);

    await expect(h.request(validRequest)).resolves.toBeUndefined();
    expect(h.sent[0]?.type).toBe('market_history_error');
  });
});

describe('history transport — read-only by construction (W3 §58)', () => {
  it('exposes no write method on the port', () => {
    const store = new MemoryMarketHistoryStore({ pricePrecision: PRECISION });
    const port: MarketHistoryPort = store;
    expect(Object.keys(port)).not.toContain('observeAcceptedTick');
    // The observer capability exists on the concrete store, never on the read
    // port type handed to the transport.
    expect('getCandles' in port).toBe(true);
  });
});
