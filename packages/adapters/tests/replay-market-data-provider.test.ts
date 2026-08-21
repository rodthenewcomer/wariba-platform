import { describe, expect, it } from 'vitest';
import { ReplayMarketDataProvider, type RecordedTick } from '../src/replay-market-data-provider';

const RECORDING: RecordedTick[] = [
  { symbol: 'EURUSD', bid: '1.08000', ask: '1.08010', offsetMs: 0 },
  { symbol: 'EURUSD', bid: '1.08020', ask: '1.08030', offsetMs: 1000 },
  { symbol: 'EURUSD', bid: '1.08040', ask: '1.08050', offsetMs: 2000 },
];

describe('ReplayMarketDataProvider', () => {
  it('derives stable source identity from the recording and exposes no invented capabilities', () => {
    const first = new ReplayMarketDataProvider(RECORDING, ['EURUSD'], 1000, false);
    const same = new ReplayMarketDataProvider(RECORDING, ['EURUSD'], 1000, false);
    const changed = new ReplayMarketDataProvider(
      [...RECORDING, { symbol: 'EURUSD', bid: '1.08100', ask: '1.08110', offsetMs: 3000 }],
      ['EURUSD'],
      1000,
      false,
    );

    expect(first.source).toEqual(same.source);
    expect(first.source.id).not.toBe(changed.source.id);
    const looping = new ReplayMarketDataProvider(RECORDING, ['EURUSD'], 1000, true);
    expect(first.source.id).not.toBe(looping.source.id);
    expect(first.source.capabilities).toMatchObject({
      historicalBars: false,
      volume: false,
      depth: false,
    });
  });

  it('replays recorded ticks in order as time advances', () => {
    const provider = new ReplayMarketDataProvider(RECORDING, ['EURUSD'], 1000, false);
    expect(provider.getSnapshot('EURUSD').bid).toBe('1.08000');
  });

  it('never fabricates a price for a symbol with no recorded ticks', () => {
    const provider = new ReplayMarketDataProvider(RECORDING, ['GBPUSD'], 1000, false);
    expect(provider.getSnapshot('GBPUSD').marketStatus).toBe('closed');
  });

  it('reports stale once a non-looping recording is exhausted, never advancing past the last real tick', () => {
    const provider = new ReplayMarketDataProvider(RECORDING, ['EURUSD'], 1000, false);
    const ticks = Array.from({ length: 5 }, (_, i) =>
      provider.tick(new Date(Date.now() + i * 1000)),
    ).flat();
    const last = ticks[ticks.length - 1];
    expect(last?.marketStatus).toBe('stale');
    expect(last?.bid).toBe('1.08040');
  });

  it('notifies subscribers only for their subscribed symbol', () => {
    const provider = new ReplayMarketDataProvider(RECORDING, ['EURUSD'], 1000, true);
    const received: string[] = [];
    provider.subscribe(['EURUSD'], (tick) => received.push(tick.symbol));
    provider.tick(new Date());
    expect(received).toEqual(['EURUSD']);
  });

  it('reports its provider name as replay', () => {
    const provider = new ReplayMarketDataProvider(RECORDING, ['EURUSD'], 1000, true);
    expect(provider.providerName).toBe('replay');
  });
});
