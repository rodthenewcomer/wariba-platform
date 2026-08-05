'use client';

import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { motion } from 'motion/react';
import type { SimulatedCandle } from './useSimulatedMarket';

function readToken(element: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value || fallback;
}

export interface WariXChartProps {
  candles: readonly SimulatedCandle[];
  height?: number;
}

/**
 * Real TradingView chart tech (lightweight-charts — the same library already
 * used by the authenticated Trade platform's PriceChart.tsx), not a static
 * screenshot. Candle colors are resolved from --wariba-chart-* tokens at
 * mount, since the canvas renderer needs concrete hex values rather than
 * CSS var() strings.
 */
export function WariXChart({ candles, height = 360 }: WariXChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const background = readToken(container, '--wariba-chart-background', '#0B0D12');
    const grid = readToken(container, '--wariba-chart-grid', '#272D3A');
    const textPrimary = readToken(container, '--wariba-chart-text-primary', '#E3E6EB');
    const candleUp = readToken(container, '--wariba-chart-candle-up', '#258A61');
    const candleDown = readToken(container, '--wariba-chart-candle-down', '#C94D4D');

    const chart = createChart(container, {
      height,
      layout: { background: { color: background }, textColor: textPrimary },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      timeScale: { timeVisible: true, secondsVisible: true, borderColor: grid },
      rightPriceScale: { borderColor: grid },
    });

    const series = chart.addCandlestickSeries({
      upColor: candleUp,
      downColor: candleDown,
      borderUpColor: candleUp,
      borderDownColor: candleDown,
      wickUpColor: candleUp,
      wickDownColor: candleDown,
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
  }, []);

  useEffect(() => {
    seriesRef.current?.setData([...candles]);
  }, [candles]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      ref={containerRef}
      className="w-full"
    />
  );
}
