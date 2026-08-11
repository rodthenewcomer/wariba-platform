import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import type { MarketTick, TradableSymbol } from '@wariba/contracts';
import { ConnectionRegistry } from '../src/registry';
import { MarketTickGate } from '../src/tick-gate';
import { MemoryMarketHistoryStore } from '../src/market-history-store';
import { RealtimeOperationalMetrics } from '../src/metrics';
import { admitAndFanOutTick } from '../src/websocket';

/**
 * W3 §61 — the test that protects the architecture rather than a behaviour.
 *
 * The defect it exists to prevent is subtle and would look fine in a browser:
 * attach candle aggregation anywhere inside the per-client fan-out and history
 * still renders, still moves, still looks like a chart — until a second trader
 * connects, at which point every tick is folded into the candle twice and the
 * high/low/close of every bar depends on how many people happen to be watching.
 * So the assertion is a count, not a shape.
 */

const SENT: string[] = [];

function fakeSocket(): WebSocket {
  return {
    readyState: 1,
    OPEN: 1,
    send: (data: string) => SENT.push(data),
    ping: () => {},
    terminate: () => {},
  } as unknown as WebSocket;
}

function silentLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
}

function tick(overrides: Partial<MarketTick> = {}): MarketTick {
  return {
    symbol: 'EURUSD',
    bid: '1.08440',
    ask: '1.08460',
    timestamp: new Date(0).toISOString(),
    sequence: 1,
    marketStatus: 'open',
    ...overrides,
  };
}

const PRECISION: Record<TradableSymbol, number> = {
  EURUSD: 5,
  GBPUSD: 5,
  USDJPY: 3,
  XAUUSD: 2,
  NAS100: 1,
};

/** N clients, all subscribed to the same market channel. */
function registryWithClients(count: number): ConnectionRegistry {
  const registry = new ConnectionRegistry();
  for (let i = 0; i < count; i += 1) {
    const id = `conn-${i}`;
    registry.register(id, fakeSocket(), `user-${i}`);
    registry.subscribe(id, 'market.symbol.EURUSD');
  }
  return registry;
}

interface CountingObserver {
  observeAcceptedTick(tick: MarketTick): void;
  calls: MarketTick[];
}

function countingObserver(): CountingObserver {
  const calls: MarketTick[] = [];
  return {
    calls,
    observeAcceptedTick(t) {
      calls.push(t);
    },
  };
}

function harness(clientCount: number, history: { observeAcceptedTick(t: MarketTick): void }) {
  SENT.length = 0;
  const registry = registryWithClients(clientCount);
  const logger = silentLogger();
  return {
    registry,
    logger,
    deps: {
      tickGate: new MarketTickGate(),
      history,
      registry,
      logger: logger as never,
      metrics: new RealtimeOperationalMetrics(),
    },
  };
}

describe('server history observation multiplicity (W3 §4/§61)', () => {
  it('observes one accepted tick exactly once with 5 connected clients', () => {
    const history = countingObserver();
    const { deps } = harness(5, history);

    admitAndFanOutTick(deps, tick());

    expect(history.calls).toHaveLength(1);
    // ...while the same tick genuinely reached all five sockets.
    expect(SENT).toHaveLength(5);
  });

  it('observation count is independent of how many clients are connected', () => {
    for (const clientCount of [0, 1, 2, 20]) {
      const history = countingObserver();
      const { deps } = harness(clientCount, history);
      admitAndFanOutTick(deps, tick());
      expect(history.calls, `${clientCount} clients`).toHaveLength(1);
      expect(SENT, `${clientCount} clients`).toHaveLength(clientCount);
    }
  });

  it('observes N distinct accepted ticks N times, not N × clients', () => {
    const history = countingObserver();
    const { deps } = harness(3, history);

    for (let sequence = 1; sequence <= 4; sequence += 1) {
      admitAndFanOutTick(
        deps,
        tick({ sequence, timestamp: new Date(sequence * 1000).toISOString() }),
      );
    }

    expect(history.calls.map((t) => t.sequence)).toEqual([1, 2, 3, 4]);
    expect(SENT).toHaveLength(12);
  });

  it('produces a candle whose OHLC does not depend on the connected client count', () => {
    const oneClient = new MemoryMarketHistoryStore({ pricePrecision: PRECISION });
    const manyClients = new MemoryMarketHistoryStore({ pricePrecision: PRECISION });
    const prices: Array<[string, string]> = [
      ['1.08440', '1.08460'],
      ['1.08480', '1.08500'],
      ['1.08400', '1.08420'],
      ['1.08450', '1.08470'],
    ];

    for (const [store, clientCount] of [
      [oneClient, 1],
      [manyClients, 12],
    ] as const) {
      const { deps } = harness(clientCount, store);
      prices.forEach(([bid, ask], index) => {
        admitAndFanOutTick(
          deps,
          tick({ bid, ask, sequence: index + 1, timestamp: new Date(index * 1000).toISOString() }),
        );
      });
    }

    const read = (store: MemoryMarketHistoryStore) =>
      store.getCandles({ symbol: 'EURUSD', timeframe: '5s', limit: 10 });
    return Promise.all([read(oneClient), read(manyClients)]).then(([single, many]) => {
      expect(many.currentCandle).toEqual(single.currentCandle);
      expect(single.currentCandle).toEqual({
        startTime: 0,
        open: '1.08450',
        high: '1.08490',
        low: '1.08410',
        close: '1.08460',
      });
    });
  });
});

describe('history observation is restricted to accepted ticks (W3 §4)', () => {
  it('does not observe a duplicate or out-of-order tick', () => {
    const history = countingObserver();
    const { deps } = harness(1, history);

    admitAndFanOutTick(deps, tick({ sequence: 5, timestamp: new Date(5000).toISOString() }));
    // Same sequence again → duplicate.
    admitAndFanOutTick(deps, tick({ sequence: 5, timestamp: new Date(5000).toISOString() }));
    // Lower sequence → out_of_order.
    admitAndFanOutTick(deps, tick({ sequence: 4, timestamp: new Date(4000).toISOString() }));

    expect(history.calls.map((t) => t.sequence)).toEqual([5]);
    // Rejected ticks are not broadcast either — unchanged pre-W3 behaviour.
    expect(SENT).toHaveLength(1);
  });

  it('does not observe a stale/closed market tick, but still fans it out', () => {
    const history = countingObserver();
    const { deps } = harness(2, history);

    admitAndFanOutTick(deps, tick({ marketStatus: 'stale' }));

    expect(history.calls).toHaveLength(0);
    // The chart still needs the last price to show a stale market honestly.
    expect(SENT).toHaveLength(2);
  });
});

describe('history observer failure containment (W3 §5/§56)', () => {
  const throwingObserver = {
    observeAcceptedTick(): void {
      throw new Error('history store exploded');
    },
  };

  it('still fans the accepted tick out to every client', () => {
    const { deps } = harness(4, throwingObserver);

    const decision = admitAndFanOutTick(deps, tick());

    expect(decision).toBe('accepted');
    expect(SENT).toHaveLength(4);
  });

  it('still reports the tick as accepted so execution continues downstream', () => {
    // The caller's `if (decision !== 'accepted') return` guards queued
    // reductions, SL/TP protection, pending-order triggers and alerts. A broken
    // history store must not make that guard fire.
    const { deps } = harness(1, throwingObserver);
    expect(admitAndFanOutTick(deps, tick())).toBe('accepted');
  });

  it('records the history fault instead of swallowing it silently', () => {
    const { deps, logger } = harness(1, throwingObserver);

    admitAndFanOutTick(deps, tick());

    expect(logger.error).toHaveBeenCalledWith(
      'realtime.market_history_observe_failed',
      expect.objectContaining({ symbol: 'EURUSD', sequence: 1 }),
    );
  });

  it('keeps working for later ticks after a fault', () => {
    let calls = 0;
    const flaky = {
      observeAcceptedTick(): void {
        calls += 1;
        if (calls === 1) throw new Error('transient');
      },
    };
    const { deps } = harness(1, flaky);

    admitAndFanOutTick(deps, tick({ sequence: 1, timestamp: new Date(1000).toISOString() }));
    admitAndFanOutTick(deps, tick({ sequence: 2, timestamp: new Date(2000).toISOString() }));

    expect(calls).toBe(2);
    expect(SENT).toHaveLength(2);
  });
});
