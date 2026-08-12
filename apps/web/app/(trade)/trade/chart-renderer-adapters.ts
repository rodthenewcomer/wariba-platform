'use client';

import type {
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
  UTCTimestamp,
  WhitespaceData,
} from 'lightweight-charts';
import type { MarketCandle } from '@wariba/contracts';
import type { ChartCoordinateAdapter } from './chart-drawing-geometry';
import type { IndicatorSeriesRenderer } from './chart-indicator-engine';
import type { IndicatorPoint } from './chart-indicator-math';
import type { ChartIndicator } from './chart-indicator-model';

/**
 * The renderer boundary — W5 §46, and the practical half of W0's ARCH-028.
 *
 * This is the **only** W5 module that imports `lightweight-charts`. Everything
 * above it — the indicator engine, the indicator math, the drawing model, the
 * drawing geometry, the tool state machine, the overlay component — works in
 * plain numbers and decimal strings. Swapping the chart engine means rewriting
 * this file and nothing else, which is exactly the seam W0 said it wanted and
 * did not yet have.
 *
 * Two adapters live here because they are the two directions the same boundary
 * is crossed in: one writes analytical series *into* the renderer, the other
 * reads coordinates *out* of it.
 */

/** W3 §43's number-conversion rule, applied to an indicator point. */
function toRendererPoint(point: IndicatorPoint): LineData<Time> | WhitespaceData<Time> {
  // A whitespace item — `{ time }` with no `value` — is what makes
  // lightweight-charts break the line instead of connecting across it (§32).
  return point.value === null
    ? { time: point.time as UTCTimestamp }
    : { time: point.time as UTCTimestamp, value: point.value };
}

/**
 * W5 §123 — explicit series ownership.
 *
 * One line series per enabled indicator, tracked by id in a map this adapter
 * owns. Series are created and destroyed only through these methods, never as a
 * side effect of a React render, so the count is a function of the enabled set
 * and nothing else. `removeAll` runs on unmount and is what keeps repeated
 * symbol/timeframe/indicator churn from accumulating renderer objects (§122).
 */
export function createIndicatorSeriesRenderer(chart: IChartApi): IndicatorSeriesRenderer & {
  removeAll(): void;
  count(): number;
} {
  const series = new Map<string, ISeriesApi<'Line'>>();

  return {
    create(indicator: ChartIndicator) {
      const existing = series.get(indicator.id);
      if (existing) {
        // Style or period changed: re-style in place rather than churning the
        // series object, which would drop its data and its z-order.
        existing.applyOptions({
          color: indicator.style.color,
          lineWidth: indicator.style.width,
        });
        return;
      }
      series.set(
        indicator.id,
        chart.addLineSeries({
          color: indicator.style.color,
          lineWidth: indicator.style.width,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        }),
      );
    },
    remove(id) {
      const target = series.get(id);
      if (!target) return;
      chart.removeSeries(target);
      series.delete(id);
    },
    setData(id, points) {
      series.get(id)?.setData(points.map(toRendererPoint));
    },
    update(id, point) {
      series.get(id)?.update(toRendererPoint(point));
    },
    removeAll() {
      for (const target of series.values()) chart.removeSeries(target);
      series.clear();
    },
    count: () => series.size,
  };
}

export interface CoordinateAdapterDeps {
  chart(): IChartApi | null;
  series(): ISeriesApi<'Candlestick'> | null;
  container(): HTMLElement | null;
  /** Ascending candle start times currently loaded — the snap targets for §47. */
  candleTimes(): readonly number[];
  pricePrecision(): number | null;
}

/**
 * W5 §46/§47 — the one adapter that converts between market facts and pixels.
 *
 * Reads its dependencies through callbacks rather than capturing them, so it
 * stays valid across chart re-creation, symbol change and hydration without the
 * drawing layer ever holding a chart handle.
 *
 * `xToTime` **snaps to a loaded candle time**. A trader clicking between bars
 * gets the nearest real bar, not an invented timestamp: a drawing anchored to a
 * second no candle occupies would be a claim about a bar that does not exist,
 * and would jump the moment the chart was rendered at a different zoom.
 * Price is not snapped — it is continuous on the price scale, and the tick
 * rounding that matters for *orders* is the domain's job, not a drawing's.
 */
export function createCoordinateAdapter(deps: CoordinateAdapterDeps): ChartCoordinateAdapter {
  return {
    timeToX(time) {
      const chart = deps.chart();
      if (!chart) return null;
      const x = chart.timeScale().timeToCoordinate(time as UTCTimestamp);
      return x === null ? null : Number(x);
    },
    priceToY(price) {
      const series = deps.series();
      if (!series) return null;
      const value = Number(price);
      if (!Number.isFinite(value)) return null;
      const y = series.priceToCoordinate(value);
      return y === null ? null : Number(y);
    },
    xToTime(x) {
      const times = deps.candleTimes();
      if (times.length === 0) return null;
      const chart = deps.chart();
      if (!chart) return null;
      const logical = chart.timeScale().coordinateToLogical(x);
      if (logical === null) return times.at(-1) ?? null;
      // Clamped rather than rejected: clicking past the live edge (the right
      // margin) is a normal gesture and should anchor to the newest bar.
      const index = Math.min(times.length - 1, Math.max(0, Math.round(Number(logical))));
      return times[index] ?? null;
    },
    yToPrice(y) {
      const series = deps.series();
      if (!series) return null;
      const raw = series.coordinateToPrice(y);
      if (raw === null || !Number.isFinite(Number(raw))) return null;
      const precision = deps.pricePrecision();
      return precision === null ? String(raw) : Number(raw).toFixed(precision);
    },
    width: () => deps.container()?.clientWidth ?? 0,
    height: () => deps.container()?.clientHeight ?? 0,
  };
}

/** The candle series' data as the renderer holds it — W3 §43's conversion, reused. */
export function toRendererCandle(candle: MarketCandle) {
  return {
    time: candle.startTime as UTCTimestamp,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}
