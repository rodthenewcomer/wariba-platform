'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { MarketTick, PositionDTO, TradableSymbol } from '@wariba/contracts';
import type { RealtimeConnectionState } from '../../../lib/realtime-client';

export interface FillMarker {
  id: string;
  symbol: TradableSymbol;
  time: number;
  price: number;
  side: 'buy' | 'sell';
  effect: 'open' | 'close';
}

export interface TradeChartProps {
  symbol: TradableSymbol;
  tick: MarketTick | null;
  positions: PositionDTO[];
  fills: FillMarker[];
  connectionState: RealtimeConnectionState;
}

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

const TIMEFRAMES = [
  { label: '5s', seconds: 5 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
] as const;

function readToken(element: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value || fallback;
}

function bucketStart(unixSeconds: number, timeframeSeconds: number): UTCTimestamp {
  return (Math.floor(unixSeconds / timeframeSeconds) * timeframeSeconds) as UTCTimestamp;
}

/**
 * UX Architecture §22.6 — chandeliers, sélection timeframe, crosshair, zoom,
 * pan, lignes position, lignes SL/TP, prix bid/ask, historique d'exécution,
 * thème adapté. Crosshair/zoom/pan are lightweight-charts defaults, not
 * built here.
 *
 * DATA-003 (same constraint PriceChart.tsx documented): no tick history is
 * persisted or fetched anywhere in this system — candles are built purely
 * from ticks received while this component is mounted, starting empty on
 * every mount and every symbol/timeframe change. This is why timeframes are
 * limited to a few short live-aggregatable windows rather than the usual
 * 1m/5m/1h/1d menu — a genuine, documented limitation (Prompt 07's own
 * "sélection timeframe (limitée et documentée)"), not an oversight.
 *
 * Fill markers (§22.6 "historique d'exécution") are restored from
 * AccountSnapshot.recentFills and updated from order_result. Tick candles
 * remain session-local because DATA-003 does not persist market history.
 */
interface ChartColors {
  bid: string;
  ask: string;
  position: string;
  stopLoss: string;
  takeProfit: string;
  axis: string;
}

export function TradeChart({ symbol, tick, positions, fills, connectionState }: TradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const bidLineRef = useRef<IPriceLine | null>(null);
  const askLineRef = useRef<IPriceLine | null>(null);
  const positionLinesRef = useRef<IPriceLine[]>([]);
  const candlesRef = useRef<Map<number, Candle>>(new Map());
  // lightweight-charts renders to canvas and never resolves CSS custom
  // properties itself — a raw 'var(...)' string crashes it (the same class
  // of bug fixed in PriceChart.tsx earlier in Prompt 07). Every color used
  // anywhere in this component is resolved to a real hex value once, here,
  // and reused from this ref — never passed as a live 'var(...)' string.
  const colorsRef = useRef<ChartColors>({
    bid: '#3673C9',
    ask: '#BE6945',
    position: '#6684FF',
    stopLoss: '#C94D4D',
    takeProfit: '#258A61',
    axis: '#3A4251',
  });
  const [timeframeSeconds, setTimeframeSeconds] = useState<number>(TIMEFRAMES[0].seconds);

  const isStale = tick?.marketStatus === 'stale';
  const isDisconnected = connectionState !== 'open';

  // Chart instance — created once, torn down on unmount. Theme tokens are
  // read once at creation (WariX is always-dark, not user-togglable, so no
  // re-read-on-theme-change needed — see (trade)/layout.tsx).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const background = readToken(container, '--wariba-chart-background', '#0B0D12');
    const gridColor = readToken(container, '--wariba-chart-grid', '#272D3A');
    const textColor = readToken(container, '--wariba-chart-text-secondary', '#9AA3B1');
    const axisColor = readToken(container, '--wariba-chart-axis', '#3A4251');
    const crosshairColor = readToken(container, '--wariba-chart-crosshair', '#9AA3B1');
    const upColor = readToken(container, '--wariba-chart-candle-up', '#258A61');
    const downColor = readToken(container, '--wariba-chart-candle-down', '#C94D4D');
    colorsRef.current = {
      bid: readToken(container, '--wariba-chart-bid', '#3673C9'),
      ask: readToken(container, '--wariba-chart-ask', '#BE6945'),
      position: readToken(container, '--wariba-chart-position', '#6684FF'),
      stopLoss: readToken(container, '--wariba-chart-stop-loss', '#C94D4D'),
      takeProfit: readToken(container, '--wariba-chart-take-profit', '#258A61'),
      axis: axisColor,
    };

    const chart = createChart(container, {
      height: 320,
      layout: { background: { color: background }, textColor },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor: axisColor },
      timeScale: { borderColor: axisColor, timeVisible: true, secondsVisible: true },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: crosshairColor, labelBackgroundColor: crosshairColor },
        horzLine: { color: crosshairColor, labelBackgroundColor: crosshairColor },
      },
    });
    const series = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      bidLineRef.current = null;
      askLineRef.current = null;
      positionLinesRef.current = [];
    };
  }, []);

  // Symbol or timeframe change: no historical data to re-derive from
  // (DATA-003), so start the candle buffer over rather than show a
  // misleading mix of two symbols'/timeframes' bars.
  useEffect(() => {
    candlesRef.current = new Map();
    seriesRef.current?.setData([]);
    seriesRef.current?.setMarkers([]);
  }, [symbol, timeframeSeconds]);

  // New tick for the selected symbol: update or start the current bucket's candle.
  useEffect(() => {
    if (!tick || !seriesRef.current) return;
    const mid = (Number(tick.bid) + Number(tick.ask)) / 2;
    const unixSeconds = Math.floor(new Date(tick.timestamp).getTime() / 1000);
    const time = bucketStart(unixSeconds, timeframeSeconds);
    const existing = candlesRef.current.get(time);
    const candle: Candle = existing
      ? {
          time,
          open: existing.open,
          high: Math.max(existing.high, mid),
          low: Math.min(existing.low, mid),
          close: mid,
        }
      : { time, open: mid, high: mid, low: mid, close: mid };
    candlesRef.current.set(time, candle);
    seriesRef.current.update(candle);

    // Bid/ask price lines (§23.2 "prix bid/ask distincts") — replaced each
    // tick rather than moved, createPriceLine has no update-in-place API.
    if (bidLineRef.current) seriesRef.current.removePriceLine(bidLineRef.current);
    if (askLineRef.current) seriesRef.current.removePriceLine(askLineRef.current);
    bidLineRef.current = seriesRef.current.createPriceLine({
      price: Number(tick.bid),
      color: colorsRef.current.bid,
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: 'Bid',
    });
    askLineRef.current = seriesRef.current.createPriceLine({
      price: Number(tick.ask),
      color: colorsRef.current.ask,
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: 'Ask',
    });
  }, [tick, timeframeSeconds]);

  // Position + SL/TP lines for the selected symbol — rebuilt whenever the
  // open-position list changes (a fill, a close, an SL/TP edit).
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of positionLinesRef.current) series.removePriceLine(line);
    positionLinesRef.current = [];

    for (const position of positions) {
      positionLinesRef.current.push(
        series.createPriceLine({
          price: Number(position.averageOpenPrice),
          color: colorsRef.current.position,
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: position.side === 'buy' ? 'Achat' : 'Vente',
        }),
      );
      if (position.stopLoss) {
        positionLinesRef.current.push(
          series.createPriceLine({
            price: Number(position.stopLoss),
            color: colorsRef.current.stopLoss,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'SL',
          }),
        );
      }
      if (position.takeProfit) {
        positionLinesRef.current.push(
          series.createPriceLine({
            price: Number(position.takeProfit),
            color: colorsRef.current.takeProfit,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'TP',
          }),
        );
      }
    }
  }, [positions]);

  // Fill markers (§22.6 "historique d'exécution") — session-only, see the
  // component doc comment above for why nothing retroactive is possible.
  useEffect(() => {
    if (!seriesRef.current) return;
    const markers: SeriesMarker<Time>[] = fills
      .map((fill) => ({
        time: fill.time as UTCTimestamp,
        position: (fill.side === 'buy' ? 'belowBar' : 'aboveBar') as 'belowBar' | 'aboveBar',
        color: fill.effect === 'open' ? colorsRef.current.position : colorsRef.current.axis,
        shape: (fill.side === 'buy' ? 'arrowUp' : 'arrowDown') as 'arrowUp' | 'arrowDown',
        text: `${fill.effect === 'open' ? 'Ouverture' : 'Clôture'} ${fill.price}`,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
    seriesRef.current.setMarkers(markers);
  }, [fills]);

  const overlayLabel = useMemo(() => {
    if (isDisconnected)
      return connectionState === 'resyncing' ? 'Resynchronisation…' : 'Reconnexion…';
    if (isStale) return 'Prix obsolète';
    return null;
  }, [isDisconnected, isStale, connectionState]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.seconds}
              type="button"
              onClick={() => setTimeframeSeconds(tf.seconds)}
              className={`rounded-[var(--wariba-radius-sm)] px-2 py-1 text-[length:var(--wariba-font-size-label-sm)] ${
                tf.seconds === timeframeSeconds
                  ? 'bg-[color:var(--wariba-surface-selected)] text-[color:var(--wariba-theme-text)]'
                  : 'text-[color:var(--wariba-text-secondary)]'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          UTC
        </span>
      </div>
      <div className="relative">
        <div ref={containerRef} className="w-full" />
        {overlayLabel && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[color:var(--wariba-chart-background)]/60">
            <span className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-elevated)] px-3 py-1.5 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-status-warning-text)]">
              {overlayLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
