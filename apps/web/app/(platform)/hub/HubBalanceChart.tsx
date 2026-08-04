'use client';

import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import type { BalancePoint } from '@wariba/application';

function readToken(element: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value || fallback;
}

export interface HubBalanceChartProps {
  points: readonly BalancePoint[];
  height?: number;
}

/**
 * Real chart (lightweight-charts — the same library WariX uses), not a
 * static image: a filled area series of the account's realized daily
 * balance (account_daily_snapshots). Uses the Hub's general theme tokens,
 * light by default (Design System §28.1) — not WariX's always-dark chart
 * tokens, which would render a mismatched dark canvas here.
 */
export function HubBalanceChart({ points, height = 220 }: HubBalanceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const background = readToken(container, '--wariba-background-surface', '#FFFFFF');
    const grid = readToken(container, '--wariba-border-subtle', '#E8DFD1');
    const textSecondary = readToken(container, '--wariba-text-secondary', '#555E6E');
    const lineColor = readToken(container, '--wariba-action-primary', '#3157F5');

    const chart = createChart(container, {
      height,
      layout: { background: { color: background }, textColor: textSecondary },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      timeScale: { borderColor: grid },
      rightPriceScale: { borderColor: grid },
    });

    const series = chart.addAreaSeries({
      lineColor,
      topColor: `${lineColor}33`,
      bottomColor: `${lineColor}00`,
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    seriesRef.current?.setData(points.map((point) => ({ time: point.time, value: point.balance })));
  }, [points]);

  if (points.length === 0) {
    return (
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        L’historique apparaîtra après votre première journée de trading.
      </p>
    );
  }

  return <div ref={containerRef} className="w-full" />;
}
