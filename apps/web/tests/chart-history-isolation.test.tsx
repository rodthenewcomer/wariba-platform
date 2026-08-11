import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type {
  MarketHistoryErrorMessage,
  MarketHistoryRequest,
  MarketHistoryResult,
  PendingOrderDTO,
  PositionDTO,
  PriceAlertDTO,
  SymbolSpec,
  TradableSymbol,
} from '@wariba/contracts';
import { createTickStore, type TickStore } from '../app/(trade)/trade/tick-store';

/**
 * W3 §56/§57/§58/§73 — history is display data, and this proves it at the one
 * boundary where the two could touch.
 *
 * The chart is the only component that holds both a history series and the
 * execution callbacks. So the question worth answering is not "does the port
 * expose a write method" (it does not, by type) but the behavioural one: if a
 * historical candle sweeps straight through a pending order's trigger, a stop
 * loss, a take profit and an alert threshold, does anything fire? Nothing may.
 * Only a fresh accepted realtime tick can cause execution, and it does so on the
 * server, not here.
 */

const seriesUpdate = vi.fn();
const seriesSetData = vi.fn();
const fitContent = vi.fn();

vi.mock('lightweight-charts', () => {
  const series = {
    update: seriesUpdate,
    setData: seriesSetData,
    setMarkers: vi.fn(),
    createPriceLine: vi.fn(() => ({})),
    removePriceLine: vi.fn(),
    priceToCoordinate: vi.fn((price: number) => price),
    coordinateToPrice: vi.fn(() => 1.1),
  };
  return {
    CrosshairMode: { Normal: 0 },
    createChart: vi.fn(() => ({
      applyOptions: vi.fn(),
      addCandlestickSeries: () => series,
      timeScale: () => ({
        subscribeVisibleLogicalRangeChange: vi.fn(),
        unsubscribeVisibleLogicalRangeChange: vi.fn(),
        timeToCoordinate: vi.fn(() => 10),
        fitContent,
      }),
      remove: vi.fn(),
    })),
  };
});

const { TradeChart } = await import('../app/(trade)/trade/TradeChart');

function stubContainerBox(width: number, height: number): void {
  for (const [name, value] of [
    ['clientWidth', width],
    ['clientHeight', height],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get: () => value,
    });
  }
}

const SPEC: SymbolSpec = {
  symbol: 'EURUSD' as TradableSymbol,
  assetClass: 'forex_major',
  pricePrecision: 5,
  contractSize: '100000',
  minimumQuantity: '0.01',
  maximumQuantity: '10',
  quantityStep: '0.01',
  leverage: 30,
  commissionPerLot: '3',
};

/**
 * A position with a stop loss BELOW and a take profit ABOVE the history window,
 * plus a pending order and an alert inside it. Every one of these levels is
 * crossed by the candles delivered below.
 */
const POSITION: PositionDTO = {
  id: 'pos-1',
  accountId: 'acc-1',
  symbol: 'EURUSD' as TradableSymbol,
  side: 'buy',
  openQuantity: '0.10',
  averageOpenPrice: '1.08500',
  stopLoss: '1.08200',
  takeProfit: '1.09000',
  openedAt: new Date(0).toISOString(),
  status: 'open',
} as unknown as PositionDTO;

const PENDING_ORDER: PendingOrderDTO = {
  id: 'po-1',
  accountId: 'acc-1',
  symbol: 'EURUSD' as TradableSymbol,
  orderType: 'buy_limit',
  side: 'buy',
  quantity: '0.10',
  triggerPrice: '1.08300',
  status: 'active',
  createdAt: new Date(0).toISOString(),
} as unknown as PendingOrderDTO;

const ALERT: PriceAlertDTO = {
  id: 'alert-1',
  symbol: 'EURUSD' as TradableSymbol,
  thresholdPrice: '1.08900',
  direction: 'above',
  enabled: true,
  recurrence: 'once',
  source: 'manual',
} as unknown as PriceAlertDTO;

interface Harness {
  store: TickStore;
  requests: MarketHistoryRequest[];
  deliver(result: MarketHistoryResult): void;
  deliverError(error: MarketHistoryErrorMessage): void;
  callbacks: Record<string, ReturnType<typeof vi.fn>>;
}

function renderChart(): Harness {
  const store = createTickStore();
  const requests: MarketHistoryRequest[] = [];
  const resultListeners = new Set<(r: MarketHistoryResult) => void>();
  const errorListeners = new Set<(e: MarketHistoryErrorMessage) => void>();

  const callbacks = {
    onCommitLevel: vi.fn(),
    onOpenManage: vi.fn(),
    onClosePosition: vi.fn(),
    onMarketOrderRequest: vi.fn(),
    onOpenPartialClose: vi.fn(),
    onModifyPendingOrderTrigger: vi.fn(),
    onOpenManagePendingOrder: vi.fn(),
    onCancelPendingOrder: vi.fn(),
    onModifyAlertThreshold: vi.fn(),
    onOpenManageAlert: vi.fn(),
    onDeleteAlert: vi.fn(),
    onPendingOrderRequest: vi.fn(),
    onCreateAlertHere: vi.fn(),
  };

  render(
    <TradeChart
      symbol={'EURUSD' as TradableSymbol}
      store={store}
      historyTransport={{
        request: (request) => requests.push(request),
        onResult: (listener) => {
          resultListeners.add(listener);
          return () => resultListeners.delete(listener);
        },
        onError: (listener) => {
          errorListeners.add(listener);
          return () => errorListeners.delete(listener);
        },
        onSocketOpen: () => () => {},
      }}
      tick={null}
      positions={[POSITION]}
      fills={[]}
      connectionState="open"
      spec={SPEC}
      accountEquity="10000"
      dailyLossRemaining="500"
      pendingRiskAction={null}
      commandPending={false}
      pendingOrders={[PENDING_ORDER]}
      alerts={[ALERT]}
      pendingOrderAction={null}
      rejectedOrderAction={null}
      {...callbacks}
    />,
  );

  return {
    store,
    requests,
    deliver: (result) => act(() => resultListeners.forEach((l) => l(result))),
    deliverError: (error) => act(() => errorListeners.forEach((l) => l(error))),
    callbacks,
  };
}

/** Candles that sweep through the stop loss, the trigger, the take profit and the alert. */
function sweepingHistory(requestId: string): MarketHistoryResult {
  return {
    requestId,
    symbol: 'EURUSD' as TradableSymbol,
    timeframe: '5s',
    source: 'observed_memory_cache',
    sourceEpoch: 'epoch-a',
    priceBasis: 'mid',
    candles: [
      // Low 1.08100 is through the 1.08200 stop loss and the 1.08300 trigger.
      { startTime: 0, open: '1.08500', high: '1.08600', low: '1.08100', close: '1.08200' },
      // High 1.09200 is through the 1.09000 take profit and the 1.08900 alert.
      { startTime: 5, open: '1.08200', high: '1.09200', low: '1.08200', close: '1.09100' },
    ],
    currentCandle: null,
    finalizedObservedThroughSequence: 20,
    currentCandleObservedThroughSequence: null,
    historyThrough: 10,
    hasMore: false,
    nextCursor: 0,
  };
}

beforeEach(() => {
  seriesUpdate.mockClear();
  seriesSetData.mockClear();
  fitContent.mockClear();
  stubContainerBox(1200, 600);
  // jsdom has no ResizeObserver; the chart's geometry ownership is W1's concern
  // and is covered by TradeChart-sizing.test.tsx, so an inert stub is enough here.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
});

describe('history cannot execute (W3 §57/§73)', () => {
  it('fires no order, risk, alert or position callback for a sweeping history window', () => {
    const h = renderChart();
    expect(h.requests).toHaveLength(1);

    h.deliver(sweepingHistory(h.requests[0]?.requestId ?? ''));

    // The candles are on the chart...
    expect(seriesSetData).toHaveBeenCalled();
    expect(seriesSetData.mock.calls.at(-1)?.[0]).toHaveLength(2);
    // ...and nothing was executed, modified, cancelled or triggered.
    for (const [name, callback] of Object.entries(h.callbacks)) {
      expect(callback, name).not.toHaveBeenCalled();
    }
  });

  it('fires nothing when a locally aggregated candle crosses the same levels', () => {
    const h = renderChart();
    h.deliver(sweepingHistory(h.requests[0]?.requestId ?? ''));

    act(() => {
      // A tick whose mid (1.08150) is through the stop loss and the trigger.
      h.store.update({
        symbol: 'EURUSD' as TradableSymbol,
        bid: '1.08145',
        ask: '1.08155',
        timestamp: new Date(10_000).toISOString(),
        sequence: 21,
        marketStatus: 'open',
      });
    });

    // The chart drew it; nothing acted on it. Execution is the server's, from
    // its own canonical accepted-tick path.
    expect(seriesUpdate).toHaveBeenCalled();
    for (const [name, callback] of Object.entries(h.callbacks)) {
      expect(callback, name).not.toHaveBeenCalled();
    }
  });
});

describe('history failure isolation (W3 §55/§56/§72)', () => {
  it('reports the chart-local error and leaves the live feed and controls alone', () => {
    const h = renderChart();

    h.deliverError({
      requestId: h.requests[0]?.requestId ?? '',
      code: 'unavailable',
      message: 'Historique indisponible.',
    });

    const status = document.querySelector('[data-testid="chart-history-status"]');
    expect(status?.getAttribute('data-history-status')).toBe('error');
    expect(status?.textContent).toBe('Historique indisponible. Le flux temps réel continue.');
    // Not a workstation banner, and not covering anything: chart-local overlay only.
    expect(status?.className).toContain('pointer-events-none');
    for (const [name, callback] of Object.entries(h.callbacks)) {
      expect(callback, name).not.toHaveBeenCalled();
    }
  });

  it('keeps aggregating live candles after a history failure', () => {
    const h = renderChart();
    h.deliverError({
      requestId: h.requests[0]?.requestId ?? '',
      code: 'unavailable',
      message: 'Historique indisponible.',
    });
    seriesUpdate.mockClear();

    act(() => {
      h.store.update({
        symbol: 'EURUSD' as TradableSymbol,
        bid: '1.08445',
        ask: '1.08455',
        timestamp: new Date(20_000).toISOString(),
        sequence: 30,
        marketStatus: 'open',
      });
    });

    // W3 §55 — a history failure does not mean a stale market or a dead feed.
    expect(seriesUpdate).toHaveBeenCalled();
  });

  it('does not report an error for a malformed window it cannot repair, beyond its own state', () => {
    const h = renderChart();

    h.deliver({
      ...sweepingHistory(h.requests[0]?.requestId ?? ''),
      // Non-ascending: must be rejected wholesale, never reordered.
      candles: [
        { startTime: 5, open: '1.08200', high: '1.09200', low: '1.08200', close: '1.09100' },
        { startTime: 0, open: '1.08500', high: '1.08600', low: '1.08100', close: '1.08200' },
      ],
    });

    const status = document.querySelector('[data-testid="chart-history-status"]');
    expect(status?.getAttribute('data-history-status')).toBe('error');
    expect(status?.getAttribute('data-history-candles')).toBe('0');
    for (const [name, callback] of Object.entries(h.callbacks)) {
      expect(callback, name).not.toHaveBeenCalled();
    }
  });
});

describe('history UX states (W3 §52-§54)', () => {
  it('shows a subtle loading indicator while the request is in flight', () => {
    renderChart();
    const status = document.querySelector('[data-testid="chart-history-status"]');
    expect(status?.getAttribute('data-history-status')).toBe('loading');
    expect(status?.textContent).toBe('Historique…');
  });

  it('says history is still being built rather than claiming the feed is down', () => {
    const h = renderChart();

    h.deliver({
      ...sweepingHistory(h.requests[0]?.requestId ?? ''),
      candles: [],
      historyThrough: null,
      nextCursor: null,
      finalizedObservedThroughSequence: null,
    });

    const status = document.querySelector('[data-testid="chart-history-status"]');
    expect(status?.getAttribute('data-history-status')).toBe('empty');
    expect(status?.textContent).toBe('Historique en cours de constitution.');
  });

  it('shows no history message at all once hydrated', () => {
    const h = renderChart();
    h.deliver(sweepingHistory(h.requests[0]?.requestId ?? ''));

    const status = document.querySelector('[data-testid="chart-history-status"]');
    expect(status?.getAttribute('data-history-status')).toBe('ready');
    expect(status?.getAttribute('data-history-candles')).toBe('2');
    expect(status?.textContent).toBe('');
  });

  it('fits the viewport once on hydration, not per tick', () => {
    const h = renderChart();
    h.deliver(sweepingHistory(h.requests[0]?.requestId ?? ''));
    expect(fitContent).toHaveBeenCalledTimes(1);

    act(() => {
      for (let i = 1; i <= 4; i += 1) {
        h.store.update({
          symbol: 'EURUSD' as TradableSymbol,
          bid: '1.08445',
          ask: '1.08455',
          timestamp: new Date(10_000 + i * 1000).toISOString(),
          sequence: 30 + i,
          marketStatus: 'open',
        });
      }
    });

    expect(fitContent).toHaveBeenCalledTimes(1);
  });
});

describe('renderer write model (W3 §42/§43)', () => {
  it('writes the whole series once on hydration and increments per tick after', () => {
    const h = renderChart();
    h.deliver(sweepingHistory(h.requests[0]?.requestId ?? ''));
    const setDataCalls = seriesSetData.mock.calls.length;

    act(() => {
      h.store.update({
        symbol: 'EURUSD' as TradableSymbol,
        bid: '1.08445',
        ask: '1.08455',
        timestamp: new Date(10_000).toISOString(),
        sequence: 31,
        marketStatus: 'open',
      });
    });

    expect(seriesSetData.mock.calls).toHaveLength(setDataCalls);
    expect(seriesUpdate).toHaveBeenCalled();
  });

  it('converts to number only at the renderer boundary', () => {
    const h = renderChart();
    h.deliver(sweepingHistory(h.requests[0]?.requestId ?? ''));

    const rendered = seriesSetData.mock.calls.at(-1)?.[0] as Array<Record<string, unknown>>;
    expect(rendered[0]).toEqual({
      time: 0,
      open: 1.085,
      high: 1.086,
      low: 1.081,
      close: 1.082,
    });
    for (const value of Object.values(rendered[0] ?? {})) {
      expect(typeof value).toBe('number');
    }
  });
});
