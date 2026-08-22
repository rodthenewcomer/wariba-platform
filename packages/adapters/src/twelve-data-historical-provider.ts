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
import type {
  DisplayRights,
  MarketDataSourceIdentity,
  TradableSymbol,
} from './market-data-provider';

/**
 * WX3 — Twelve Data `/time_series` historical bars.
 *
 * Selected in `docs/06-engineering/WARIX_WX3_PROVIDER_EVALUATION.md` as the
 * production historical candidate: FX, metals and indices under one symbol
 * model, 1min–1month bars, 20+ years of FX history, and a free tier real
 * enough to develop against.
 *
 * History only. This adapter deliberately does not implement
 * `MarketDataProvider`: WX3 changes where candles come from, not where ticks
 * come from, and moving both at once would make the historical/realtime seam
 * unmeasurable.
 */

/** Canonical WariX timeframe → Twelve Data `interval`. Absent = not native. */
const PROVIDER_INTERVALS: Partial<Record<CandleTimeframe, string>> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '1h',
  '1D': '1day',
  '1W': '1week',
  '1M': '1month',
};

/**
 * Two canonical intervals are absent above, for two different reasons.
 *
 * `3m` simply does not exist at this vendor: Twelve Data serves 1/5/15/30/45min
 * and 1/2/4/8h, so a three-minute bar has to be built rather than requested.
 *
 * `4h` does exist and is deliberately not used. A capability probe against the
 * live API showed Twelve Data's FX `4h` bars opening at 01:00, 05:00, 09:00,
 * 13:00, 17:00 and 21:00 UTC — anchored to the New York session, not to the
 * UTC epoch. Roughly half the year that offset happens to coincide with
 * `bucketStartSeconds`, and the rest of the year it does not, which produces a
 * series that is silently holed for six months at a time. Rather than accept a
 * foreign bucket definition, WariX derives `4h` from complete genuine `1h`
 * bars, which are epoch-aligned at this vendor.
 *
 * Both derivations are honest under WX3 §23 because they aggregate real
 * lower-timeframe market data over a window that was genuinely fetched. Neither
 * relabels a nearby interval, which would fabricate a market semantic.
 */
export const TWELVE_DATA_NATIVE_TIMEFRAMES: readonly CandleTimeframe[] = Object.keys(
  PROVIDER_INTERVALS,
) as CandleTimeframe[];

export interface TwelveDataSymbolConfig {
  /** Provider ticker, e.g. `EUR/USD`. Never invented locally. */
  providerSymbol: string;
}

export interface TwelveDataProviderConfig {
  apiKey: string;
  baseUrl: string;
  /**
   * Only the symbols the active plan genuinely covers. An absent symbol is
   * reported as unsupported; it is never mapped to a similar market (WX3 §33).
   */
  symbols: Partial<Record<TradableSymbol, TwelveDataSymbolConfig>>;
  requestTimeoutMs?: number;
  /**
   * WX3.1 §5 — what the *purchased plan* permits, stated by configuration.
   *
   * Defaults to `unknown` because that is the truth about an unconfigured
   * deployment. The free Basic tier is documented as internal non-display use;
   * whether any paid tier covers external customer display is a commercial
   * question for a human, and this field carries their answer rather than
   * guessing it.
   */
  displayRights?: DisplayRights;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
/** Documented ceiling for `outputsize` on `/time_series`. */
export const TWELVE_DATA_MAX_BARS_PER_REQUEST = 5000;

interface TwelveDataValue {
  datetime?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
}

interface TwelveDataResponse {
  status?: unknown;
  code?: unknown;
  message?: unknown;
  values?: unknown;
}

function mappingVersion(symbols: TwelveDataProviderConfig['symbols']): string {
  const mapping = Object.entries(symbols)
    .filter((entry): entry is [string, TwelveDataSymbolConfig] => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([symbol, config]) => `${symbol}=${config.providerSymbol}`)
    .join('|');
  let hash = 2166136261;
  for (let index = 0; index < mapping.length; index += 1) {
    hash ^= mapping.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `history-v1-map-${(hash >>> 0).toString(16)}`;
}

/**
 * Provider datetimes are UTC for forex when `timezone=UTC` is requested.
 * Daily/weekly/monthly rows carry a date only; intraday rows carry
 * `YYYY-MM-DD HH:mm:ss`. Anything else is a malformed row, not a row to guess at.
 */
export function parseTwelveDataDatetime(raw: string): number | null {
  const trimmed = raw.trim();
  const iso = trimmed.length === 10 ? `${trimmed}T00:00:00Z` : `${trimmed.replace(' ', 'T')}Z`;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed / 1000);
}

/** `YYYY-MM-DDTHH:mm:ss`, the documented `start_date`/`end_date` form. */
function formatProviderDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 19);
}

function readRetryAfterMs(headers: Headers): number | null {
  const raw = headers.get('retry-after');
  if (raw === null) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : null;
}

/**
 * Twelve Data reports failures two ways: an HTTP status, and a `status:
 * "error"` body carrying its own `code` while the transport says 200. Both are
 * mapped through the same table so a rate limit is retryable and a bad key is
 * not, whichever way it arrives.
 */
function errorForCode(
  code: number,
  message: string,
  retryAfterMs: number | null,
): HistoricalProviderError {
  if (code === 429) {
    return new HistoricalProviderError('rate_limited', message, { retryAfterMs });
  }
  if (code === 401 || code === 403) {
    return new HistoricalProviderError('authentication', message);
  }
  if (code === 404) {
    return new HistoricalProviderError('unsupported_symbol', message);
  }
  if (code === 408 || code === 504) {
    return new HistoricalProviderError('timeout', message);
  }
  if (code >= 500) {
    return new HistoricalProviderError('transport', message);
  }
  return new HistoricalProviderError('provider_error', message);
}

export class TwelveDataHistoricalProvider implements HistoricalMarketDataProvider {
  readonly providerName = 'twelve-data';
  readonly source: MarketDataSourceIdentity;
  readonly nativeTimeframes = TWELVE_DATA_NATIVE_TIMEFRAMES;

  private readonly config: TwelveDataProviderConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly requestTimeoutMs: number;

  constructor(config: TwelveDataProviderConfig, fetchImpl: typeof fetch = globalThis.fetch) {
    if (!config.apiKey) {
      throw new MarketDataProviderBlockedError(
        'BLOCKED_BY_CREDENTIAL',
        'TWELVE_DATA_API_KEY is not configured — TwelveDataHistoricalProvider cannot fetch ' +
          'historical bars. Set TWELVE_DATA_API_KEY and TWELVE_DATA_SYMBOL_MAP before selecting ' +
          'MARKET_HISTORY_PROVIDER=twelve-data. Until then WariX serves only the observations it ' +
          'genuinely owns — it never fabricates candles to fill the gap.',
      );
    }
    if (!config.baseUrl) {
      throw new MarketDataProviderBlockedError(
        'BLOCKED_BY_CREDENTIAL',
        'TWELVE_DATA_BASE_URL must be set alongside TWELVE_DATA_API_KEY.',
      );
    }
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const version = mappingVersion(config.symbols);
    this.source = {
      id: `twelve-data:production:${version}`,
      provider: this.providerName,
      environment: 'production',
      mode: 'live',
      version,
      capabilities: {
        realtimeQuotes: false,
        bidAsk: false,
        historicalBars: true,
        nativeIntervals: [...TWELVE_DATA_NATIVE_TIMEFRAMES],
        pagination: 'time_range',
        // The response schema carries `volume`, but Twelve Data does not
        // document what volume means for a spot FX pair, which has no central
        // tape. Unknown semantics are stored as absent, not presented as a
        // number (WX3 §30).
        volume: false,
        depth: false,
        displayRights: config.displayRights ?? 'unknown',
      },
    };
  }

  supportsSymbol(symbol: TradableSymbol): boolean {
    return this.config.symbols[symbol] !== undefined;
  }

  supportsTimeframe(timeframe: CandleTimeframe): boolean {
    return PROVIDER_INTERVALS[timeframe] !== undefined;
  }

  async fetchBars(request: HistoricalBarsRequest): Promise<HistoricalBarsPage> {
    const symbolConfig = this.config.symbols[request.symbol];
    if (symbolConfig === undefined) {
      throw new HistoricalProviderError(
        'unsupported_symbol',
        `${request.symbol} is not mapped for ${this.providerName}. The active plan may not cover ` +
          'this instrument; WariX reports it as unsupported rather than substituting a similar market.',
      );
    }
    const interval = PROVIDER_INTERVALS[request.timeframe];
    if (interval === undefined) {
      throw new HistoricalProviderError(
        'unsupported_timeframe',
        `${request.timeframe} is not a native ${this.providerName} interval; it must be derived ` +
          'from complete lower-timeframe bars instead.',
      );
    }

    const limit = Math.min(request.limit, TWELVE_DATA_MAX_BARS_PER_REQUEST);
    const url = new URL('/time_series', this.config.baseUrl);
    url.searchParams.set('symbol', symbolConfig.providerSymbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('outputsize', String(limit));
    // `order` defaults to desc and `outputsize` defaults to 30 when no date
    // parameters are present — a default that silently produces a 30-bar chart.
    // Both are always sent explicitly for that reason.
    url.searchParams.set('order', 'desc');
    url.searchParams.set('timezone', 'UTC');
    url.searchParams.set('format', 'JSON');
    if (request.before !== undefined) {
      // `end_date` is inclusive; the cursor is exclusive. Backing off one
      // second keeps the boundary bar out without relying on the provider's
      // inclusivity, and `normalizeProviderBars` rejects it anyway if it slips through.
      url.searchParams.set('end_date', formatProviderDate(request.before - 1));
    }
    if (request.after !== undefined) {
      url.searchParams.set('start_date', formatProviderDate(request.after));
    }
    url.searchParams.set('apikey', this.config.apiKey);

    const body = await this.getJson(url);
    const rawBars = this.readValues(body, request.timeframe);
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
      // Twelve Data exposes no "more data exists" flag on /time_series, so this
      // is WariX's inference from a full page, not a provider claim. The
      // durable coverage record is what ultimately decides when to stop paging.
      hasMoreOlder: rawBars.length >= limit,
      coverage:
        oldest === undefined || newest === undefined
          ? null
          : { from: oldest.startTime, to: newest.startTime },
      rejected,
    };
  }

  private async getJson(url: URL): Promise<TwelveDataResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(url, { signal: controller.signal });
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
      throw errorForCode(
        response.status,
        `${this.providerName} responded ${response.status}`,
        readRetryAfterMs(response.headers),
      );
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
    const parsed = body as TwelveDataResponse;
    if (parsed.status === 'error') {
      const code = typeof parsed.code === 'number' ? parsed.code : 0;
      const message =
        typeof parsed.message === 'string'
          ? `${this.providerName}: ${parsed.message}`
          : `${this.providerName} reported an error without a message`;
      throw errorForCode(code, message, readRetryAfterMs(response.headers));
    }
    return parsed;
  }

  private readValues(body: TwelveDataResponse, timeframe: CandleTimeframe): HistoricalBar[] {
    if (!Array.isArray(body.values)) {
      throw new HistoricalProviderError(
        'malformed_response',
        `${this.providerName} returned no \`values\` array for ${timeframe}`,
      );
    }
    const bars: HistoricalBar[] = [];
    for (const entry of body.values as TwelveDataValue[]) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { datetime, open, high, low, close } = entry;
      if (
        typeof datetime !== 'string' ||
        typeof open !== 'string' ||
        typeof high !== 'string' ||
        typeof low !== 'string' ||
        typeof close !== 'string'
      ) {
        // Kept as a bar with an impossible start time so the canonical gate
        // records it as rejected rather than dropping it without trace.
        bars.push({ startTime: Number.NaN, open: '', high: '', low: '', close: '', volume: null });
        continue;
      }
      const startTime = parseTwelveDataDatetime(datetime);
      bars.push({
        startTime: startTime ?? Number.NaN,
        open,
        high,
        low,
        close,
        volume: null,
      });
    }
    return bars;
  }

  close(): void {
    // Stateless HTTP client — nothing to tear down. Present so callers can
    // dispose every provider uniformly.
  }
}

/**
 * Parses `TWELVE_DATA_SYMBOL_MAP` (`EURUSD=EUR/USD,XAUUSD=XAU/USD`).
 *
 * Kept out of the constructor so an unset/short map is a configuration answer
 * rather than a crash, and so the mapping lives in one place instead of being
 * scattered across components (WX3 §32).
 */
export function parseTwelveDataSymbolMap(
  raw: string,
): Partial<Record<TradableSymbol, TwelveDataSymbolConfig>> {
  const symbols: Partial<Record<TradableSymbol, TwelveDataSymbolConfig>> = {};
  for (const pair of raw.split(',')) {
    const [symbol, providerSymbol] = pair.split('=').map((part) => part.trim());
    if (!symbol || !providerSymbol) continue;
    symbols[symbol as TradableSymbol] = { providerSymbol };
  }
  return symbols;
}
