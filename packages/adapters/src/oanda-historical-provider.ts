import type { CandleTimeframe } from '@wariba/contracts';
import {
  HistoricalProviderError,
  normalizeProviderBars,
  type HistoricalBar,
  type HistoricalBarsPage,
  type HistoricalBarsRequest,
  type HistoricalMarketDataProvider,
} from './historical-market-data-provider';
import { MarketDataProviderBlockedError } from './fcs-market-data-provider';
import type { MarketDataSourceIdentity, TradableSymbol } from './market-data-provider';

/**
 * WX3 — OANDA v20 `GET /v3/instruments/{instrument}/candles`.
 *
 * Technically the strongest source evaluated: native granularities from M1 to
 * M, 5000 candles per request, `from`/`to` time-range pagination, an explicit
 * `complete` flag separating a forming candle from a closed one, honest tick
 * volume, and the only free credential that covers `XAU_USD` and `NAS100_USD`
 * — the metal and index paths WX3 must not ship untested.
 *
 * It is **not** the production source. OANDA's API License Agreement prohibits
 * displaying or otherwise providing FXTrade rates to third parties without
 * written permission, and a prop-firm workstation showing these candles to its
 * customers is third-party display. See
 * `docs/06-engineering/WARIX_WX3_PROVIDER_EVALUATION.md`. This adapter is for
 * development and staging, and `assertOandaEnvironmentAllowed` below is the
 * mechanism that keeps that a runtime guarantee rather than a comment.
 */

/** Canonical WariX timeframe → OANDA `CandlestickGranularity`. Absent = not native. */
const PROVIDER_GRANULARITIES: Partial<Record<CandleTimeframe, string>> = {
  '1m': 'M1',
  '5m': 'M5',
  '15m': 'M15',
  '30m': 'M30',
  '1h': 'H1',
  '4h': 'H4',
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
};

/**
 * `3m` is absent on purpose: OANDA publishes M1, M2, M4, M5, M10, M15 and M30
 * but no three-minute bar. WariX derives it from complete genuine M1 data.
 */
export const OANDA_NATIVE_TIMEFRAMES: readonly CandleTimeframe[] = Object.keys(
  PROVIDER_GRANULARITIES,
) as CandleTimeframe[];

/** Documented ceiling for `count` on the candles endpoint. */
export const OANDA_MAX_BARS_PER_REQUEST = 5000;

export type OandaEnvironment = 'practice' | 'live';

export interface OandaSymbolConfig {
  /** Provider instrument, e.g. `EUR_USD`, `XAU_USD`, `NAS100_USD`. */
  providerSymbol: string;
}

export interface OandaProviderConfig {
  apiToken: string;
  baseUrl: string;
  environment: OandaEnvironment;
  symbols: Partial<Record<TradableSymbol, OandaSymbolConfig>>;
  requestTimeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

interface OandaCandle {
  time?: unknown;
  complete?: unknown;
  volume?: unknown;
  mid?: { o?: unknown; h?: unknown; l?: unknown; c?: unknown };
}

interface OandaCandlesResponse {
  candles?: unknown;
  errorMessage?: unknown;
}

/**
 * Refuses to construct an OANDA source in a production application environment.
 *
 * The licensing conclusion from the provider evaluation is enforced here rather
 * than left to deployment discipline, because "we agreed not to point it at
 * production" is not a control — a config typo is all it takes, and the
 * consequence is redistributing a vendor's rates to paying customers without a
 * licence.
 */
export function assertOandaEnvironmentAllowed(appEnv: string): void {
  if (appEnv === 'production') {
    throw new MarketDataProviderBlockedError(
      'BLOCKED_BY_INFRASTRUCTURE',
      "OandaHistoricalProvider is refused in APP_ENV=production. OANDA's API License Agreement " +
        'prohibits third-party display and redistribution of FXTrade rates without written ' +
        'permission, so WariX confines it to development and staging source identities. Use ' +
        'MARKET_HISTORY_PROVIDER=twelve-data for any environment that shows candles to a customer.',
    );
  }
}

function mappingVersion(
  environment: OandaEnvironment,
  symbols: OandaProviderConfig['symbols'],
): string {
  const mapping = Object.entries(symbols)
    .filter((entry): entry is [string, OandaSymbolConfig] => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([symbol, config]) => `${symbol}=${config.providerSymbol}`)
    .join('|');
  let hash = 2166136261;
  for (let index = 0; index < mapping.length; index += 1) {
    hash ^= mapping.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `history-v1-${environment}-map-${(hash >>> 0).toString(16)}`;
}

function readRetryAfterMs(headers: Headers): number | null {
  const raw = headers.get('retry-after');
  if (raw === null) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : null;
}

export class OandaHistoricalProvider implements HistoricalMarketDataProvider {
  readonly providerName = 'oanda';
  readonly source: MarketDataSourceIdentity;
  readonly nativeTimeframes = OANDA_NATIVE_TIMEFRAMES;

  private readonly config: OandaProviderConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly requestTimeoutMs: number;

  constructor(config: OandaProviderConfig, fetchImpl: typeof fetch = globalThis.fetch) {
    if (!config.apiToken) {
      throw new MarketDataProviderBlockedError(
        'BLOCKED_BY_CREDENTIAL',
        'OANDA_API_TOKEN is not configured — OandaHistoricalProvider cannot fetch historical ' +
          'bars. Generate a personal access token from an fxTrade practice account and set ' +
          'OANDA_API_TOKEN, OANDA_BASE_URL and OANDA_SYMBOL_MAP before selecting ' +
          'MARKET_HISTORY_PROVIDER=oanda.',
      );
    }
    if (!config.baseUrl) {
      throw new MarketDataProviderBlockedError(
        'BLOCKED_BY_CREDENTIAL',
        'OANDA_BASE_URL must be set alongside OANDA_API_TOKEN.',
      );
    }
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const version = mappingVersion(config.environment, config.symbols);
    this.source = {
      id: `oanda:${config.environment}:${version}`,
      provider: this.providerName,
      environment: config.environment,
      // The data is genuine live market data even on a practice token; the
      // environment field, not the mode, is what says it may not be shown to a
      // customer. Calling it 'sandbox' would imply the prices are simulated.
      mode: 'live',
      version,
      capabilities: {
        realtimeQuotes: false,
        bidAsk: false,
        historicalBars: true,
        nativeIntervals: [...OANDA_NATIVE_TIMEFRAMES],
        pagination: 'time_range',
        // Genuine tick volume, labelled as tick volume. Not exchange volume,
        // which spot FX does not have.
        volume: true,
        depth: false,
        // Not configurable. OANDA's API License Agreement prohibits providing
        // FXTrade rates to any third party, so no deployment setting can make
        // this source externally displayable.
        displayRights: 'internal',
      },
    };
  }

  supportsSymbol(symbol: TradableSymbol): boolean {
    return this.config.symbols[symbol] !== undefined;
  }

  supportsTimeframe(timeframe: CandleTimeframe): boolean {
    return PROVIDER_GRANULARITIES[timeframe] !== undefined;
  }

  async fetchBars(request: HistoricalBarsRequest): Promise<HistoricalBarsPage> {
    const symbolConfig = this.config.symbols[request.symbol];
    if (symbolConfig === undefined) {
      throw new HistoricalProviderError(
        'unsupported_symbol',
        `${request.symbol} is not mapped for ${this.providerName}.`,
      );
    }
    const granularity = PROVIDER_GRANULARITIES[request.timeframe];
    if (granularity === undefined) {
      throw new HistoricalProviderError(
        'unsupported_timeframe',
        `${request.timeframe} is not a native ${this.providerName} granularity; it must be ` +
          'derived from complete lower-timeframe bars instead.',
      );
    }

    const limit = Math.min(request.limit, OANDA_MAX_BARS_PER_REQUEST);
    const url = new URL(
      `/v3/instruments/${encodeURIComponent(symbolConfig.providerSymbol)}/candles`,
      this.config.baseUrl,
    );
    url.searchParams.set('price', 'M');
    url.searchParams.set('granularity', granularity);
    // Pin the calendar boundaries to WariX canonical UTC buckets. OANDA's
    // defaults align the day to 17:00 New York, which would make every `1D`
    // and `1W` bar disagree with `bucketStartSeconds` — a silent one-bar shift
    // that no OHLC validation would ever catch.
    url.searchParams.set('dailyAlignment', '0');
    url.searchParams.set('alignmentTimezone', 'UTC');
    url.searchParams.set('weeklyAlignment', 'Monday');
    if (request.before !== undefined && request.after !== undefined) {
      // The API rejects `count` alongside both bounds; the range itself
      // determines the candle count.
      url.searchParams.set('from', String(request.after));
      url.searchParams.set('to', String(request.before));
      url.searchParams.set('includeFirst', 'true');
    } else if (request.after !== undefined) {
      url.searchParams.set('from', String(request.after));
      url.searchParams.set('includeFirst', 'true');
      url.searchParams.set('count', String(limit));
    } else {
      if (request.before !== undefined) url.searchParams.set('to', String(request.before));
      url.searchParams.set('count', String(limit));
    }

    const body = await this.getJson(url);
    const rawBars = this.readCandles(body, request.timeframe);
    const { bars, rejected } = normalizeProviderBars(rawBars, request.timeframe, {
      ...(request.before === undefined ? {} : { before: request.before }),
      ...(request.after === undefined ? {} : { after: request.after }),
    });
    const oldest = bars[0];
    const newest = bars.at(-1);

    return {
      sourceId: this.source.id,
      symbol: request.symbol,
      timeframe: request.timeframe,
      bars,
      hasMoreOlder: rawBars.length >= limit,
      coverage:
        oldest === undefined || newest === undefined
          ? null
          : { from: oldest.startTime, to: newest.startTime },
      rejected,
    };
  }

  private async getJson(url: URL): Promise<OandaCandlesResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          // Unix seconds are what the canonical bar model already speaks.
          'Accept-Datetime-Format': 'UNIX',
        },
      });
    } catch (error: unknown) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      throw new HistoricalProviderError(
        aborted ? 'timeout' : 'transport',
        aborted
          ? `${this.providerName} request exceeded ${this.requestTimeoutMs}ms`
          : `${this.providerName} request failed at the transport layer`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const retryAfterMs = readRetryAfterMs(response.headers);
      const message = `${this.providerName} responded ${response.status}`;
      if (response.status === 429) {
        throw new HistoricalProviderError('rate_limited', message, { retryAfterMs });
      }
      if (response.status === 401 || response.status === 403) {
        throw new HistoricalProviderError('authentication', message);
      }
      if (response.status === 400 || response.status === 404) {
        throw new HistoricalProviderError('unsupported_symbol', message);
      }
      if (response.status >= 500) {
        throw new HistoricalProviderError('transport', message);
      }
      throw new HistoricalProviderError('provider_error', message);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new HistoricalProviderError(
        'malformed_response',
        `${this.providerName} returned a body that is not JSON`,
      );
    }
    if (typeof body !== 'object' || body === null) {
      throw new HistoricalProviderError(
        'malformed_response',
        `${this.providerName} returned a non-object body`,
      );
    }
    return body as OandaCandlesResponse;
  }

  private readCandles(body: OandaCandlesResponse, timeframe: CandleTimeframe): HistoricalBar[] {
    if (!Array.isArray(body.candles)) {
      throw new HistoricalProviderError(
        'malformed_response',
        `${this.providerName} returned no \`candles\` array for ${timeframe}`,
      );
    }
    const bars: HistoricalBar[] = [];
    for (const entry of body.candles as OandaCandle[]) {
      if (typeof entry !== 'object' || entry === null) continue;
      // A forming candle is not history. `complete: false` is the provider
      // telling us this bucket is still open; storing it as final would freeze
      // a partial bar into the durable cache forever.
      if (entry.complete !== true) continue;
      const mid = entry.mid;
      if (typeof mid !== 'object' || mid === null) continue;
      const { o, h, l, c } = mid;
      const time = entry.time;
      if (
        typeof o !== 'string' ||
        typeof h !== 'string' ||
        typeof l !== 'string' ||
        typeof c !== 'string' ||
        (typeof time !== 'string' && typeof time !== 'number')
      ) {
        bars.push({ startTime: Number.NaN, open: '', high: '', low: '', close: '', volume: null });
        continue;
      }
      const startTime = Math.floor(Number(time));
      const volumeValue = entry.volume;
      bars.push({
        startTime: Number.isFinite(startTime) ? startTime : Number.NaN,
        open: o,
        high: h,
        low: l,
        close: c,
        volume:
          typeof volumeValue === 'number' && Number.isFinite(volumeValue) && volumeValue >= 0
            ? { value: String(Math.trunc(volumeValue)), semantics: 'tick' }
            : null,
      });
    }
    return bars;
  }

  close(): void {
    // Stateless HTTP client — nothing to tear down.
  }
}

/** Parses `OANDA_SYMBOL_MAP` (`EURUSD=EUR_USD,XAUUSD=XAU_USD,NAS100=NAS100_USD`). */
export function parseOandaSymbolMap(
  raw: string,
): Partial<Record<TradableSymbol, OandaSymbolConfig>> {
  const symbols: Partial<Record<TradableSymbol, OandaSymbolConfig>> = {};
  for (const pair of raw.split(',')) {
    const [symbol, providerSymbol] = pair.split('=').map((part) => part.trim());
    if (!symbol || !providerSymbol) continue;
    symbols[symbol as TradableSymbol] = { providerSymbol };
  }
  return symbols;
}
