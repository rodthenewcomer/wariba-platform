import Decimal from 'decimal.js';

export type TradableSymbol = 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'XAUUSD' | 'NAS100';
export type MarketStatus = 'open' | 'stale' | 'closed';

export interface MarketTick {
  symbol: TradableSymbol;
  bid: string;
  ask: string;
  timestamp: string;
  sequence: number;
  marketStatus: MarketStatus;
}

export interface SymbolSimConfig {
  basePrice: string;
  pricePrecision: number;
  spreadPoints: string;
  staleThresholdMs: number;
}

export type MarketDataMode = 'sandbox' | 'replay' | 'live';

/**
 * WX3.1 §5 — what this source is contractually allowed to be shown to.
 *
 * `internal` covers research, backtesting and internal dashboards. `external`
 * is what a customer-facing chart needs. `unknown` is the honest default and
 * is deliberately not treated as permission.
 *
 * This is a configuration statement about a commercial agreement, not a legal
 * conclusion drawn by this code. Nothing here clears anything; it exists so a
 * production deployment cannot quietly present a development-tier,
 * non-display key as a cleared market-data licence.
 */
export const DISPLAY_RIGHTS = ['internal', 'external', 'unknown'] as const;
export type DisplayRights = (typeof DISPLAY_RIGHTS)[number];

export interface MarketDataCapabilities {
  realtimeQuotes: boolean;
  bidAsk: boolean;
  historicalBars: boolean;
  nativeIntervals: readonly string[];
  pagination: 'none' | 'cursor' | 'time_range';
  volume: boolean;
  depth: boolean;
  /** Absent on WX2-era sources, which predate the field; treat as `unknown`. */
  displayRights?: DisplayRights;
}

export interface MarketDataSourceIdentity {
  /** Stable, non-secret identity used to partition the durable bar cache. */
  id: string;
  provider: string;
  environment: string;
  mode: MarketDataMode;
  version: string;
  capabilities: MarketDataCapabilities;
}

const REALTIME_QUOTE_ONLY_CAPABILITIES: MarketDataCapabilities = {
  realtimeQuotes: true,
  bidAsk: true,
  historicalBars: false,
  nativeIntervals: [],
  pagination: 'none',
  volume: false,
  depth: false,
  // Simulated prices generated in this process. There is no vendor and
  // therefore no vendor restriction on showing them.
  displayRights: 'external',
};

/**
 * Prompt 07B — shared lifecycle every provider implements, regardless of
 * where its ticks actually come from (an in-process generator, a recorded
 * fixture, or a live FCS WebSocket): start() begins producing/receiving
 * ticks, stop() cleanly tears the source down. Callers (services/realtime)
 * depend only on this interface, never on a concrete provider class, so the
 * active implementation is a pure MARKET_DATA_PROVIDER config choice.
 */
export interface MarketDataProvider {
  readonly providerName: string;
  readonly source: MarketDataSourceIdentity;
  start(): void;
  stop(): void;
  getSnapshot(symbol: TradableSymbol): MarketTick;
  getMarketStatus(symbol: TradableSymbol): MarketStatus;
  subscribe(symbols: TradableSymbol[], onTick: (tick: MarketTick) => void): () => void;
}

/**
 * DATA-001/002: deterministic, seeded synthetic market data — the same seed
 * always produces the same price sequence. A tiny PRNG (mulberry32) is used
 * purely to pick a walk-step direction/magnitude; the step is immediately
 * applied through Decimal arithmetic and every returned price is formatted
 * to the symbol's exact precision, so float imprecision never reaches a
 * stored or traded value (the "no float" rule is about money, not about
 * how an arbitrary walk offset gets picked).
 *
 * DATA-003: ticks are NOT persisted here — this is pure in-memory
 * generation. Whatever calls this (services/realtime) is responsible for
 * only persisting the snapshots that matter (tied to fills/violations,
 * per DATA-004).
 */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbolToSeed(seed: number, symbol: string): number {
  let h = seed;
  for (let i = 0; i < symbol.length; i += 1) {
    h = (Math.imul(h, 31) + symbol.charCodeAt(i)) | 0;
  }
  return h;
}

interface SymbolState {
  mid: Decimal;
  sequence: number;
  rng: () => number;
  paused: boolean;
  lastTimestamp: string;
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly providerName = 'mock';
  readonly source: MarketDataSourceIdentity;
  private readonly configs: Record<TradableSymbol, SymbolSimConfig>;
  private readonly state = new Map<TradableSymbol, SymbolState>();
  private readonly listeners = new Map<TradableSymbol, Set<(tick: MarketTick) => void>>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    seed: number,
    configs: Record<TradableSymbol, SymbolSimConfig>,
    private readonly tickIntervalMs: number = 1000,
  ) {
    this.source = {
      id: `mock:sandbox:seed-${seed}:v1`,
      provider: this.providerName,
      environment: 'sandbox',
      mode: 'sandbox',
      version: `seed-${seed}:v1`,
      capabilities: REALTIME_QUOTE_ONLY_CAPABILITIES,
    };
    this.configs = configs;
    for (const symbol of Object.keys(configs) as TradableSymbol[]) {
      this.state.set(symbol, {
        mid: new Decimal(configs[symbol].basePrice),
        sequence: 0,
        rng: mulberry32(hashSymbolToSeed(seed, symbol)),
        paused: false,
        lastTimestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * A paused symbol is immediately 'stale' regardless of age (the explicit
   * demo/test trigger for DATA-005) — otherwise status is purely a function
   * of how old the last tick is versus the symbol's stale threshold, the
   * same signal the execution transaction itself checks (packages/domain
   * isStale). There is no separately-tracked status field to fall out of
   * sync with that.
   */
  private computeStatus(symbol: TradableSymbol, s: SymbolState): MarketStatus {
    if (s.paused) return 'stale';
    const ageMs = Date.now() - new Date(s.lastTimestamp).getTime();
    return ageMs > this.configs[symbol].staleThresholdMs ? 'stale' : 'open';
  }

  private buildTick(symbol: TradableSymbol, s: SymbolState): MarketTick {
    const config = this.configs[symbol];
    const pointValue = new Decimal(10).pow(-config.pricePrecision);
    const halfSpread = new Decimal(config.spreadPoints).times(pointValue).dividedBy(2);
    return {
      symbol,
      bid: s.mid.minus(halfSpread).toFixed(config.pricePrecision),
      ask: s.mid.plus(halfSpread).toFixed(config.pricePrecision),
      timestamp: s.lastTimestamp,
      sequence: s.sequence,
      marketStatus: this.computeStatus(symbol, s),
    };
  }

  /** Advances every non-paused symbol by one deterministic step and notifies subscribers. */
  tick(now: Date = new Date()): MarketTick[] {
    const ticks: MarketTick[] = [];
    for (const symbol of Object.keys(this.configs) as TradableSymbol[]) {
      const s = this.state.get(symbol);
      if (!s || s.paused) continue;
      const config = this.configs[symbol];
      const pointValue = new Decimal(10).pow(-config.pricePrecision);
      // Deterministic walk: +/- up to 8 points per tick, roughly symmetric.
      const direction = s.rng() < 0.5 ? -1 : 1;
      const magnitude = Math.floor(s.rng() * 8) + 1;
      const step = pointValue.times(magnitude).times(direction);
      s.mid = Decimal.max(s.mid.plus(step), pointValue); // never let price go to zero or negative
      s.sequence += 1;
      s.lastTimestamp = now.toISOString();

      const newTick = this.buildTick(symbol, s);
      ticks.push(newTick);

      for (const listener of this.listeners.get(symbol) ?? []) {
        listener(newTick);
      }
    }
    return ticks;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Test/demo hook for the stale-data rejection scenario (DATA-005). */
  pause(symbol: TradableSymbol): void {
    const s = this.state.get(symbol);
    if (s) s.paused = true;
  }

  resume(symbol: TradableSymbol): void {
    const s = this.state.get(symbol);
    if (s) {
      s.paused = false;
      s.lastTimestamp = new Date().toISOString();
    }
  }

  getSnapshot(symbol: TradableSymbol): MarketTick {
    const s = this.state.get(symbol);
    if (!s) throw new Error(`Unknown symbol: ${symbol}`);
    return this.buildTick(symbol, s);
  }

  getMarketStatus(symbol: TradableSymbol): MarketStatus {
    const s = this.state.get(symbol);
    if (!s) throw new Error(`Unknown symbol: ${symbol}`);
    return this.computeStatus(symbol, s);
  }

  subscribe(symbols: TradableSymbol[], onTick: (tick: MarketTick) => void): () => void {
    for (const symbol of symbols) {
      if (!this.listeners.has(symbol)) {
        this.listeners.set(symbol, new Set());
      }
      this.listeners.get(symbol)?.add(onTick);
    }
    return () => {
      for (const symbol of symbols) {
        this.listeners.get(symbol)?.delete(onTick);
      }
    };
  }
}

/** Sandbox base prices — display/generation only, independent of execution symbol_specs. */
export const SANDBOX_BASE_PRICES: Record<TradableSymbol, string> = {
  EURUSD: '1.08450',
  GBPUSD: '1.26000',
  USDJPY: '150.100',
  XAUUSD: '2000.00',
  NAS100: '18000.0',
};
