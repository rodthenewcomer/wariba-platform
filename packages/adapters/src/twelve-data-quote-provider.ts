import Decimal from 'decimal.js';
import { MarketDataProviderBlockedError } from './fcs-market-data-provider';
import type {
  DisplayRights,
  MarketDataProvider,
  MarketDataSourceIdentity,
  MarketStatus,
  MarketTick,
  SymbolSimConfig,
  TradableSymbol,
} from './market-data-provider';

/**
 * WX3.1 §2 — genuine Twelve Data quotes, so history and realtime describe the
 * same market.
 *
 * WX3 proved the cutover's *refusal* path and could not prove the positive one,
 * because the only realtime feed available walked around a fixed sandbox base
 * price 717 bps away from real EURUSD. Refusal was the correct behaviour and
 * also a dead end: no configuration of a synthetic feed can ever legitimately
 * attach to a genuine archive. This adapter exists to remove that obstacle
 * honestly rather than by widening a tolerance until the check stops meaning
 * anything.
 *
 * ## What is genuine here and what is not
 *
 * The **price level** is genuine: it is Twelve Data's own quote for the same
 * instrument its archive describes, polled from `/price`.
 *
 * The **spread** is not from the provider. Twelve Data's Basic plan publishes a
 * single price, not bid and ask, so this adapter derives them by applying the
 * symbol's configured `spreadPoints` around that mid. That is defensible only
 * because of what WariX is: a simulated prop platform whose dealing spread is
 * its own product parameter, exactly as `MockMarketDataProvider` already treats
 * it. It is not a claim about a real market spread, and `bidAsk: false` says so
 * in the capability matrix rather than leaving a reader to assume otherwise.
 *
 * An unmapped symbol reports `closed`. It never receives an invented price.
 */

export interface TwelveDataQuoteSymbolConfig {
  /** Provider ticker, e.g. `EUR/USD`. */
  providerSymbol: string;
  /** WariX's own simulated dealing spread, in price points. */
  spreadPoints: string;
  pricePrecision: number;
  staleThresholdMs: number;
}

export interface TwelveDataQuoteProviderConfig {
  apiKey: string;
  baseUrl: string;
  symbols: Partial<Record<TradableSymbol, TwelveDataQuoteSymbolConfig>>;
  /**
   * How often the whole mapped set is polled.
   *
   * One credit per symbol per poll, against a Basic budget of 8 credits/minute
   * and 800/day shared with historical backfill. The default is deliberately
   * slow: this is a correctness proof, not a trading feed, and starving the
   * backfill to refresh a price twice a second would be a poor trade.
   */
  pollIntervalMs?: number;
  requestTimeoutMs?: number;
  displayRights?: DisplayRights;
}

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

interface QuoteState {
  mid: Decimal;
  sequence: number;
  receivedAt: number;
  timestamp: string;
}

function mappingVersion(symbols: TwelveDataQuoteProviderConfig['symbols']): string {
  const mapping = Object.entries(symbols)
    .filter((entry): entry is [string, TwelveDataQuoteSymbolConfig] => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([symbol, config]) => `${symbol}=${config.providerSymbol}`)
    .join('|');
  let hash = 2166136261;
  for (let index = 0; index < mapping.length; index += 1) {
    hash ^= mapping.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `quotes-v1-map-${(hash >>> 0).toString(16)}`;
}

export class TwelveDataQuoteProvider implements MarketDataProvider {
  readonly providerName = 'twelve-data';
  readonly source: MarketDataSourceIdentity;

  private readonly config: TwelveDataQuoteProviderConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly pollIntervalMs: number;
  private readonly requestTimeoutMs: number;
  private readonly state = new Map<TradableSymbol, QuoteState>();
  private readonly listeners = new Map<TradableSymbol, Set<(tick: MarketTick) => void>>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private polling = false;

  constructor(config: TwelveDataQuoteProviderConfig, fetchImpl: typeof fetch = globalThis.fetch) {
    if (!config.apiKey) {
      throw new MarketDataProviderBlockedError(
        'BLOCKED_BY_CREDENTIAL',
        'TWELVE_DATA_API_KEY is not configured — TwelveDataQuoteProvider cannot open a live feed. ' +
          "Never substitute a simulated walk under this provider's name.",
      );
    }
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const version = mappingVersion(config.symbols);
    this.source = {
      id: `twelve-data:production:${version}`,
      provider: this.providerName,
      environment: 'production',
      mode: 'live',
      version,
      capabilities: {
        realtimeQuotes: true,
        // The plan publishes one price. Bid and ask are WariX's own simulated
        // dealing spread applied around it, not a provider observation.
        bidAsk: false,
        historicalBars: false,
        nativeIntervals: [],
        pagination: 'none',
        volume: false,
        depth: false,
        displayRights: config.displayRights ?? 'unknown',
      },
    };
  }

  start(): void {
    if (this.timer !== null) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.pollIntervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * One request for the whole mapped set.
   *
   * Overlapping polls are skipped rather than queued: a slow response must not
   * be able to build a backlog of requests that then all bill at once.
   */
  private async poll(): Promise<void> {
    if (this.polling) return;
    const mapped = Object.entries(this.config.symbols).filter(
      (entry): entry is [string, TwelveDataQuoteSymbolConfig] => entry[1] !== undefined,
    );
    if (mapped.length === 0) return;
    this.polling = true;
    try {
      const url = new URL('/price', this.config.baseUrl);
      url.searchParams.set('symbol', mapped.map(([, config]) => config.providerSymbol).join(','));
      url.searchParams.set('apikey', this.config.apiKey);
      const body = await this.getJson(url);
      const now = Date.now();
      const timestamp = new Date(now).toISOString();
      for (const [symbol, config] of mapped) {
        const price = readPrice(body, config.providerSymbol, mapped.length === 1);
        if (price === null) continue;
        const previous = this.state.get(symbol as TradableSymbol);
        const next: QuoteState = {
          mid: new Decimal(price),
          sequence: (previous?.sequence ?? 0) + 1,
          receivedAt: now,
          timestamp,
        };
        this.state.set(symbol as TradableSymbol, next);
        const tick = this.buildTick(symbol as TradableSymbol, config, next);
        for (const listener of this.listeners.get(symbol as TradableSymbol) ?? []) {
          listener(tick);
        }
      }
    } catch {
      // A failed poll leaves the last genuine quote in place and lets it age
      // into `stale` through the ordinary threshold. It never fabricates one.
    } finally {
      this.polling = false;
    }
  }

  private async getJson(url: URL): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchImpl(url, { signal: controller.signal });
      if (!response.ok) return null;
      return (await response.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }

  private buildTick(
    symbol: TradableSymbol,
    config: TwelveDataQuoteSymbolConfig,
    state: QuoteState,
  ): MarketTick {
    const pointValue = new Decimal(10).pow(-config.pricePrecision);
    const halfSpread = new Decimal(config.spreadPoints).times(pointValue).dividedBy(2);
    return {
      symbol,
      bid: state.mid.minus(halfSpread).toFixed(config.pricePrecision),
      ask: state.mid.plus(halfSpread).toFixed(config.pricePrecision),
      timestamp: state.timestamp,
      sequence: state.sequence,
      marketStatus: this.computeStatus(symbol, config),
    };
  }

  private computeStatus(symbol: TradableSymbol, config: TwelveDataQuoteSymbolConfig): MarketStatus {
    const state = this.state.get(symbol);
    if (state === undefined) return 'closed';
    return Date.now() - state.receivedAt > config.staleThresholdMs ? 'stale' : 'open';
  }

  getSnapshot(symbol: TradableSymbol): MarketTick {
    const config = this.config.symbols[symbol];
    const state = this.state.get(symbol);
    if (config === undefined || state === undefined) {
      throw new Error(`No genuine ${this.providerName} quote available for ${symbol}`);
    }
    return this.buildTick(symbol, config, state);
  }

  getMarketStatus(symbol: TradableSymbol): MarketStatus {
    const config = this.config.symbols[symbol];
    // An unmapped symbol is closed, never quoted from an invented price.
    if (config === undefined) return 'closed';
    return this.computeStatus(symbol, config);
  }

  subscribe(symbols: TradableSymbol[], onTick: (tick: MarketTick) => void): () => void {
    for (const symbol of symbols) {
      if (!this.listeners.has(symbol)) this.listeners.set(symbol, new Set());
      this.listeners.get(symbol)?.add(onTick);
    }
    return () => {
      for (const symbol of symbols) this.listeners.get(symbol)?.delete(onTick);
    };
  }
}

/**
 * `/price` answers `{"price":"1.16"}` for one symbol and
 * `{"EUR/USD":{"price":"1.16"}}` for several. Both shapes are read explicitly;
 * anything else yields `null` rather than a guess.
 */
function readPrice(body: unknown, providerSymbol: string, single: boolean): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  if (single) {
    const direct = record.price;
    if (typeof direct === 'string') return direct;
  }
  const entry = record[providerSymbol];
  if (typeof entry === 'object' && entry !== null) {
    const price = (entry as Record<string, unknown>).price;
    if (typeof price === 'string') return price;
  }
  return null;
}

/** Parses `TWELVE_DATA_QUOTE_SYMBOL_MAP` (`EURUSD=EUR/USD,GBPUSD=GBP/USD`). */
export function parseTwelveDataQuoteSymbols(
  raw: string,
  specs: Record<TradableSymbol, SymbolSimConfig>,
): Partial<Record<TradableSymbol, TwelveDataQuoteSymbolConfig>> {
  const symbols: Partial<Record<TradableSymbol, TwelveDataQuoteSymbolConfig>> = {};
  for (const pair of raw.split(',')) {
    const [symbol, providerSymbol] = pair.split('=').map((part) => part.trim());
    if (!symbol || !providerSymbol) continue;
    const spec = specs[symbol as TradableSymbol];
    if (spec === undefined) continue;
    symbols[symbol as TradableSymbol] = {
      providerSymbol,
      spreadPoints: spec.spreadPoints,
      pricePrecision: spec.pricePrecision,
      staleThresholdMs: spec.staleThresholdMs,
    };
  }
  return symbols;
}
