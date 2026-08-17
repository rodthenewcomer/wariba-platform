import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  MarketHistoryErrorMessage,
  MarketHistoryRequest,
  MarketHistoryResult,
  MarketTick,
  PendingOrderDTO,
  PositionDTO,
  PriceAlertDTO,
  SymbolSpec,
  TradableSymbol,
} from '@wariba/contracts';
import { createTickStore, type TickStore } from '../app/(trade)/trade/tick-store';
import { CHART_DRAWINGS_STORAGE_KEY } from '../app/(trade)/trade/chart-drawing-store';

/**
 * W5 §57-§60, §110-§113, §116-§118, §120 — what the drawing layer must never
 * take away.
 *
 * The analytical layer is the newest thing on this chart and the trading
 * overlays are the oldest, so the interesting failures all point one way: a
 * drawing swallowing a stop-loss drag, a Fibonacci grid covering an open
 * position's badge, a delete key cancelling a pending order, a touch that both
 * draws and opens the trade menu. Every test here is that class of failure.
 */

const chartDouble = await vi.hoisted(async () => {
  const { createLightweightChartsDouble } = await import('./support/lightweight-charts-double');
  return createLightweightChartsDouble();
});
vi.mock('lightweight-charts', () => chartDouble.module);

// jsdom has no native dialog controller. The browser implementation is covered
// by the rendered checkpoint; component interaction tests need the open state.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
}

const { TradeChart } = await import('../app/(trade)/trade/TradeChart');
const { stubContainerBox, stubResizeObserver } =
  await import('./support/lightweight-charts-double');

/**
 * jsdom's `PointerEvent` drops `clientX`/`clientY` from its init dictionary, so
 * `fireEvent.pointerDown(el, { clientX })` delivers an event with no
 * coordinates. React reads those properties straight off the native event, so
 * assigning them onto a plain Event is both sufficient and honest about what the
 * component actually receives.
 */
function pointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  init: { clientX?: number; clientY?: number; pointerId?: number; pointerType?: string },
): Event {
  return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'mouse',
  });
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
} as unknown as SymbolSpec;

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
  direction: 'cross_above',
  enabled: true,
  recurrence: 'once',
  source: 'manual',
} as unknown as PriceAlertDTO;

const TICK: MarketTick = {
  symbol: 'EURUSD' as TradableSymbol,
  bid: '1.08495',
  ask: '1.08505',
  timestamp: new Date(600_000).toISOString(),
  sequence: 100,
  marketStatus: 'open',
};

interface Harness {
  store: TickStore;
  requests: MarketHistoryRequest[];
  deliver(result: MarketHistoryResult): void;
  callbacks: Record<string, ReturnType<typeof vi.fn>>;
  container(): HTMLElement;
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
      accountId="acc-1"
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
      tick={TICK}
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
    deliver: (result) => act(() => resultListeners.forEach((listener) => listener(result))),
    callbacks,
    container: () => screen.getByRole('group', { name: 'Graphique EURUSD' }),
  };
}

function history(requestId: string): MarketHistoryResult {
  return {
    requestId,
    symbol: 'EURUSD' as TradableSymbol,
    timeframe: '5s',
    source: 'observed_memory_cache',
    sourceEpoch: 'epoch-a',
    priceBasis: 'mid',
    candles: Array.from({ length: 20 }, (_, index) => ({
      startTime: index * 5,
      open: '1.08450',
      high: '1.08600',
      low: '1.08400',
      close: '1.08500',
    })),
    currentCandle: null,
    finalizedObservedThroughSequence: 20,
    currentCandleObservedThroughSequence: null,
    historyThrough: 100,
    hasMore: true,
    nextCursor: 0,
  };
}

/** Hydrated chart with a drawing already stored, so hit testing has something to hit. */
function withStoredDrawing(): void {
  window.localStorage.setItem(
    CHART_DRAWINGS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      accounts: {
        'acc-1': {
          EURUSD: [
            {
              id: 'level-1',
              type: 'horizontal_line',
              symbol: 'EURUSD',
              anchors: [{ time: 50, price: '1.08500' }],
              style: { color: '#9AA3B1', width: 1, lineStyle: 'solid' },
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        },
      },
    }),
  );
}

beforeEach(() => {
  chartDouble.spies.reset();
  window.localStorage.clear();
  stubContainerBox(1200, 600);
  stubResizeObserver();
});

afterEach(cleanup);

describe('trading overlays keep interaction priority in Select mode — §57/§110', () => {
  it('renders the drawing layer without ever taking a pointer event', () => {
    withStoredDrawing();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));

    const layer = screen.getByTestId('chart-drawing-layer');
    // §45 — the SVG is decorative. Hit testing runs against projected geometry
    // in the container's own handler, so trading overlays (siblings painted
    // above) are reached first by construction.
    // `className` on an SVG element is an SVGAnimatedString, not a string.
    expect(layer.getAttribute('class')).toContain('pointer-events-none');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
  });

  it('leaves the SL, TP, pending-order and alert handles interactive', () => {
    withStoredDrawing();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));

    // The overlay controls are still in the tree and still enabled — a drawing
    // layer over the chart must not disable them.
    for (const label of [/Stop loss/i, /Take profit/i]) {
      const control = screen.queryAllByLabelText(label);
      expect(control.length, String(label)).toBeGreaterThan(0);
    }
  });

  it('fires the SL modify flow when its handle is dragged, with a drawing present', () => {
    withStoredDrawing();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));

    const handles = screen.getAllByLabelText(/Stop loss/i);
    const handle = handles[0]!;
    chartDouble.spies.priceAtCoordinate = 1.083;

    fireEvent(handle, pointer('pointerdown', { clientY: 300, pointerId: 1 }));
    // Two separate acts: a real pointermove and pointerup are separate tasks, so
    // React flushes between them. Batching both into one act would let the drag
    // commit read the pre-move session and never see `moved`.
    act(() => {
      window.dispatchEvent(pointer('pointermove', { clientY: 340, pointerId: 1 }));
    });
    act(() => {
      window.dispatchEvent(pointer('pointerup', { clientY: 340, pointerId: 1 }));
    });

    expect(h.callbacks.onCommitLevel).toHaveBeenCalledTimes(1);
    expect(h.callbacks.onCommitLevel?.mock.calls[0]?.[0]).toMatchObject({
      positionId: 'pos-1',
      field: 'stop_loss',
    });
  });

  it('fires the pending-order modify flow when its line is dragged', () => {
    withStoredDrawing();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));

    const line = screen.getAllByLabelText(/buy_limit|Ordre/i)[0]!;
    chartDouble.spies.priceAtCoordinate = 1.0825;

    fireEvent(line, pointer('pointerdown', { clientY: 300, pointerId: 2 }));
    act(() => {
      window.dispatchEvent(pointer('pointermove', { clientY: 350, pointerId: 2 }));
    });
    act(() => {
      window.dispatchEvent(pointer('pointerup', { clientY: 350, pointerId: 2 }));
    });

    expect(h.callbacks.onModifyPendingOrderTrigger).toHaveBeenCalledTimes(1);
    expect(h.callbacks.onCommitLevel).not.toHaveBeenCalled();
  });

  it('fires the alert modify flow when its line is dragged', () => {
    withStoredDrawing();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));

    const line = screen.getAllByLabelText(/Alerte/i)[0]!;
    chartDouble.spies.priceAtCoordinate = 1.0885;

    fireEvent(line, pointer('pointerdown', { clientY: 200, pointerId: 3 }));
    act(() => {
      window.dispatchEvent(pointer('pointermove', { clientY: 250, pointerId: 3 }));
    });
    act(() => {
      window.dispatchEvent(pointer('pointerup', { clientY: 250, pointerId: 3 }));
    });

    expect(h.callbacks.onModifyAlertThreshold).toHaveBeenCalledTimes(1);
  });
});

describe('an active drawing tool owns the gesture — §58/§111', () => {
  async function openLines(): Promise<void> {
    const user = userEvent.setup();
    await user.click(screen.getByTestId('chart-tool-family-lines'));
  }

  async function activateTrendLine(): Promise<void> {
    await openLines();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('chart-tool-trend_line'));
  }

  it('suppresses the trade context menu while a tool is held', async () => {
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    await activateTrendLine();

    expect(screen.getByTestId('chart-active-tool')).toBeInTheDocument();

    fireEvent.contextMenu(h.container(), { clientX: 100, clientY: 200 });

    // §58 — no quick order, no pending order, no alert, and no menu at all.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(h.callbacks.onMarketOrderRequest).not.toHaveBeenCalled();
    expect(h.callbacks.onPendingOrderRequest).not.toHaveBeenCalled();
    expect(h.callbacks.onCreateAlertHere).not.toHaveBeenCalled();
  });

  it('does not arm the mobile long press while a tool is held (§60/§117)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = renderChart();
      h.deliver(history(h.requests[0]?.requestId ?? ''));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(screen.getByTestId('chart-tool-family-lines'));
      await user.click(screen.getByTestId('chart-tool-horizontal_line'));

      fireEvent(
        h.container(),
        pointer('pointerdown', {
          pointerType: 'touch',
          clientX: 100,
          clientY: 200,
          pointerId: 9,
        }),
      );
      act(() => {
        vi.advanceTimersByTime(1200);
      });

      // No trade sheet, and no execution callback — one gesture, one meaning.
      expect(screen.queryByText(/Prix 1\./)).not.toBeInTheDocument();
      for (const [name, callback] of Object.entries(h.callbacks)) {
        expect(callback, name).not.toHaveBeenCalled();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns to Select after the drawing completes, restoring trade gestures (§111)', async () => {
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    const user = userEvent.setup();
    await user.click(screen.getByTestId('chart-tool-family-lines'));
    await user.click(screen.getByTestId('chart-tool-horizontal_line'));
    expect(h.container()).toHaveAttribute('data-chart-tool', 'horizontal_line');

    chartDouble.spies.priceAtCoordinate = 1.086;
    fireEvent(h.container(), pointer('pointerdown', { clientX: 200, clientY: 250, pointerId: 4 }));

    // One click places a horizontal line and hands the chart back (§49).
    expect(h.container()).toHaveAttribute('data-chart-tool', 'select');
    expect(h.container()).toHaveAttribute('data-drawing-count', '1');
    // Nothing was traded.
    for (const [name, callback] of Object.entries(h.callbacks)) {
      expect(callback, name).not.toHaveBeenCalled();
    }
  });

  it('cancels an incomplete drawing on Escape without persisting anything (§112)', async () => {
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    await activateTrendLine();

    chartDouble.spies.priceAtCoordinate = 1.086;
    fireEvent(h.container(), pointer('pointerdown', { clientX: 200, clientY: 250, pointerId: 5 }));
    // A trend line needs two anchors: still pending.
    expect(h.container()).toHaveAttribute('data-drawing-count', '0');

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(h.container()).toHaveAttribute('data-chart-tool', 'select');
    expect(h.container()).toHaveAttribute('data-drawing-count', '0');
    expect(window.localStorage.getItem(CHART_DRAWINGS_STORAGE_KEY)).toBeNull();
  });
});

describe('deleting a drawing touches nothing else — §52/§113', () => {
  it('removes the drawing and cancels no order, alert or position', async () => {
    withStoredDrawing();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    expect(h.container()).toHaveAttribute('data-drawing-count', '1');

    // Select it by clicking its stroke: the stored level is 1.08500 and the
    // double maps price → y identically, so the line sits at y = 1.085.
    chartDouble.spies.priceAtCoordinate = 1.085;
    fireEvent(h.container(), pointer('pointerdown', { clientX: 400, clientY: 1, pointerId: 6 }));
    expect(screen.getByTestId('chart-drawing-actions')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('chart-drawing-delete'));

    expect(h.container()).toHaveAttribute('data-drawing-count', '0');
    expect(h.callbacks.onCancelPendingOrder).not.toHaveBeenCalled();
    expect(h.callbacks.onDeleteAlert).not.toHaveBeenCalled();
    expect(h.callbacks.onClosePosition).not.toHaveBeenCalled();
    expect(h.callbacks.onCommitLevel).not.toHaveBeenCalled();
  });

  it('ignores Delete when nothing is selected, so it can never reach an order', () => {
    withStoredDrawing();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));

    act(() => {
      fireEvent.keyDown(window, { key: 'Delete' });
      fireEvent.keyDown(window, { key: 'Backspace' });
    });

    expect(h.container()).toHaveAttribute('data-drawing-count', '1');
    for (const [name, callback] of Object.entries(h.callbacks)) {
      expect(callback, name).not.toHaveBeenCalled();
    }
  });
});

describe('symbol scoping — §76/§114', () => {
  it('does not show one symbol’s drawings on another', () => {
    window.localStorage.setItem(
      CHART_DRAWINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        accounts: {
          'acc-1': {
            XAUUSD: [
              {
                id: 'gold-level',
                type: 'horizontal_line',
                symbol: 'XAUUSD',
                anchors: [{ time: 50, price: '2000.00' }],
                style: { color: '#9AA3B1', width: 1, lineStyle: 'solid' },
                createdAt: 1,
                updatedAt: 1,
              },
            ],
          },
        },
      }),
    );
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    expect(h.container()).toHaveAttribute('data-drawing-count', '0');
  });
});

describe('indicator series lifecycle in the real component — §122/§123', () => {
  it('creates one line series per default indicator and no more', () => {
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    expect(chartDouble.spies.lineSeriesCreated).toHaveLength(4);
  });

  it('destroys a series when its indicator is switched off', async () => {
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    const user = userEvent.setup();

    await user.click(screen.getByTestId('chart-indicators-trigger'));
    await user.click(screen.getByRole('checkbox', { name: 'SMA 100' }));

    expect(chartDouble.spies.lineSeriesRemoved).toBe(1);
  });
});

describe('pan-left backfill in the real component — §18/§21', () => {
  it('requests one older page and shifts the viewport instead of refitting', () => {
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? ''));
    const requestsAfterHydration = h.requests.length;
    const fitsAfterHydration = chartDouble.spies.fitContent.mock.calls.length;

    // The trader pans until only three loaded bars remain to the left.
    act(() => {
      for (const listener of chartDouble.spies.visibleRangeListeners) {
        listener({ from: 3, to: 40 });
        listener({ from: 2, to: 39 });
        listener({ from: 1, to: 38 });
      }
    });
    expect(h.requests).toHaveLength(requestsAfterHydration + 1);
    const older = h.requests.at(-1)!;
    expect(older.before).toBe(0);

    chartDouble.spies.visibleLogicalRange = { from: 1, to: 38 };
    h.deliver({
      ...history(older.requestId),
      candles: Array.from({ length: 4 }, (_, index) => ({
        startTime: -20 + index * 5,
        open: '1.08450',
        high: '1.08600',
        low: '1.08400',
        close: '1.08500',
      })),
      currentCandle: null,
      historyThrough: 0,
      hasMore: false,
      nextCursor: -20,
    });

    // §21 — the viewport was shifted by exactly the four prepended bars, and
    // fitContent was NOT called.
    expect(chartDouble.spies.setVisibleLogicalRange).toHaveBeenCalledWith({ from: 5, to: 42 });
    expect(chartDouble.spies.fitContent.mock.calls).toHaveLength(fitsAfterHydration);
  });
});
