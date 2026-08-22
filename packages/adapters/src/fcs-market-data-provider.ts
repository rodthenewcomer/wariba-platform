import type {
  MarketDataProvider,
  MarketStatus,
  MarketTick,
  TradableSymbol,
} from './market-data-provider';

export type MarketDataBlockReason = 'BLOCKED_BY_CREDENTIAL' | 'BLOCKED_BY_INFRASTRUCTURE';

/**
 * Thrown instead of ever faking a live connection. Prompt 07B §16 ("no fake
 * live-data behavior... no claiming FCS connectivity works without an actual
 * credential test") — this is the mechanism that makes that a compile-time
 * and run-time guarantee rather than a code-review convention.
 */
export class MarketDataProviderBlockedError extends Error {
  constructor(
    public readonly reason: MarketDataBlockReason,
    message: string,
  ) {
    super(message);
    this.name = 'MarketDataProviderBlockedError';
  }
}

export interface FcsSymbolConfig {
  /** Provider-side ticker for this internal symbol, resolved from the FCS symbol catalogue (Appendix 07-A §2) — never invented locally. */
  providerSymbol: string;
  staleThresholdMs: number;
}

export interface FcsProviderConfig {
  apiKey: string;
  wsPrimaryUrl: string;
  wsSecondaryUrl: string;
  restBaseUrl: string;
  symbols: Record<TradableSymbol, FcsSymbolConfig>;
}

/** Minimal shape both the native global WebSocket and a test double satisfy — see webSocketFactory below. */
export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: 'open', listener: () => void): void;
  addEventListener(
    type: 'close',
    listener: (event: { code: number; reason: string }) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: unknown) => void): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

const OPEN_READY_STATE = 1;

function sourceMappingVersion(symbols: FcsProviderConfig['symbols']): string {
  const mapping = Object.entries(symbols)
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

interface FcsSymbolState {
  lastTick: MarketTick | null;
  receivedAt: number | null;
}

/**
 * Reconnect/backoff schedule shared by the primary/secondary failover loop —
 * doubles each attempt, caps at 30s, alternates target between the two URLs
 * so a persistently-down primary doesn't starve the secondary.
 */
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

/**
 * Prompt 07B §5 — the live FCS Business WebSocket adapter. Structurally
 * complete (config contract, fail-fast on missing credential, primary/
 * secondary failover with backoff, subscription bookkeeping, tick cache) but
 * UNVERIFIED against FCS's real wire protocol: `parseFcsMessage` below is a
 * best-effort mapping, not confirmed against FCS's live WebSocket Business
 * docs, because no FCS_API_KEY has ever existed in this environment to test
 * against. Whoever wires a real key must verify/adjust parseFcsMessage and
 * the subscription payload shape against a real session before trusting
 * this in production — do not assume it is correct as shipped.
 */
export class FcsMarketDataProvider implements MarketDataProvider {
  readonly providerName = 'fcs';
  readonly source: MarketDataProvider['source'];
  private readonly symbolByProviderTicker = new Map<string, TradableSymbol>();
  private readonly state = new Map<TradableSymbol, FcsSymbolState>();
  private readonly listeners = new Map<TradableSymbol, Set<(tick: MarketTick) => void>>();
  private readonly desiredSymbols = new Set<TradableSymbol>();
  private socket: WebSocketLike | null = null;
  private usingPrimary = true;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;

  constructor(
    private readonly config: FcsProviderConfig,
    private readonly webSocketFactory: WebSocketFactory = (url) =>
      new (globalThis as { WebSocket: new (url: string) => WebSocketLike }).WebSocket(url),
  ) {
    if (!config.apiKey) {
      throw new MarketDataProviderBlockedError(
        'BLOCKED_BY_CREDENTIAL',
        'FCS_API_KEY is not configured — FcsMarketDataProvider cannot open a live connection. ' +
          'Set FCS_API_KEY, FCS_WS_PRIMARY_URL, FCS_WS_SECONDARY_URL, FCS_REST_BASE_URL and ' +
          'FCS_SYMBOL_MAP before selecting MARKET_DATA_PROVIDER=fcs. Until then, use ' +
          "MARKET_DATA_PROVIDER=mock or MARKET_DATA_PROVIDER=replay — never simulate a live feed under this provider's name.",
      );
    }
    if (!config.wsPrimaryUrl || !config.restBaseUrl) {
      throw new MarketDataProviderBlockedError(
        'BLOCKED_BY_CREDENTIAL',
        'FCS_WS_PRIMARY_URL and FCS_REST_BASE_URL must both be set alongside FCS_API_KEY.',
      );
    }
    const version = sourceMappingVersion(config.symbols);
    this.source = {
      id: `fcs:live:${version}`,
      provider: 'fcs',
      environment: 'live-unverified',
      mode: 'live',
      version: `${version}-unverified`,
      capabilities: {
        realtimeQuotes: true,
        bidAsk: true,
        historicalBars: false,
        nativeIntervals: [],
        pagination: 'none',
        volume: false,
        depth: false,
      },
    };
    for (const [symbol, symbolConfig] of Object.entries(config.symbols) as [
      TradableSymbol,
      FcsSymbolConfig,
    ][]) {
      this.symbolByProviderTicker.set(symbolConfig.providerSymbol, symbol);
      this.state.set(symbol, { lastTick: null, receivedAt: null });
    }
  }

  start(): void {
    this.stopped = false;
    this.reconnectAttempt = 0;
    this.openSocket();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private currentUrl(): string {
    return this.usingPrimary
      ? this.config.wsPrimaryUrl
      : this.config.wsSecondaryUrl || this.config.wsPrimaryUrl;
  }

  private openSocket(): void {
    if (this.stopped) return;
    const socket = this.webSocketFactory(this.currentUrl());
    this.socket = socket;
    socket.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.sendSubscription(Array.from(this.desiredSymbols));
    });
    socket.addEventListener('message', (event) => {
      const tick = parseFcsMessage(event.data, this.symbolByProviderTicker);
      if (!tick) return;
      const s = this.state.get(tick.symbol);
      if (!s) return;
      s.lastTick = tick;
      s.receivedAt = Date.now();
      for (const listener of this.listeners.get(tick.symbol) ?? []) {
        listener(tick);
      }
    });
    socket.addEventListener('close', () => this.scheduleReconnect());
    socket.addEventListener('error', () => this.scheduleReconnect());
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.usingPrimary = !this.usingPrimary; // alternate primary/secondary on every reconnect attempt
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  /**
   * Subscription wire format is UNVERIFIED (see class doc) — this is FCS's
   * documented WebSocket Business subscribe shape as best understood without
   * a live key to confirm against; adjust once a real session is available.
   */
  private sendSubscription(symbols: TradableSymbol[]): void {
    if (!this.socket || this.socket.readyState !== OPEN_READY_STATE || symbols.length === 0) return;
    const tickers = symbols
      .map((symbol) => this.config.symbols[symbol]?.providerSymbol)
      .filter((ticker): ticker is string => Boolean(ticker));
    if (tickers.length === 0) return;
    this.socket.send(
      JSON.stringify({ action: 'subscribe', apiKey: this.config.apiKey, symbols: tickers }),
    );
  }

  subscribe(symbols: TradableSymbol[], onTick: (tick: MarketTick) => void): () => void {
    const newlyDesired = symbols.filter((symbol) => !this.desiredSymbols.has(symbol));
    for (const symbol of symbols) {
      this.desiredSymbols.add(symbol);
      if (!this.listeners.has(symbol)) {
        this.listeners.set(symbol, new Set());
      }
      this.listeners.get(symbol)?.add(onTick);
    }
    if (newlyDesired.length > 0) this.sendSubscription(newlyDesired);
    return () => {
      for (const symbol of symbols) {
        this.listeners.get(symbol)?.delete(onTick);
        if ((this.listeners.get(symbol)?.size ?? 0) === 0) {
          this.desiredSymbols.delete(symbol);
        }
      }
    };
  }

  getSnapshot(symbol: TradableSymbol): MarketTick {
    const s = this.state.get(symbol);
    if (!s || !s.lastTick) {
      throw new Error(
        `No live tick received yet for ${symbol} — not subscribed or feed not yet warm.`,
      );
    }
    return { ...s.lastTick, marketStatus: this.getMarketStatus(symbol) };
  }

  getMarketStatus(symbol: TradableSymbol): MarketStatus {
    const s = this.state.get(symbol);
    const symbolConfig = this.config.symbols[symbol];
    if (!s || !s.receivedAt || !symbolConfig) return 'closed';
    const ageMs = Date.now() - s.receivedAt;
    return ageMs > symbolConfig.staleThresholdMs ? 'stale' : 'open';
  }
}

/**
 * UNVERIFIED against FCS's real message shape — see class doc comment.
 * Written defensively (returns null on anything unexpected) so a wrong
 * assumption fails closed (no tick produced) rather than fabricating a
 * price from a misparsed message.
 */
export function parseFcsMessage(
  data: unknown,
  symbolByProviderTicker: Map<string, TradableSymbol>,
): MarketTick | null {
  if (typeof data !== 'string') return null;
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const providerTicker = record.symbol ?? record.s;
  if (typeof providerTicker !== 'string') return null;
  const symbol = symbolByProviderTicker.get(providerTicker);
  if (!symbol) return null;
  const bid = record.bid ?? record.b;
  const ask = record.ask ?? record.a;
  if (typeof bid !== 'string' && typeof bid !== 'number') return null;
  if (typeof ask !== 'string' && typeof ask !== 'number') return null;
  const providerTimestamp = record.timestamp ?? record.t;
  return {
    symbol,
    bid: String(bid),
    ask: String(ask),
    timestamp:
      typeof providerTimestamp === 'number'
        ? new Date(providerTimestamp * 1000).toISOString()
        : typeof providerTimestamp === 'string'
          ? providerTimestamp
          : new Date().toISOString(),
    sequence: Date.now(),
    marketStatus: 'open',
  };
}
