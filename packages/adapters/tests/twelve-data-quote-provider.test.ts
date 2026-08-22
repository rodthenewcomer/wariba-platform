import { describe, expect, it, vi } from 'vitest';
import {
  TwelveDataQuoteProvider,
  parseTwelveDataQuoteSymbols,
} from '../src/twelve-data-quote-provider';
import { MarketDataProviderBlockedError } from '../src/fcs-market-data-provider';
import type { SymbolSimConfig, TradableSymbol } from '../src/market-data-provider';

const SPECS = {
  EURUSD: {
    basePrice: '1.08450',
    pricePrecision: 5,
    spreadPoints: '10',
    staleThresholdMs: 60_000,
  },
} as unknown as Record<TradableSymbol, SymbolSimConfig>;

function stub(body: unknown): { fetchImpl: typeof fetch; urls: URL[] } {
  const urls: URL[] = [];
  const fetchImpl = (async (input: Parameters<typeof fetch>[0]) => {
    urls.push(new URL(String(input)));
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { fetchImpl, urls };
}

function provider(fetchImpl: typeof fetch): TwelveDataQuoteProvider {
  return new TwelveDataQuoteProvider(
    {
      apiKey: 'test-key',
      baseUrl: 'https://api.twelvedata.com',
      symbols: parseTwelveDataQuoteSymbols('EURUSD=EUR/USD', SPECS),
    },
    fetchImpl,
  );
}

describe('parseTwelveDataQuoteSymbols', () => {
  it('takes the dealing spread from the symbol spec, not from the provider', () => {
    expect(parseTwelveDataQuoteSymbols('EURUSD=EUR/USD', SPECS)).toEqual({
      EURUSD: {
        providerSymbol: 'EUR/USD',
        spreadPoints: '10',
        pricePrecision: 5,
        staleThresholdMs: 60_000,
      },
    });
  });

  it('ignores a symbol with no spec rather than inventing one', () => {
    expect(parseTwelveDataQuoteSymbols('NAS100=NDX', SPECS)).toEqual({});
  });
});

describe('TwelveDataQuoteProvider', () => {
  it('refuses to construct without a credential', () => {
    expect(
      () =>
        new TwelveDataQuoteProvider({
          apiKey: '',
          baseUrl: 'https://api.twelvedata.com',
          symbols: {},
        }),
    ).toThrow(MarketDataProviderBlockedError);
  });

  it('does not claim bid/ask it never receives', () => {
    const instance = provider(stub({}).fetchImpl);
    expect(instance.source.capabilities.realtimeQuotes).toBe(true);
    // The plan publishes one price; the spread is WariX's own simulation.
    expect(instance.source.capabilities.bidAsk).toBe(false);
    expect(instance.source.capabilities.historicalBars).toBe(false);
  });

  it('shares a vendor name with the historical adapter, which is what lets the cutover attach', () => {
    expect(provider(stub({}).fetchImpl).providerName).toBe('twelve-data');
  });

  it('builds a tick from the genuine mid and the configured spread', async () => {
    const { fetchImpl } = stub({ price: '1.16761' });
    const instance = provider(fetchImpl);
    const ticks: { bid: string; ask: string }[] = [];
    instance.subscribe(['EURUSD'], (tick) => ticks.push(tick));
    instance.start();
    instance.stop();
    await vi.waitFor(() => expect(ticks.length).toBeGreaterThan(0));
    // 10 points at 5-decimal precision is 0.0001 total, so ±0.00005 around the mid.
    expect(ticks[0]?.bid).toBe('1.16756');
    expect(ticks[0]?.ask).toBe('1.16766');
  });

  it('reads the multi-symbol response shape as well as the single one', async () => {
    const { fetchImpl } = stub({ 'EUR/USD': { price: '1.16800' } });
    const instance = provider(fetchImpl);
    const ticks: { bid: string }[] = [];
    instance.subscribe(['EURUSD'], (tick) => ticks.push(tick));
    instance.start();
    instance.stop();
    await vi.waitFor(() => expect(ticks.length).toBeGreaterThan(0));
    expect(ticks[0]?.bid).toBe('1.16795');
  });

  it('reports an unmapped symbol as closed rather than quoting it', () => {
    const instance = provider(stub({ price: '1.16761' }).fetchImpl);
    expect(instance.getMarketStatus('GBPUSD')).toBe('closed');
    expect(() => instance.getSnapshot('GBPUSD')).toThrow();
  });

  it('reports a symbol as closed until a genuine quote has arrived', () => {
    const instance = provider(stub({ price: '1.16761' }).fetchImpl);
    expect(instance.getMarketStatus('EURUSD')).toBe('closed');
  });

  it('keeps the last genuine quote when a poll fails, and invents nothing', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ price: '1.16761' }), { status: 200 });
      }
      return new Response('{}', { status: 500 });
    }) as typeof fetch;
    const instance = provider(fetchImpl);
    instance.start();
    instance.stop();
    await vi.waitFor(() => expect(instance.getMarketStatus('EURUSD')).toBe('open'));
    const before = instance.getSnapshot('EURUSD');
    await instance['poll']();
    expect(instance.getSnapshot('EURUSD').bid).toBe(before.bid);
  });
});
