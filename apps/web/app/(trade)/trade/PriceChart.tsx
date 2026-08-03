'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { MarketTick } from '@wariba/contracts';

/**
 * DATA-003: no tick history is persisted or fetched — the chart starts
 * empty and builds up purely from ticks received while this connection is
 * open. Mid price (bid+ask)/2, since a single line series is enough for
 * V1 (Prompt 07 gets the full candle/depth treatment).
 */
export function PriceChart({ tick }: { tick: MarketTick | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height: 280,
      layout: { background: { color: 'transparent' }, textColor: 'var(--wariba-theme-text)' },
      grid: {
        vertLines: { color: 'var(--wariba-theme-border)' },
        horzLines: { color: 'var(--wariba-theme-border)' },
      },
      timeScale: { timeVisible: true, secondsVisible: true },
    });
    const series = chart.addLineSeries({ color: '#4f7cff', lineWidth: 2 });
    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!tick || !seriesRef.current) return;
    const mid = (Number(tick.bid) + Number(tick.ask)) / 2;
    const time = Math.floor(new Date(tick.timestamp).getTime() / 1000) as UTCTimestamp;
    seriesRef.current.update({ time, value: mid });
  }, [tick]);

  return <div ref={containerRef} className="w-full" />;
}
