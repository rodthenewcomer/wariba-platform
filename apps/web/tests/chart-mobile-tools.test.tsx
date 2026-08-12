import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  MarketHistoryErrorMessage,
  MarketHistoryRequest,
  MarketHistoryResult,
  SymbolSpec,
  TradableSymbol,
} from '@wariba/contracts';
import { timeframeSeconds } from '@wariba/contracts';
import { createTickStore } from '../app/(trade)/trade/tick-store';
import { CHART_PREFERENCES_STORAGE_KEY } from '../app/(trade)/trade/chart-preferences';
import { CHART_DRAWINGS_STORAGE_KEY } from '../app/(trade)/trade/chart-drawing-store';

/**
 * W5 §66-§71, §116 — the mobile chart-analysis surface.
 *
 * Mobile stays chart-first: no indicator panel, drawing toolbar or settings
 * panel permanently stacked under the plot. Everything but the timeframe strip
 * lives behind one compact sheet, and the sheet's controls are the *same*
 * components the desktop popovers use — so a phone and a laptop cannot drift
 * into two different feature sets.
 *
 * The viewport is chosen the way the component chooses it: `matchMedia`, which
 * is what `useIsDesktop` reads.
 */

const chartDouble = await vi.hoisted(async () => {
  const { createLightweightChartsDouble } = await import('./support/lightweight-charts-double');
  return createLightweightChartsDouble();
});
vi.mock('lightweight-charts', () => chartDouble.module);

const { TradeChart } = await import('../app/(trade)/trade/TradeChart');
const { stubContainerBox, stubResizeObserver } =
  await import('./support/lightweight-charts-double');

/**
 * jsdom implements no `HTMLDialogElement.showModal()`/`close()` — the same
 * polyfill `packages/ui/tests/BottomSheet.test.tsx` installs, so the sheet under
 * test here behaves the way it does in the component's own suite.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

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

const NOOP = () => {};

/** 390×844 is the reference phone in §116; `useIsDesktop` reads `min-width: 1024px`. */
function stubViewport(isDesktop: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: isDesktop,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

function pointer(
  type: 'pointerdown',
  init: { clientX?: number; clientY?: number; pointerId?: number; pointerType?: string },
): Event {
  return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'touch',
  });
}

interface Harness {
  requests: MarketHistoryRequest[];
  deliver(result: MarketHistoryResult): void;
  container(): HTMLElement;
}

function renderChart(): Harness {
  const store = createTickStore();
  const requests: MarketHistoryRequest[] = [];
  const resultListeners = new Set<(r: MarketHistoryResult) => void>();
  const errorListeners = new Set<(e: MarketHistoryErrorMessage) => void>();

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
      tick={null}
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
    />,
  );

  return {
    requests,
    deliver: (result) => act(() => resultListeners.forEach((listener) => listener(result))),
    container: () => screen.getByRole('group', { name: 'Graphique EURUSD' }),
  };
}

/**
 * A valid window for whichever interval is asked for.
 *
 * Bucket starts are aligned to the timeframe's own duration because
 * `validateHistoryWindow` rejects a misaligned window outright (W3 §67) — a
 * fixture that hard-coded 5-second starts would fail hydration on 3m and the
 * test would be measuring an error state rather than a timeframe switch.
 */
function history(requestId: string, timeframe: MarketHistoryResult['timeframe']) {
  const duration = timeframeSeconds(timeframe);
  const candles = Array.from({ length: 20 }, (_, index) => ({
    startTime: index * duration,
    open: '1.08450',
    high: '1.08600',
    low: '1.08400',
    close: '1.08500',
  }));
  return {
    requestId,
    symbol: 'EURUSD' as TradableSymbol,
    timeframe,
    source: 'observed_memory_cache' as const,
    sourceEpoch: 'epoch-a',
    priceBasis: 'mid' as const,
    candles,
    currentCandle: null,
    finalizedObservedThroughSequence: 20,
    currentCandleObservedThroughSequence: null,
    historyThrough: (candles.length - 1) * duration + duration,
    hasMore: false,
    nextCursor: 0,
  } satisfies MarketHistoryResult;
}

beforeEach(() => {
  chartDouble.spies.reset();
  window.localStorage.clear();
  stubContainerBox(390, 500);
  stubResizeObserver();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('mobile chart tools — W5 §66/§67/§70/§116', () => {
  beforeEach(() => stubViewport(false));

  it('keeps all five timeframes directly reachable, with no inline popovers', () => {
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? '', '5s'));

    expect(screen.getAllByRole('radio')).toHaveLength(5);
    // §66 — nothing permanently stacked: the tools live behind one trigger.
    expect(screen.queryByTestId('chart-tools-trigger')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chart-indicators-trigger')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart-tools-sheet-trigger')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-tools-sheet')).not.toBeInTheDocument();
  });

  it('switches to 15s and 3m in one tap each', async () => {
    const user = userEvent.setup();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? '', '5s'));

    await user.click(screen.getByRole('radio', { name: '15s' }));
    expect(h.requests.at(-1)?.timeframe).toBe('15s');
    h.deliver(history(h.requests.at(-1)?.requestId ?? '', '15s'));

    await user.click(screen.getByRole('radio', { name: '3m' }));
    expect(h.requests.at(-1)?.timeframe).toBe('3m');
  });

  it('toggles an indicator from the sheet and keeps the sheet open (§70)', async () => {
    const user = userEvent.setup();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? '', '5s'));

    await user.click(screen.getByTestId('chart-tools-sheet-trigger'));
    const sheet = screen.getByTestId('chart-tools-sheet');
    for (const name of ['EMA 20', 'SMA 20', 'SMA 50', 'SMA 100']) {
      expect(screen.getByRole('checkbox', { name })).toBeInTheDocument();
    }

    await user.click(screen.getByRole('checkbox', { name: 'EMA 20' }));

    expect(screen.getByRole('checkbox', { name: 'EMA 20' })).not.toBeChecked();
    // A trader comparing two averages should not have to reopen the sheet.
    expect(sheet).toBeInTheDocument();
    expect(chartDouble.spies.lineSeriesRemoved).toBe(1);
  });

  it('closes the sheet when a drawing tool is chosen, then places the drawing (§68/§116)', async () => {
    const user = userEvent.setup();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? '', '5s'));

    await user.click(screen.getByTestId('chart-tools-sheet-trigger'));
    await user.click(screen.getByTestId('chart-tool-horizontal_line'));

    // Sheet gone, chart in drawing mode, and the mode is visible.
    expect(screen.queryByTestId('chart-tools-sheet')).not.toBeInTheDocument();
    expect(h.container()).toHaveAttribute('data-chart-tool', 'horizontal_line');
    expect(screen.getByTestId('chart-active-tool')).toHaveTextContent('Ligne horizontale');

    chartDouble.spies.priceAtCoordinate = 1.086;
    fireEvent(h.container(), pointer('pointerdown', { clientX: 200, clientY: 250, pointerId: 3 }));

    expect(h.container()).toHaveAttribute('data-drawing-count', '1');
    // §68 — back to Cursor by default.
    expect(h.container()).toHaveAttribute('data-chart-tool', 'select');
  });

  it('offers Edit/Delete/Done on a selected drawing, and never a Buy or Sell (§69)', async () => {
    const user = userEvent.setup();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? '', '5s'));

    await user.click(screen.getByTestId('chart-tools-sheet-trigger'));
    await user.click(screen.getByTestId('chart-tool-horizontal_line'));
    chartDouble.spies.priceAtCoordinate = 1.086;
    fireEvent(h.container(), pointer('pointerdown', { clientX: 200, clientY: 250, pointerId: 4 }));

    const actions = screen.getByTestId('chart-drawing-actions');
    expect(actions).toHaveTextContent('Style');
    expect(actions).toHaveTextContent('Supprimer');
    expect(actions).toHaveTextContent('Terminé');
    // §69 — no execution control anywhere near a drawing's own UI.
    expect(actions.textContent).not.toMatch(/achat|vente|buy|sell/i);

    await user.click(screen.getByTestId('chart-drawing-delete'));
    expect(h.container()).toHaveAttribute('data-drawing-count', '0');
  });

  it('cancels an active tool from the chart, without a keyboard (§68)', async () => {
    const user = userEvent.setup();
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? '', '5s'));

    await user.click(screen.getByTestId('chart-tools-sheet-trigger'));
    await user.click(screen.getByTestId('chart-tool-trend_line'));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(h.container()).toHaveAttribute('data-chart-tool', 'select');
  });
});

describe('one configuration across breakpoints — W5 §71', () => {
  it('carries the same timeframe, indicators and drawings from mobile to desktop', async () => {
    const user = userEvent.setup();

    stubViewport(false);
    const mobile = renderChart();
    mobile.deliver(history(mobile.requests[0]?.requestId ?? '', '5s'));
    await user.click(screen.getByRole('radio', { name: '3m' }));
    // A timeframe switch clears the series and rehydrates (W3 §45), and a
    // drawing anchors to a *loaded* candle (§47) — so the new interval's
    // history has to land before a drawing can be placed on it.
    mobile.deliver(history(mobile.requests.at(-1)?.requestId ?? '', '3m'));
    await user.click(screen.getByTestId('chart-tools-sheet-trigger'));
    await user.click(screen.getByRole('checkbox', { name: 'SMA 50' }));
    await user.click(screen.getByTestId('chart-tool-horizontal_line'));
    chartDouble.spies.priceAtCoordinate = 1.086;
    fireEvent(
      mobile.container(),
      pointer('pointerdown', { clientX: 200, clientY: 250, pointerId: 5 }),
    );
    expect(mobile.container()).toHaveAttribute('data-drawing-count', '1');

    cleanup();
    chartDouble.spies.reset();

    // Same browser, same account, wider viewport — the preferences are shared
    // chart state, not a per-breakpoint copy.
    stubViewport(true);
    const desktop = renderChart();
    desktop.deliver(history(desktop.requests[0]?.requestId ?? '', '3m'));

    expect(desktop.requests[0]?.timeframe).toBe('3m');
    expect(screen.getByRole('radio', { name: '3m' })).toHaveAttribute('aria-checked', 'true');
    expect(desktop.container()).toHaveAttribute('data-drawing-count', '1');
    // SMA 50 stayed off: three series, not four.
    expect(chartDouble.spies.lineSeriesCreated).toHaveLength(3);
  });

  it('keys both preference stores by account, not by viewport', () => {
    stubViewport(false);
    const h = renderChart();
    h.deliver(history(h.requests[0]?.requestId ?? '', '5s'));
    // Nothing viewport-shaped ends up in either key.
    const analysis = window.localStorage.getItem(CHART_PREFERENCES_STORAGE_KEY) ?? '';
    const drawings = window.localStorage.getItem(CHART_DRAWINGS_STORAGE_KEY) ?? '';
    for (const raw of [analysis, drawings]) {
      expect(raw).not.toMatch(/mobile|desktop|viewport|breakpoint/i);
    }
  });
});
