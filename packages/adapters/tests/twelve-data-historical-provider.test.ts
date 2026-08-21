import { describe, expect, it } from 'vitest';
import {
  TwelveDataHistoricalProvider,
  parseTwelveDataDatetime,
  parseTwelveDataSymbolMap,
} from '../src/twelve-data-historical-provider';
import { HistoricalProviderError } from '../src/historical-market-data-provider';
import { MarketDataProviderBlockedError } from '../src/fcs-market-data-provider';

const BASE_URL = 'https://api.twelvedata.com';
const SYMBOLS = { EURUSD: { providerSymbol: 'EUR/USD' } } as const;

interface StubOptions {
  body?: unknown;
  status?: number;
  headers?: Record<string, string>;
}

function stubFetch(options: StubOptions | StubOptions[]): {
  fetchImpl: typeof fetch;
  urls: URL[];
} {
  const queue = Array.isArray(options) ? [...options] : [options];
  const urls: URL[] = [];
  const fetchImpl = (async (input: Parameters<typeof fetch>[0]) => {
    urls.push(new URL(String(input)));
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return new Response(JSON.stringify(next?.body ?? {}), {
      status: next?.status ?? 200,
      headers: { 'content-type': 'application/json', ...(next?.headers ?? {}) },
    });
  }) as typeof fetch;
  return { fetchImpl, urls };
}

function provider(fetchImpl: typeof fetch): TwelveDataHistoricalProvider {
  return new TwelveDataHistoricalProvider(
    { apiKey: 'test-key', baseUrl: BASE_URL, symbols: { ...SYMBOLS } },
    fetchImpl,
  );
}

describe('parseTwelveDataSymbolMap', () => {
  it('parses a comma separated mapping', () => {
    expect(parseTwelveDataSymbolMap('EURUSD=EUR/USD,XAUUSD=XAU/USD')).toEqual({
      EURUSD: { providerSymbol: 'EUR/USD' },
      XAUUSD: { providerSymbol: 'XAU/USD' },
    });
  });

  it('ignores malformed entries rather than inventing a ticker', () => {
    expect(parseTwelveDataSymbolMap('EURUSD=,=EUR/USD,,GBPUSD=GBP/USD')).toEqual({
      GBPUSD: { providerSymbol: 'GBP/USD' },
    });
  });
});

describe('parseTwelveDataDatetime', () => {
  it('reads a date-only daily row as UTC midnight', () => {
    expect(parseTwelveDataDatetime('2026-08-20')).toBe(Date.UTC(2026, 7, 20) / 1000);
  });

  it('reads an intraday row as UTC', () => {
    expect(parseTwelveDataDatetime('2026-08-20 12:05:00')).toBe(
      Date.UTC(2026, 7, 20, 12, 5, 0) / 1000,
    );
  });

  it('returns null for an unparseable value rather than guessing', () => {
    expect(parseTwelveDataDatetime('not-a-date')).toBeNull();
  });
});

describe('TwelveDataHistoricalProvider construction', () => {
  it('refuses to construct without a credential instead of faking availability', () => {
    expect(
      () => new TwelveDataHistoricalProvider({ apiKey: '', baseUrl: BASE_URL, symbols: {} }),
    ).toThrow(MarketDataProviderBlockedError);
  });

  it('advertises only capabilities it genuinely has', () => {
    const instance = provider(stubFetch({}).fetchImpl);
    expect(instance.source.capabilities).toMatchObject({
      historicalBars: true,
      pagination: 'time_range',
      realtimeQuotes: false,
      // Spot FX volume semantics are undocumented, so none is claimed.
      volume: false,
      depth: false,
    });
    expect(instance.source.capabilities.nativeIntervals).not.toContain('3m');
    // Provider-aligned to the New York session, so not canonically native.
    expect(instance.source.capabilities.nativeIntervals).not.toContain('4h');
  });

  it('binds the symbol mapping into the source identity', () => {
    const one = new TwelveDataHistoricalProvider(
      { apiKey: 'k', baseUrl: BASE_URL, symbols: { EURUSD: { providerSymbol: 'EUR/USD' } } },
      stubFetch({}).fetchImpl,
    );
    const two = new TwelveDataHistoricalProvider(
      { apiKey: 'k', baseUrl: BASE_URL, symbols: { EURUSD: { providerSymbol: 'EURUSD' } } },
      stubFetch({}).fetchImpl,
    );
    expect(one.source.id).not.toBe(two.source.id);
  });

  it('reports 3m as non-native so it is derived rather than relabelled', () => {
    const instance = provider(stubFetch({}).fetchImpl);
    expect(instance.supportsTimeframe('5m')).toBe(true);
    expect(instance.supportsTimeframe('3m')).toBe(false);
    expect(instance.supportsTimeframe('4h')).toBe(false);
    expect(instance.supportsSymbol('EURUSD')).toBe(true);
    expect(instance.supportsSymbol('NAS100')).toBe(false);
  });
});

describe('TwelveDataHistoricalProvider.fetchBars', () => {
  it('always sends outputsize and order rather than relying on the 30-bar default', async () => {
    const { fetchImpl, urls } = stubFetch({ body: { status: 'ok', values: [] } });
    await provider(fetchImpl).fetchBars({ symbol: 'EURUSD', timeframe: '5m', limit: 400 });
    const url = urls[0];
    expect(url?.searchParams.get('outputsize')).toBe('400');
    expect(url?.searchParams.get('order')).toBe('desc');
    expect(url?.searchParams.get('timezone')).toBe('UTC');
    expect(url?.searchParams.get('interval')).toBe('5min');
    expect(url?.searchParams.get('symbol')).toBe('EUR/USD');
  });

  it('translates an exclusive cursor into an end_date one second earlier', async () => {
    const before = Date.UTC(2026, 7, 20, 12, 0, 0) / 1000;
    const { fetchImpl, urls } = stubFetch({ body: { status: 'ok', values: [] } });
    await provider(fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '5m',
      limit: 100,
      before,
    });
    expect(urls[0]?.searchParams.get('end_date')).toBe('2026-08-20T11:59:59');
  });

  it('normalizes provider rows into ascending canonical bars', async () => {
    const { fetchImpl } = stubFetch({
      body: {
        status: 'ok',
        values: [
          {
            datetime: '2026-08-20',
            open: '1.1000',
            high: '1.1050',
            low: '1.0950',
            close: '1.1020',
          },
          {
            datetime: '2026-08-19',
            open: '1.0900',
            high: '1.0980',
            low: '1.0880',
            close: '1.0960',
          },
        ],
      },
    });
    const page = await provider(fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 400,
    });
    expect(page.bars.map((bar) => bar.startTime)).toEqual([
      Date.UTC(2026, 7, 19) / 1000,
      Date.UTC(2026, 7, 20) / 1000,
    ]);
    expect(page.bars.every((bar) => bar.volume === null)).toBe(true);
    expect(page.coverage).toEqual({
      from: Date.UTC(2026, 7, 19) / 1000,
      to: Date.UTC(2026, 7, 20) / 1000,
    });
    expect(page.sourceId).toContain('twelve-data:production:');
  });

  it('quarantines a malformed row instead of dropping it silently', async () => {
    const { fetchImpl } = stubFetch({
      body: {
        status: 'ok',
        values: [
          {
            datetime: '2026-08-20',
            open: '1.1000',
            high: '1.1050',
            low: '1.0950',
            close: '1.1020',
          },
          { datetime: '2026-08-19', open: 1.09, high: '1.0980', low: '1.0880', close: '1.0960' },
        ],
      },
    });
    const page = await provider(fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 400,
    });
    expect(page.bars).toHaveLength(1);
    expect(page.rejected).toHaveLength(1);
  });

  it('infers hasMoreOlder from a full page and reports the end of the archive', async () => {
    const row = {
      datetime: '2026-08-20',
      open: '1.1000',
      high: '1.1050',
      low: '1.0950',
      close: '1.1020',
    };
    const { fetchImpl } = stubFetch({ body: { status: 'ok', values: [row] } });
    const full = await provider(fetchImpl).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 1,
    });
    expect(full.hasMoreOlder).toBe(true);

    const { fetchImpl: shortFetch } = stubFetch({ body: { status: 'ok', values: [row] } });
    const short = await provider(shortFetch).fetchBars({
      symbol: 'EURUSD',
      timeframe: '1D',
      limit: 400,
    });
    expect(short.hasMoreOlder).toBe(false);
  });

  it('classifies HTTP 429 as retryable and honours Retry-After', async () => {
    const { fetchImpl } = stubFetch({ status: 429, headers: { 'retry-after': '7' } });
    await expect(
      provider(fetchImpl).fetchBars({ symbol: 'EURUSD', timeframe: '1D', limit: 10 }),
    ).rejects.toMatchObject({ kind: 'rate_limited', retryable: true, retryAfterMs: 7000 });
  });

  it('classifies an in-body error code the same way as an HTTP status', async () => {
    const { fetchImpl } = stubFetch({ body: { status: 'error', code: 429, message: 'limit' } });
    await expect(
      provider(fetchImpl).fetchBars({ symbol: 'EURUSD', timeframe: '1D', limit: 10 }),
    ).rejects.toMatchObject({ kind: 'rate_limited', retryable: true });
  });

  it('never retries an authentication failure', async () => {
    const { fetchImpl } = stubFetch({ status: 401 });
    await expect(
      provider(fetchImpl).fetchBars({ symbol: 'EURUSD', timeframe: '1D', limit: 10 }),
    ).rejects.toMatchObject({ kind: 'authentication', retryable: false });
  });

  it('reports an unmapped symbol as unsupported rather than substituting a market', async () => {
    const { fetchImpl, urls } = stubFetch({ body: { status: 'ok', values: [] } });
    await expect(
      provider(fetchImpl).fetchBars({ symbol: 'NAS100', timeframe: '1D', limit: 10 }),
    ).rejects.toBeInstanceOf(HistoricalProviderError);
    expect(urls).toHaveLength(0);
  });

  it('refuses a non-native timeframe instead of relabelling a nearby interval', async () => {
    const { fetchImpl, urls } = stubFetch({ body: { status: 'ok', values: [] } });
    await expect(
      provider(fetchImpl).fetchBars({ symbol: 'EURUSD', timeframe: '3m', limit: 10 }),
    ).rejects.toMatchObject({ kind: 'unsupported_timeframe' });
    expect(urls).toHaveLength(0);
  });

  it('treats a non-JSON body as malformed rather than empty', async () => {
    const fetchImpl = (async () =>
      new Response('<html>maintenance</html>', { status: 200 })) as typeof fetch;
    await expect(
      provider(fetchImpl).fetchBars({ symbol: 'EURUSD', timeframe: '1D', limit: 10 }),
    ).rejects.toMatchObject({ kind: 'malformed_response' });
  });
});
