import { describe, expect, it } from 'vitest';
import {
  MockMarketDataProvider,
  SANDBOX_BASE_PRICES,
  type TradableSymbol,
} from '../src/market-data-provider';

const CONFIG = {
  EURUSD: {
    basePrice: SANDBOX_BASE_PRICES.EURUSD,
    pricePrecision: 5,
    spreadPoints: '10',
    staleThresholdMs: 5000,
  },
  GBPUSD: {
    basePrice: SANDBOX_BASE_PRICES.GBPUSD,
    pricePrecision: 5,
    spreadPoints: '15',
    staleThresholdMs: 5000,
  },
  USDJPY: {
    basePrice: SANDBOX_BASE_PRICES.USDJPY,
    pricePrecision: 3,
    spreadPoints: '12',
    staleThresholdMs: 5000,
  },
  XAUUSD: {
    basePrice: SANDBOX_BASE_PRICES.XAUUSD,
    pricePrecision: 2,
    spreadPoints: '30',
    staleThresholdMs: 5000,
  },
  NAS100: {
    basePrice: SANDBOX_BASE_PRICES.NAS100,
    pricePrecision: 1,
    spreadPoints: '20',
    staleThresholdMs: 5000,
  },
} as const;

describe('MockMarketDataProvider — DATA-001/002 determinism', () => {
  it('produces the exact same tick sequence for the same seed', () => {
    const providerA = new MockMarketDataProvider(42, CONFIG);
    const providerB = new MockMarketDataProvider(42, CONFIG);

    const now = new Date();
    const seqA = Array.from({ length: 5 }, () => providerA.tick(now));
    const seqB = Array.from({ length: 5 }, () => providerB.tick(now));

    expect(seqA).toEqual(seqB);
  });

  it('produces a different sequence for a different seed', () => {
    const providerA = new MockMarketDataProvider(1, CONFIG);
    const providerB = new MockMarketDataProvider(2, CONFIG);
    const now = new Date();

    const tickA = providerA.tick(now);
    const tickB = providerB.tick(now);

    expect(tickA).not.toEqual(tickB);
  });

  it('increments sequence monotonically per symbol', () => {
    const provider = new MockMarketDataProvider(7, CONFIG);
    const now = new Date();
    provider.tick(now);
    provider.tick(now);
    const [thirdTick] = provider.tick(now);
    expect(thirdTick?.sequence).toBe(3);
  });
});

describe('MockMarketDataProvider — bid/ask/precision', () => {
  it('bid is always below ask by exactly the configured spread', () => {
    const provider = new MockMarketDataProvider(3, CONFIG);
    const [tick] = provider.tick(new Date());
    expect(tick).toBeDefined();
    if (!tick) return;
    const spread = Number(tick.ask) - Number(tick.bid);
    expect(spread).toBeCloseTo(0.0001, 6); // EURUSD: 10 points at precision 5 = 0.00010
  });

  it('formats each symbol to its own price precision', () => {
    const provider = new MockMarketDataProvider(9, CONFIG);
    const ticks = provider.tick(new Date());
    const bySymbol = Object.fromEntries(ticks.map((t) => [t.symbol, t])) as Record<
      TradableSymbol,
      (typeof ticks)[number]
    >;
    expect(bySymbol.USDJPY?.bid.split('.')[1]).toHaveLength(3);
    expect(bySymbol.XAUUSD?.bid.split('.')[1]).toHaveLength(2);
    expect(bySymbol.NAS100?.bid.split('.')[1]).toHaveLength(1);
  });
});

describe('MockMarketDataProvider — pause/resume (stale scenario, DATA-005)', () => {
  it('marks a paused symbol as stale and stops advancing its sequence', () => {
    const provider = new MockMarketDataProvider(11, CONFIG);
    provider.pause('EURUSD');
    const before = provider.getSnapshot('EURUSD');
    provider.tick(new Date());
    const after = provider.getSnapshot('EURUSD');

    expect(after.sequence).toBe(before.sequence);
    expect(provider.getMarketStatus('EURUSD')).toBe('stale');
  });

  it('resumes generating ticks after resume()', () => {
    const provider = new MockMarketDataProvider(11, CONFIG);
    provider.pause('EURUSD');
    provider.tick(new Date());
    provider.resume('EURUSD');
    provider.tick(new Date());
    expect(provider.getMarketStatus('EURUSD')).toBe('open');
  });
});

describe('MockMarketDataProvider — subscribe', () => {
  it('notifies subscribers only for the symbols they subscribed to', () => {
    const provider = new MockMarketDataProvider(5, CONFIG);
    const received: string[] = [];
    const unsubscribe = provider.subscribe(['EURUSD'], (tick) => received.push(tick.symbol));

    provider.tick(new Date());
    expect(received).toEqual(['EURUSD']);

    unsubscribe();
    provider.tick(new Date());
    expect(received).toEqual(['EURUSD']); // no new notification after unsubscribe
  });
});
