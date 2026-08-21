import { vi } from 'vitest';

/**
 * One test double for lightweight-charts, shared by every chart test.
 *
 * It exists because W5 widened the renderer surface the chart uses — line
 * series for indicators, crosshair subscription for the OHLC legend, logical
 * range read/write for the backfill viewport compensation — and three separate
 * hand-rolled fakes would drift apart until one of them silently stopped
 * exercising a code path.
 *
 * It is a *recorder*, not a simulator: it answers with deterministic values and
 * remembers what it was asked, so a test can assert "one setData per hydration"
 * or "the logical range was shifted by exactly 3" without a canvas.
 */

export interface ChartDoubleSpies {
  seriesUpdate: ReturnType<typeof vi.fn>;
  seriesSetData: ReturnType<typeof vi.fn>;
  seriesApplyOptions: ReturnType<typeof vi.fn>;
  /** The candlestick series' price→pixel conversion, which overlay geometry drives. */
  seriesPriceToCoordinate: ReturnType<typeof vi.fn>;
  fitContent: ReturnType<typeof vi.fn>;
  /** Every line series created for an indicator, in creation order. */
  lineSeriesCreated: { options: Record<string, unknown> }[];
  lineSeriesRemoved: number;
  lineSetData: { index: number; data: unknown[] }[];
  lineUpdate: { index: number; point: unknown }[];
  setVisibleLogicalRange: ReturnType<typeof vi.fn>;
  setVisibleRange: ReturnType<typeof vi.fn>;
  priceScaleApplyOptions: ReturnType<typeof vi.fn>;
  visibleLogicalRange: { from: number; to: number } | null;
  /** Test-controlled: what `coordinateToPrice` answers. */
  priceAtCoordinate: number;
  /** Test-controlled: what `coordinateToLogical` answers. */
  logicalAtCoordinate: number;
  crosshairListeners: ((param: unknown) => void)[];
  visibleRangeListeners: ((range: { from: number; to: number } | null) => void)[];
  reset(): void;
}

export function createLightweightChartsDouble(): {
  module: Record<string, unknown>;
  spies: ChartDoubleSpies;
} {
  const spies: ChartDoubleSpies = {
    seriesUpdate: vi.fn(),
    seriesSetData: vi.fn(),
    seriesApplyOptions: vi.fn(),
    seriesPriceToCoordinate: vi.fn((price: number) => price),
    fitContent: vi.fn(),
    lineSeriesCreated: [],
    lineSeriesRemoved: 0,
    lineSetData: [],
    lineUpdate: [],
    setVisibleLogicalRange: vi.fn(),
    setVisibleRange: vi.fn(),
    priceScaleApplyOptions: vi.fn(),
    visibleLogicalRange: { from: 0, to: 100 },
    priceAtCoordinate: 1.1,
    logicalAtCoordinate: 5,
    crosshairListeners: [],
    visibleRangeListeners: [],
    reset() {
      spies.seriesUpdate.mockClear();
      spies.seriesSetData.mockClear();
      spies.seriesApplyOptions.mockClear();
      spies.seriesPriceToCoordinate.mockClear();
      spies.fitContent.mockClear();
      spies.setVisibleLogicalRange.mockClear();
      spies.setVisibleRange.mockClear();
      spies.priceScaleApplyOptions.mockClear();
      spies.lineSeriesCreated.length = 0;
      spies.lineSeriesRemoved = 0;
      spies.lineSetData.length = 0;
      spies.lineUpdate.length = 0;
      spies.crosshairListeners.length = 0;
      spies.visibleRangeListeners.length = 0;
      spies.visibleLogicalRange = { from: 0, to: 100 };
      spies.priceAtCoordinate = 1.1;
      spies.logicalAtCoordinate = 5;
    },
  };

  const candlestickSeries = {
    update: spies.seriesUpdate,
    setData: spies.seriesSetData,
    applyOptions: spies.seriesApplyOptions,
    setMarkers: vi.fn(),
    createPriceLine: vi.fn(() => ({})),
    removePriceLine: vi.fn(),
    // Identity-ish conversions keep overlay geometry deterministic without
    // pretending to model a real price scale.
    priceToCoordinate: spies.seriesPriceToCoordinate,
    coordinateToPrice: vi.fn(() => spies.priceAtCoordinate),
  };

  const createBaseSeries = () => ({
    update: vi.fn(),
    setData: vi.fn(),
    applyOptions: vi.fn(),
    priceToCoordinate: spies.seriesPriceToCoordinate,
    coordinateToPrice: vi.fn(() => spies.priceAtCoordinate),
  });
  const barSeries = createBaseSeries();
  const lineChartSeries = createBaseSeries();
  const areaSeries = createBaseSeries();

  const module = {
    CrosshairMode: { Normal: 0 },
    PriceScaleMode: { Normal: 0, Logarithmic: 1, Percentage: 2, IndexedTo100: 3 },
    createChart: vi.fn(() => ({
      applyOptions: vi.fn(),
      addCandlestickSeries: () => candlestickSeries,
      addBarSeries: () => barSeries,
      addAreaSeries: () => areaSeries,
      addLineSeries: (options: Record<string, unknown>) => {
        if (options.visible === false) return lineChartSeries;
        const index = spies.lineSeriesCreated.length;
        spies.lineSeriesCreated.push({ options });
        return {
          setData: (data: unknown[]) => spies.lineSetData.push({ index, data }),
          update: (point: unknown) => spies.lineUpdate.push({ index, point }),
          applyOptions: vi.fn(),
        };
      },
      removeSeries: () => {
        spies.lineSeriesRemoved += 1;
      },
      subscribeCrosshairMove: (listener: (param: unknown) => void) =>
        spies.crosshairListeners.push(listener),
      unsubscribeCrosshairMove: (listener: (param: unknown) => void) => {
        const index = spies.crosshairListeners.indexOf(listener);
        if (index >= 0) spies.crosshairListeners.splice(index, 1);
      },
      timeScale: () => ({
        subscribeVisibleLogicalRangeChange: (
          listener: (range: { from: number; to: number } | null) => void,
        ) => spies.visibleRangeListeners.push(listener),
        unsubscribeVisibleLogicalRangeChange: (
          listener: (range: { from: number; to: number } | null) => void,
        ) => {
          const index = spies.visibleRangeListeners.indexOf(listener);
          if (index >= 0) spies.visibleRangeListeners.splice(index, 1);
        },
        timeToCoordinate: vi.fn((time: number) => time),
        coordinateToLogical: vi.fn(() => spies.logicalAtCoordinate),
        getVisibleLogicalRange: () => spies.visibleLogicalRange,
        setVisibleLogicalRange: spies.setVisibleLogicalRange,
        setVisibleRange: spies.setVisibleRange,
        fitContent: spies.fitContent,
      }),
      priceScale: () => ({ applyOptions: spies.priceScaleApplyOptions, width: () => 64 }),
      remove: vi.fn(),
    })),
  };

  return { module, spies };
}

/** jsdom has no ResizeObserver; the chart's geometry ownership is W1's concern. */
export function stubResizeObserver(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
}

/** Gives the chart container a measurable box, which jsdom otherwise reports as 0×0. */
export function stubContainerBox(width: number, height: number): void {
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
