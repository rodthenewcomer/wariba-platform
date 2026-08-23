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
 * The account's realised daily balance, drawn with the same library the
 * workstation uses rather than shipped as an image.
 *
 * It reads the Hub's own material tokens at mount instead of the general
 * light-first ones it used to: the shell runs the graphite ladder, and a
 * chart painting `--wariba-background-surface` produced a panel a shade off
 * from the module it sits inside.
 *
 * Whether this should render at all is not decided here. `AccountEvolution`
 * asks the read model, because "is there enough history to be worth drawing"
 * is a question about the data, and a chart component that quietly decides not
 * to draw is a chart component that will one day quietly decide to.
 */
export function HubBalanceChart({ points, height = 240 }: HubBalanceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const background = readToken(container, '--warix-panel', '#0D111A');
    const grid = readToken(container, '--warix-border-subtle', '#272D3A');
    const textSecondary = readToken(container, '--wariba-text-tertiary', '#9AA3B1');
    const lineColor = readToken(container, '--warix-accent-cobalt', '#6684FF');

    const chart = createChart(container, {
      height,
      layout: { background: { color: background }, textColor: textSecondary },
      // Horizontal rules only. Vertical grid lines on a daily balance series
      // add ink without adding a reading — the dates are already on the axis.
      grid: { vertLines: { visible: false }, horzLines: { color: grid } },
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

  // Defensive only: `AccountEvolution` already refuses to mount this without
  // a series worth drawing.
  if (points.length === 0) return null;

  return <div ref={containerRef} className="w-full" />;
}
