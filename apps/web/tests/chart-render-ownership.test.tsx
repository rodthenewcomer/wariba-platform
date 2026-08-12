import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { memo, useRef } from 'react';
import type {
  MarketHistoryErrorMessage,
  MarketHistoryRequest,
  MarketHistoryResult,
  MarketTick,
  SymbolSpec,
  TradableSymbol,
} from '@wariba/contracts';
import { createTickStore, type TickStore } from '../app/(trade)/trade/tick-store';
import { CHART_DRAWINGS_STORAGE_KEY } from '../app/(trade)/trade/chart-drawing-store';

/**
 * W5 §72/§73/§120/§124/§125 — what an accepted tick and a drawing drag are
 * allowed to touch.
 *
 * `workstation-render-ownership.test.tsx` proves the shell's isolation with the
 * chart stubbed out, which is the right shape for that question. This file asks
 * the complementary one W5 introduces: with four indicators calculating and
 * drawings on screen, does a tick still reach only the canvas, and does dragging
 * a drawing across the plot re-render anything or write to storage sixty times a
 * second?
 *
 * The stand-in for the shell is a memoised sibling with stable props. If any
 * shared state — a context, a store subscription, a lifted `useState` — carried
 * the tick or the pointer upward, it would re-render, and the count would move.
 */

const chartDouble = await vi.hoisted(async () => {
  const { createLightweightChartsDouble } = await import('./support/lightweight-charts-double');
  return createLightweightChartsDouble();
});
vi.mock('lightweight-charts', () => chartDouble.module);

const { TradeChart } = await import('../app/(trade)/trade/TradeChart');
const { stubContainerBox, stubResizeObserver } =
  await import('./support/lightweight-charts-double');

const N_TICKS = 25;

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
} as unknown as SymbolSpec;

let chromeRenders = 0;

/** Stands in for every piece of workstation chrome above the chart column. */
const Chrome = memo(function Chrome() {
  chromeRenders += 1;
  return <div data-testid="chrome" />;
});

function pointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  init: { clientX?: number; clientY?: number; pointerId?: number },
): Event {
  return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    pointerId: init.pointerId ?? 1,
    pointerType: 'mouse',
  });
}

interface Harness {
  store: TickStore;
  requests: MarketHistoryRequest[];
  deliver(result: MarketHistoryResult): void;
  container(): HTMLElement;
}

const NOOP = () => {};

function Workstation({ store, transport }: { store: TickStore; transport: unknown }) {
  // A stable `tick` prop: in production ChartWorkspace owns the `useTick`
  // subscription and re-renders itself, which is by design (W1 §16). What must
  // not happen is the *shell* re-rendering, and that is what `Chrome` measures.
  const tick = useRef<MarketTick | null>(null);
  return (
    <div>
      <Chrome />
      <TradeChart
        symbol={'EURUSD' as TradableSymbol}
        accountId="acc-1"
        store={store}
        historyTransport={transport as never}
        tick={tick.current}
        positions={[]}
        fills={[]}
        connectionState="open"
        spec={SPEC}
        accountEquity="10000"
        dailyLossRemaining="500"
        pendingRiskAction={null}
        commandPending={false}
        pendingOrders={[]}
        alerts={[]}
        pendingOrderAction={null}
        rejectedOrderAction={null}
        onCommitLevel={NOOP}
        onOpenManage={NOOP}
        onClosePosition={NOOP}
        onMarketOrderRequest={NOOP}
        onOpenPartialClose={NOOP}
        onModifyPendingOrderTrigger={NOOP}
        onOpenManagePendingOrder={NOOP}
        onCancelPendingOrder={NOOP}
        onModifyAlertThreshold={NOOP}
        onOpenManageAlert={NOOP}
        onDeleteAlert={NOOP}
        onPendingOrderRequest={NOOP}
        onCreateAlertHere={NOOP}
      />
    </div>
  );
}

function renderWorkstation(): Harness {
  const store = createTickStore();
  const requests: MarketHistoryRequest[] = [];
  const resultListeners = new Set<(r: MarketHistoryResult) => void>();
  const errorListeners = new Set<(e: MarketHistoryErrorMessage) => void>();
  const transport = {
    request: (request: MarketHistoryRequest) => requests.push(request),
    onResult: (listener: (r: MarketHistoryResult) => void) => {
      resultListeners.add(listener);
      return () => resultListeners.delete(listener);
    },
    onError: (listener: (e: MarketHistoryErrorMessage) => void) => {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    onSocketOpen: () => () => {},
  };

  render(<Workstation store={store} transport={transport} />);

  return {
    store,
    requests,
    deliver: (result) => act(() => resultListeners.forEach((listener) => listener(result))),
    container: () => screen.getByRole('group', { name: 'Graphique EURUSD' }),
  };
}

/** 120 finalized 5s candles — enough for a 100 SMA to warm up. */
function history(requestId: string): MarketHistoryResult {
  return {
    requestId,
    symbol: 'EURUSD' as TradableSymbol,
    timeframe: '5s',
    source: 'observed_memory_cache',
    sourceEpoch: 'epoch-a',
    priceBasis: 'mid',
    candles: Array.from({ length: 120 }, (_, index) => ({
      startTime: index * 5,
      open: '1.08450',
      high: '1.08600',
      low: '1.08400',
      close: (1.084 + index * 0.00001).toFixed(5),
    })),
    currentCandle: null,
    finalizedObservedThroughSequence: 500,
    currentCandleObservedThroughSequence: null,
    historyThrough: 600,
    hasMore: false,
    nextCursor: 0,
  };
}

function tickAt(index: number): MarketTick {
  const mid = 1.086 + index * 0.00001;
  return {
    symbol: 'EURUSD' as TradableSymbol,
    bid: (mid - 0.00001).toFixed(5),
    ask: (mid + 0.00001).toFixed(5),
    // Every tick lands in the bucket after the newest finalized candle, so the
    // current bar genuinely moves 25 times.
    timestamp: new Date((600 + index) * 1000).toISOString(),
    sequence: 501 + index,
    marketStatus: 'open',
  };
}

function storedDrawings(count: number): void {
  window.localStorage.setItem(
    CHART_DRAWINGS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      accounts: {
        'acc-1': {
          EURUSD: Array.from({ length: count }, (_, index) => ({
            id: `level-${index}`,
            type: 'horizontal_line',
            symbol: 'EURUSD',
            anchors: [{ time: 50, price: (1.085 + index * 0.001).toFixed(5) }],
            style: { color: '#9AA3B1', width: 1, lineStyle: 'solid' },
            createdAt: 1,
            updatedAt: 1,
          })),
        },
      },
    }),
  );
}

beforeEach(() => {
  chartDouble.spies.reset();
  window.localStorage.clear();
  chromeRenders = 0;
  stubContainerBox(1200, 600);
  stubResizeObserver();
});

afterEach(cleanup);

describe('an accepted tick reaches the canvas and stops — W5 §72/§120', () => {
  it(`re-renders no chrome for ${N_TICKS} ticks with four indicators and drawings on screen`, () => {
    storedDrawings(5);
    const h = renderWorkstation();
    h.deliver(history(h.requests[0]?.requestId ?? ''));

    expect(chartDouble.spies.lineSeriesCreated).toHaveLength(4);
    expect(h.container()).toHaveAttribute('data-drawing-count', '5');

    const chromeBaseline = chromeRenders;
    const lineUpdatesBaseline = chartDouble.spies.lineUpdate.length;
    const setDataBaseline = chartDouble.spies.lineSetData.length;

    act(() => {
      for (let index = 0; index < N_TICKS; index += 1) h.store.update(tickAt(index));
    });

    // §120 — nothing above the chart column re-rendered.
    expect(chromeRenders - chromeBaseline).toBe(0);

    // …and the work genuinely happened: every tick moved every indicator line.
    expect(chartDouble.spies.lineUpdate.length - lineUpdatesBaseline).toBeGreaterThanOrEqual(
      N_TICKS * 4,
    );
    // §35 — incremental, not a rebuild per tick.
    expect(chartDouble.spies.lineSetData.length).toBe(setDataBaseline);
  });

  it('writes no chart preference while ticks flow (§124)', () => {
    const h = renderWorkstation();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem');

    act(() => {
      for (let index = 0; index < N_TICKS; index += 1) h.store.update(tickAt(index));
    });

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});

describe('a drawing drag stays chart-local — W5 §73/§125', () => {
  it('re-renders no chrome and writes storage once, on drag end', () => {
    storedDrawings(1);
    const h = renderWorkstation();
    h.deliver(history(h.requests[0]?.requestId ?? ''));

    const chromeBaseline = chromeRenders;
    const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem');

    // Grab the stored level (price 1.08500, mapped identically to y by the double).
    chartDouble.spies.priceAtCoordinate = 1.085;
    fireEvent(h.container(), pointer('pointerdown', { clientX: 400, clientY: 1, pointerId: 7 }));

    // Forty pointer moves — a real drag across the plot.
    for (let step = 0; step < 40; step += 1) {
      chartDouble.spies.priceAtCoordinate = 1.085 + step * 0.0001;
      act(() => {
        fireEvent(
          h.container(),
          pointer('pointermove', { clientX: 400 + step, clientY: 1 + step, pointerId: 7 }),
        );
      });
    }

    // §73/§125 — not one write during the gesture.
    expect(setItem).not.toHaveBeenCalled();

    act(() => {
      fireEvent(h.container(), pointer('pointerup', { clientX: 440, clientY: 41, pointerId: 7 }));
    });

    // Exactly one, on commit.
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem.mock.calls[0]?.[0]).toBe(CHART_DRAWINGS_STORAGE_KEY);
    // §72 — the whole gesture was invisible above the chart column.
    expect(chromeRenders - chromeBaseline).toBe(0);
    setItem.mockRestore();
  });
});
