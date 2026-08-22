import type { MarketDataProvider, MarketTick, TradableSymbol } from '@wariba/adapters';
import { describe, expect, it } from 'vitest';
import { MarketSequenceContinuityProvider } from '../src/market-sequence-continuity';

function rawTick(symbol: TradableSymbol, sequence: number): MarketTick {
  return {
    symbol,
    bid: '1.08450',
    ask: '1.08460',
    timestamp: new Date(sequence * 1000).toISOString(),
    sequence,
    marketStatus: 'open',
  };
}

function provider(): MarketDataProvider & { emit(tick: MarketTick): void } {
  const listeners = new Set<(tick: MarketTick) => void>();
  const snapshots = new Map<TradableSymbol, MarketTick>([
    ['EURUSD', rawTick('EURUSD', 0)],
    ['XAUUSD', rawTick('XAUUSD', 7)],
  ]);
  return {
    providerName: 'fixture',
    source: {
      id: 'fixture:test:v1',
      provider: 'fixture',
      environment: 'test',
      mode: 'sandbox',
      version: 'v1',
      capabilities: {
        realtimeQuotes: true,
        bidAsk: true,
        historicalBars: false,
        nativeIntervals: [],
        pagination: 'none',
        volume: false,
        depth: false,
      },
    },
    start: () => {},
    stop: () => {},
    getSnapshot: (symbol) => {
      const tick = snapshots.get(symbol);
      if (!tick) throw new Error('missing fixture snapshot');
      return tick;
    },
    getMarketStatus: () => 'open',
    subscribe: (_symbols, listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit: (tick) => {
      snapshots.set(tick.symbol, tick);
      for (const listener of listeners) listener(tick);
    },
  };
}

describe('MarketSequenceContinuityProvider', () => {
  it('continues after a persisted watermark and survives a provider counter reset', () => {
    const raw = provider();
    const continuous = new MarketSequenceContinuityProvider(raw, { EURUSD: 40 });
    const received: number[] = [];
    continuous.subscribe(['EURUSD'], (tick) => received.push(tick.sequence));

    expect(continuous.getSnapshot('EURUSD').sequence).toBe(41);
    expect(continuous.getSnapshot('EURUSD').sequence).toBe(41);
    raw.emit(rawTick('EURUSD', 1));
    raw.emit(rawTick('EURUSD', 2));
    raw.emit(rawTick('EURUSD', 0));
    raw.emit(rawTick('EURUSD', 1));

    expect(received).toEqual([42, 43, 44, 45]);
  });

  it('preserves an already-ahead sequence and leaves another symbol independent', () => {
    const raw = provider();
    const continuous = new MarketSequenceContinuityProvider(raw, { EURUSD: 4 });

    expect(continuous.getSnapshot('XAUUSD').sequence).toBe(7);
    raw.emit(rawTick('EURUSD', 10));
    expect(continuous.getSnapshot('EURUSD').sequence).toBe(10);
  });
});
