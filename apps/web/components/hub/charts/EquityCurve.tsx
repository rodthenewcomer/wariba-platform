'use client';

import { createChart, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

/**
 * The account's balance over time, with the lines that actually matter.
 *
 * ## Why the thresholds are the point
 *
 * A balance curve on its own tells a trader where they have been. A balance
 * curve with the maximum-loss floor and the profit target drawn on it tells
 * them how much room they have left and how far they are from finishing —
 * which is the question they opened the page to answer. Topstep draws exactly
 * these two lines for exactly this reason.
 *
 * Both come from the risk engine, already computed and already formatted. This
 * component draws; it does not decide where a floor is.
 *
 * ## Sizing
 *
 * A `ResizeObserver` on the container applies both width and height, the same
 * correction UX-WARIX-002 records for the workstation chart: a `window.resize`
 * handler that only sets width leaves the canvas at its initial height forever,
 * including through a sidebar collapse that never fires a window resize.
 */

export interface EquityPoint {
  /** `YYYY-MM-DD`. */
  time: string;
  value: number;
}

export interface EquityThreshold {
  value: number;
  label: string;
  tone: 'emerald' | 'red' | 'amber' | 'cyan';
}

const TONE_COLOR: Record<EquityThreshold['tone'], string> = {
  emerald: '#36b37e',
  red: '#e05a5a',
  amber: '#e2a53a',
  cyan: '#3fb8c4',
};

function readToken(element: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value || fallback;
}

export function EquityCurve({
  points,
  thresholds = [],
  height = 260,
}: {
  points: readonly EquityPoint[];
  thresholds?: readonly EquityThreshold[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const grid = readToken(container, '--warix-border-subtle', '#272d3a');
    const text = readToken(container, '--wariba-text-tertiary', '#9aa3b1');
    const line = readToken(container, '--wariba-accent-indigo', '#6684ff');

    const chart = createChart(container, {
      height,
      // `transparent` rather than the panel colour: the module already paints
      // a gradient, and a solid canvas on top of it would cut a rectangle out
      // of the surface it is sitting in.
      layout: { background: { color: 'transparent' }, textColor: text, fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: grid } },
      timeScale: { borderColor: grid, fixLeftEdge: true, fixRightEdge: true },
      rightPriceScale: { borderColor: grid, scaleMargins: { top: 0.18, bottom: 0.12 } },
      crosshair: {
        vertLine: { color: line, width: 1, style: 3, labelBackgroundColor: line },
        horzLine: { color: line, width: 1, style: 3, labelBackgroundColor: line },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addAreaSeries({
      lineColor: line,
      topColor: `${line}38`,
      bottomColor: `${line}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height: observed } = entry.contentRect;
      if (width > 0) chart.applyOptions({ width, height: Math.max(160, observed || height) });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setData(points.map((point) => ({ time: point.time, value: point.value })));

    const lines = thresholds.map((threshold) =>
      series.createPriceLine({
        price: threshold.value,
        color: TONE_COLOR[threshold.tone],
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: threshold.label,
      }),
    );

    return () => {
      for (const line of lines) series.removePriceLine(line);
    };
  }, [points, thresholds]);

  return (
    <div className="w-full" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
