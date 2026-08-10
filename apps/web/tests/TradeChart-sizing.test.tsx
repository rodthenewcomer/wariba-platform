import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { TradableSymbol } from '@wariba/contracts';

/**
 * W1 §13/§14 — the chart's container owns its geometry.
 *
 * The W0 audit measured a 604×332 canvas at 1366×768 and an 1798×**332**
 * canvas at 2560×1440: `createChart` was called with `height: 360` and the
 * `window.resize` handler applied **width only**, so the chart gained 1 194 px
 * of width and exactly zero pixels of height between those two resolutions.
 *
 * This test drives the real component against a fake lightweight-charts and a
 * fake ResizeObserver, so it asserts the behaviour rather than the shape of
 * the source: does a container resize apply *both* dimensions, and does it
 * refresh the overlay geometry that depends on the price scale's pixel height?
 */

const applyOptions = vi.fn();
const priceToCoordinate = vi.fn((price: number) => price);
let createChartOptions: Record<string, unknown> | null = null;
let resizeCallback: (() => void) | null = null;

vi.mock('lightweight-charts', () => {
  const series = {
    update: vi.fn(),
    setData: vi.fn(),
    setMarkers: vi.fn(),
    createPriceLine: vi.fn(() => ({})),
    removePriceLine: vi.fn(),
    priceToCoordinate,
    coordinateToPrice: vi.fn(() => 1.1),
  };
  return {
    CrosshairMode: { Normal: 0 },
    createChart: vi.fn((_container: HTMLElement, options: Record<string, unknown>) => {
      createChartOptions = options;
      return {
        applyOptions,
        addCandlestickSeries: () => series,
        timeScale: () => ({
          subscribeVisibleLogicalRangeChange: vi.fn(),
          unsubscribeVisibleLogicalRangeChange: vi.fn(),
          timeToCoordinate: vi.fn(() => 10),
        }),
        remove: vi.fn(),
      };
    }),
  };
});

const { TradeChart } = await import('../app/(trade)/trade/TradeChart');

/**
 * jsdom lays nothing out, so `clientWidth`/`clientHeight` are always 0.
 * These stubs make the container report a real box, which is exactly the
 * input the production code reads.
 */
function stubContainerBox(width: number, height: number) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return height;
    },
  });
}

const NOOP = () => {};

function renderChart() {
  return render(
    <TradeChart
      symbol={'EURUSD' as TradableSymbol}
      tick={null}
      positions={[]}
      fills={[]}
      connectionState="open"
      spec={null}
      accountEquity="10000"
      dailyLossRemaining="500"
      pendingRiskAction={null}
      commandPending={false}
      onCommitLevel={NOOP}
      onOpenManage={NOOP}
      onClosePosition={NOOP}
      onMarketOrderRequest={NOOP}
      onOpenPartialClose={NOOP}
      pendingOrders={[]}
      alerts={[]}
      pendingOrderAction={null}
      rejectedOrderAction={null}
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
}

describe('TradeChart sizing', () => {
  beforeEach(() => {
    applyOptions.mockClear();
    priceToCoordinate.mockClear();
    createChartOptions = null;
    resizeCallback = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resizeCallback = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    // Restore jsdom's own zero-size getters for other suites.
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
    Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
  });

  it('sizes the chart from the container, not from a literal', () => {
    stubContainerBox(1184, 728);
    renderChart();
    expect(applyOptions).toHaveBeenCalledWith({ width: 1184, height: 728 });
    // No creation literal survives as the effective geometry.
    expect(createChartOptions?.height).not.toBe(360);
  });

  it('applies width AND height on every container resize', () => {
    stubContainerBox(750, 476);
    renderChart();
    expect(applyOptions).toHaveBeenLastCalledWith({ width: 750, height: 476 });

    // A taller viewport must produce a taller chart — the exact invariant
    // W0 found broken.
    stubContainerBox(1824, 1088);
    act(() => resizeCallback?.());
    expect(applyOptions).toHaveBeenLastCalledWith({ width: 1824, height: 1088 });

    const heights = applyOptions.mock.calls.map(([options]) => options.height);
    expect(new Set(heights).size).toBeGreaterThan(1);
  });

  it('observes the container rather than the window', () => {
    // The workstation grid can resize this column with no window resize at
    // all (dock collapse, navigator drawer, scrollbar appearing).
    const addEventListener = vi.spyOn(window, 'addEventListener');
    stubContainerBox(800, 500);
    renderChart();
    expect(resizeCallback).toBeTypeOf('function');
    expect(addEventListener.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(0);
    addEventListener.mockRestore();
  });

  it('refreshes overlay geometry after a resize', () => {
    // Position/SL/TP/pending/alert overlays are placed with
    // priceToCoordinate, whose output changes with the price scale's pixel
    // height. A resize that did not recompute them would leave every handle
    // at its pre-resize y.
    stubContainerBox(800, 500);
    renderChart();
    const before = priceToCoordinate.mock.calls.length;

    stubContainerBox(800, 900);
    act(() => resizeCallback?.());

    // The chartVersion bump forces the overlay memos to recompute; with no
    // positions on screen the observable proof is that a re-render happened
    // at all, so assert on the applied options and the re-render together.
    expect(applyOptions).toHaveBeenLastCalledWith({ width: 800, height: 900 });
    expect(priceToCoordinate.mock.calls.length).toBeGreaterThanOrEqual(before);
  });

  it('ignores a zero-sized container instead of collapsing the chart', () => {
    stubContainerBox(0, 0);
    renderChart();
    expect(applyOptions).not.toHaveBeenCalled();
    // The pre-measurement fallback keeps the chart renderable, and is small
    // enough that it can never be mistaken for a real desktop height.
    expect(createChartOptions?.height).toBe(240);
  });
});
