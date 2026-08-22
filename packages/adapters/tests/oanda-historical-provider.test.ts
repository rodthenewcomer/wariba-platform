import { describe, expect, it } from 'vitest';
import {
  OandaHistoricalProvider,
  assertOandaEnvironmentAllowed,
  parseOandaSymbolMap,
} from '../src/oanda-historical-provider';
import { MarketDataProviderBlockedError } from '../src/fcs-market-data-provider';

const BASE_URL = 'https://api-fxpractice.oanda.com';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
type FetchHeaders = NonNullable<FetchInit>['headers'];

function stubFetch(
  body: unknown,
  status = 200,
): { fetchImpl: typeof fetch; urls: URL[]; headers: FetchHeaders[] } {
  const urls: URL[] = [];
  const headers: FetchHeaders[] = [];
  const fetchImpl = (async (input: FetchInput, init?: FetchInit) => {
    urls.push(new URL(String(input)));
    if (init?.headers) headers.push(init.headers);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { fetchImpl, urls, headers };
}

function provider(fetchImpl: typeof fetch): OandaHistoricalProvider {
  return new OandaHistoricalProvider(
    {
      apiToken: 'token',
      baseUrl: BASE_URL,
      environment: 'practice',
      symbols: {
        EURUSD: { providerSymbol: 'EUR_USD' },
        XAUUSD: { providerSymbol: 'XAU_USD' },
        NAS100: { providerSymbol: 'NAS100_USD' },
      },
    },
    fetchImpl,
  );
}

function candle(startTime: number, complete = true, volume: number | null = 1200): unknown {
  return {
    time: `${startTime}.000000000`,
    complete,
    ...(volume === null ? {} : { volume }),
    mid: { o: '1.1000', h: '1.1050', l: '1.0950', c: '1.1020' },
  };
}

describe('parseOandaSymbolMap', () => {
  it('parses instrument mappings including metals and indices', () => {
    expect(parseOandaSymbolMap('EURUSD=EUR_USD,XAUUSD=XAU_USD,NAS100=NAS100_USD')).toEqual({
      EURUSD: { providerSymbol: 'EUR_USD' },
      XAUUSD: { providerSymbol: 'XAU_USD' },
      NAS100: { providerSymbol: 'NAS100_USD' },
    });
  });
});

describe('assertOandaEnvironmentAllowed', () => {
  it('refuses production because the licence prohibits third-party display', () => {
    expect(() => assertOandaEnvironmentAllowed('production')).toThrow(
      MarketDataProviderBlockedError,
    );
  });

  it('permits non-production environments', () => {
    expect(() => assertOandaEnvironmentAllowed('local')).not.toThrow();
    expect(() => assertOandaEnvironmentAllowed('staging')).not.toThrow();
  });
});

describe('OandaHistoricalProvider construction', () => {
  it('refuses to construct without a token', () => {
    expect(
      () =>
        new OandaHistoricalProvider({
          apiToken: '',
          baseUrl: BASE_URL,
          environment: 'practice',
          symbols: {},
        }),
    ).toThrow(MarketDataProviderBlockedError);
  });

  it('names the practice environment in the source identity so it cannot be mistaken for production', () => {
    const instance = provider(stubFetch({ candles: [] }).fetchImpl);
    expect(instance.source.id).toContain('oanda:practice:');
    expect(instance.source.environment).toBe('practice');
    // Practice prices are genuine live market data, so the mode says so; the
    // environment is what marks it undisplayable to a customer.
    expect(instance.source.mode).toBe('live');
  });

  it('claims tick volume, which spot FX genuinely has, and no depth', () => {
    const instance = provider(stubFetch({ candles: [] }).fetchImpl);
    expect(instance.source.capabilities.volume).toBe(true);
    expect(instance.source.capabilities.depth).toBe(false);
    expect(instance.supportsTimeframe('3m')).toBe(false);
    expect(instance.supportsSymbol('NAS100')).toBe(true);
  });
});

describe('OandaHistoricalProvider.fetchBars', () => {
  it('pins calendar alignment to UTC so bars match canonical buckets', async () => {
    const { fetchImpl, urls } = stubFetch({ candles: [] });
    await provider(fetchImpl).fetchBars({ symbol: 'EURUSD', timeframe: '1D', limit: 500 });
    const url = urls[0];
    expect(url?.searchParams.get('granularity')).toBe('D');
    expect(url?.searchParams.get('dailyAlignment')).toBe('0');
    expect(url?.searchParams.get('alignmentTimezone')).toBe('UTC');
    expect(url?.searchParams.get('weeklyAlignment')).toBe('Monday');
    expect(url?.searchParams.get('price')).toBe('M');
    expect(url?.pathname).toBe('/v3/instruments/EUR_USD/candles');
  });

  it('sends a bearer token and asks for unix timestamps', async () => {
    const { fetchImpl, headers } = stubFetch({ candles: [] });
    await provider(fetchImpl).fetchBars({ symbol: 'EURUSD', timeframe: '1D', limit: 10 });
    expect(headers[0]).toMatchObject({
      Authorization: 'Bearer token',
      'Accept-Datetime-Format': 'UNIX',
    });
  });

  it('uses count with a cursor and drops count when both bounds are given', async () => {
    const before = Date.UTC(2026, 7, 20) / 1000;
    const after = Date.UTC(2026, 7, 10) / 1000;
    const cursorOnly = stubFetch({ candles: [] });
    await provider(cursorOnly.fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 300,
      before,
    });
    expect(cursorOnly.urls[0]?.searchParams.get('count')).toBe('300');
    expect(cursorOnly.urls[0]?.searchParams.get('to')).toBe(String(before));

    const bothBounds = stubFetch({ candles: [] });
    await provider(bothBounds.fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 300,
      before,
      after,
    });
    expect(bothBounds.urls[0]?.searchParams.get('count')).toBeNull();
    expect(bothBounds.urls[0]?.searchParams.get('from')).toBe(String(after));
  });

  it('skips a forming candle so a partial bar never becomes final history', async () => {
    const day = Date.UTC(2026, 7, 19) / 1000;
    const { fetchImpl } = stubFetch({
      candles: [candle(day), candle(day + 86_400, false)],
    });
    const page = await provider(fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 400,
    });
    expect(page.bars.map((bar) => bar.startTime)).toEqual([day]);
  });

  it('labels volume as tick volume rather than exchange volume', async () => {
    const day = Date.UTC(2026, 7, 19) / 1000;
    const { fetchImpl } = stubFetch({ candles: [candle(day, true, 4321)] });
    const page = await provider(fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 400,
    });
    expect(page.bars[0]?.volume).toEqual({ value: '4321', semantics: 'tick' });
  });

  it('stores no volume when the provider sends none', async () => {
    const day = Date.UTC(2026, 7, 19) / 1000;
    const { fetchImpl } = stubFetch({ candles: [candle(day, true, null)] });
    const page = await provider(fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 400,
    });
    expect(page.bars[0]?.volume).toBeNull();
  });

  it('classifies a 429 as retryable and a 401 as terminal', async () => {
    await expect(
      provider(stubFetch({}, 429).fetchImpl).fetchBars({
        symbol: 'EURUSD',
        timeframe: '1D',
        limit: 10,
      }),
    ).rejects.toMatchObject({ kind: 'rate_limited', retryable: true });
    await expect(
      provider(stubFetch({}, 401).fetchImpl).fetchBars({
        symbol: 'EURUSD',
        timeframe: '1D',
        limit: 10,
      }),
    ).rejects.toMatchObject({ kind: 'authentication', retryable: false });
  });

  it('rejects a monthly bar that is not aligned to the first of the month', async () => {
    const midMonth = Date.UTC(2026, 7, 15) / 1000;
    const { fetchImpl } = stubFetch({ candles: [candle(midMonth)] });
    const page = await provider(fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1M',
      limit: 24,
    });
    expect(page.bars).toHaveLength(0);
    expect(page.rejected[0]?.reason).toBe('start_time_misaligned_for_1M');
  });
});
