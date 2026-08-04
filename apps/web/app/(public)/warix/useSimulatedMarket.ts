'use client';

import { useEffect, useRef, useState } from 'react';
import type { UTCTimestamp } from 'lightweight-charts';

export type SimulatedSymbol = 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'XAUUSD' | 'NAS100';

export interface SimulatedCandle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SimulatedSymbolState {
  bid: number;
  ask: number;
  decimals: number;
  candles: SimulatedCandle[];
}

export type SimulatedMarket = Record<SimulatedSymbol, SimulatedSymbolState>;

interface SymbolConfig {
  symbol: SimulatedSymbol;
  basePrice: number;
  spread: number;
  decimals: number;
  volatility: number;
}

export const SIMULATED_SYMBOLS: readonly SymbolConfig[] = [
  { symbol: 'EURUSD', basePrice: 1.0845, spread: 0.0001, decimals: 5, volatility: 0.00007 },
  { symbol: 'GBPUSD', basePrice: 1.26, spread: 0.0002, decimals: 5, volatility: 0.00008 },
  { symbol: 'USDJPY', basePrice: 150.1, spread: 0.02, decimals: 3, volatility: 0.007 },
  { symbol: 'XAUUSD', basePrice: 2340.2, spread: 0.3, decimals: 2, volatility: 0.4 },
  { symbol: 'NAS100', basePrice: 18020, spread: 2, decimals: 1, volatility: 4 },
];

const TICK_INTERVAL_MS = 1500;
const CANDLE_BUCKET_SECONDS = 15;
const MAX_CANDLES = 60;

export function formatSimulatedPrice(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function nextMid(previous: number, config: SymbolConfig): number {
  const delta = (Math.random() - 0.5) * 2 * config.volatility;
  const floor = config.basePrice * 0.985;
  const ceiling = config.basePrice * 1.015;
  return Math.min(ceiling, Math.max(floor, previous + delta));
}

function bucketStart(date: Date): UTCTimestamp {
  const seconds = Math.floor(date.getTime() / 1000);
  return (seconds - (seconds % CANDLE_BUCKET_SECONDS)) as UTCTimestamp;
}

function initialState(): SimulatedMarket {
  const now = bucketStart(new Date());
  const state = {} as SimulatedMarket;
  for (const config of SIMULATED_SYMBOLS) {
    state[config.symbol] = {
      bid: config.basePrice - config.spread / 2,
      ask: config.basePrice + config.spread / 2,
      decimals: config.decimals,
      candles: [
        {
          time: now,
          open: config.basePrice,
          high: config.basePrice,
          low: config.basePrice,
          close: config.basePrice,
        },
      ],
    };
  }
  return state;
}

function initialMids(): Record<SimulatedSymbol, number> {
  return Object.fromEntries(SIMULATED_SYMBOLS.map((config) => [config.symbol, config.basePrice])) as Record<
    SimulatedSymbol,
    number
  >;
}

/**
 * Client-only demo market data: a bounded random walk per symbol, aggregated
 * into OHLC candles. No network calls, never represents a real market —
 * WariXTerminal keeps the "Démonstration" labeling visible wherever this
 * feeds the UI (Prompt Pack forbidden-actions list: no fake live proof).
 */
export function useSimulatedMarket(): SimulatedMarket {
  const [market, setMarket] = useState<SimulatedMarket>(initialState);
  const midsRef = useRef<Record<SimulatedSymbol, number>>(initialMids());

  useEffect(() => {
    const interval = setInterval(() => {
      const bucket = bucketStart(new Date());
      setMarket((previous) => {
        const next = { ...previous };
        for (const config of SIMULATED_SYMBOLS) {
          const mid = nextMid(midsRef.current[config.symbol], config);
          midsRef.current[config.symbol] = mid;
          const bid = mid - config.spread / 2;
          const ask = mid + config.spread / 2;
          const priorState = previous[config.symbol];
          const priorCandles = priorState.candles;
          const lastCandle = priorCandles[priorCandles.length - 1];

          let candles: SimulatedCandle[];
          if (lastCandle && lastCandle.time === bucket) {
            const updated: SimulatedCandle = {
              ...lastCandle,
              high: Math.max(lastCandle.high, mid),
              low: Math.min(lastCandle.low, mid),
              close: mid,
            };
            candles = [...priorCandles.slice(0, -1), updated];
          } else {
            const opened: SimulatedCandle = {
              time: bucket,
              open: mid,
              high: mid,
              low: mid,
              close: mid,
            };
            candles = [...priorCandles, opened].slice(-MAX_CANDLES);
          }

          next[config.symbol] = { ...priorState, bid, ask, candles };
        }
        return next;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return market;
}
