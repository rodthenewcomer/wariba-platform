import type {
  MarketDataProvider,
  MarketStatus,
  MarketTick,
  TradableSymbol,
} from './market-data-provider';

/**
 * One recorded tick. `offsetMs` is documentary (position within the
 * original capture) — replay itself advances one recorded tick per
 * tick()/interval step, the same call-driven model MockMarketDataProvider
 * uses, rather than trying to replay wall-clock-accurate spacing.
 */
export interface RecordedTick {
  symbol: TradableSymbol;
  bid: string;
  ask: string;
  offsetMs: number;
}

export type MarketDataRecording = readonly RecordedTick[];

interface ReplayState {
  ticks: RecordedTick[];
  cursor: number;
  sequence: number;
  lastTimestamp: string;
  exhausted: boolean;
}

/**
 * Prompt 07B §5 — plays a fixed, previously captured tick sequence back
 * deterministically. Distinct from MockMarketDataProvider (a synthetic
 * random-walk generator): this exists so a "real-shaped" session — the kind
 * a live FCS connection would have produced — can be exercised in tests,
 * demos, and MARKET_DATA_REPLAY_MODE=true environments without ever opening
 * a live connection. Never fabricates a price outside what's in `recording`;
 * a symbol with no recorded ticks stays permanently 'closed'.
 */
export class ReplayMarketDataProvider implements MarketDataProvider {
  readonly providerName = 'replay';
  readonly source: MarketDataProvider['source'];
  private readonly state = new Map<TradableSymbol, ReplayState>();
  private readonly listeners = new Map<TradableSymbol, Set<(tick: MarketTick) => void>>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    recording: MarketDataRecording,
    symbols: readonly TradableSymbol[],
    private readonly tickIntervalMs: number = 1000,
    private readonly loop: boolean = true,
  ) {
    let recordingHash = 2166136261;
    for (const tick of recording) {
      const value = `${tick.symbol}:${tick.bid}:${tick.ask}:${tick.offsetMs}`;
      for (let index = 0; index < value.length; index += 1) {
        recordingHash ^= value.charCodeAt(index);
        recordingHash = Math.imul(recordingHash, 16777619);
      }
    }
    const version = `fnv1a-${(recordingHash >>> 0).toString(16)}-${recording.length}-${loop ? 'loop' : 'once'}`;
    this.source = {
      id: `replay:recording:${version}`,
      provider: this.providerName,
      environment: 'recording',
      mode: 'replay',
      version,
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
    for (const symbol of symbols) {
      this.state.set(symbol, {
        ticks: recording.filter((t) => t.symbol === symbol).sort((a, b) => a.offsetMs - b.offsetMs),
        cursor: 0,
        sequence: 0,
        lastTimestamp: new Date().toISOString(),
        exhausted: false,
      });
    }
  }

  private buildTick(symbol: TradableSymbol, s: ReplayState): MarketTick {
    const recorded = s.ticks[s.cursor] ?? null;
    const status: MarketStatus = recorded === null ? 'closed' : s.exhausted ? 'stale' : 'open';
    return {
      symbol,
      bid: recorded?.bid ?? '0',
      ask: recorded?.ask ?? '0',
      timestamp: s.lastTimestamp,
      sequence: s.sequence,
      marketStatus: status,
    };
  }

  /** Advances every symbol to its next recorded tick (one step per call) and notifies subscribers. */
  tick(now: Date = new Date()): MarketTick[] {
    const ticks: MarketTick[] = [];
    for (const [symbol, s] of this.state) {
      if (s.ticks.length > 0) {
        if (s.cursor + 1 < s.ticks.length) {
          s.cursor += 1;
        } else if (this.loop) {
          s.cursor = 0;
        } else {
          s.exhausted = true;
        }
      }
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

  getSnapshot(symbol: TradableSymbol): MarketTick {
    const s = this.state.get(symbol);
    if (!s) throw new Error(`Unknown symbol: ${symbol}`);
    return this.buildTick(symbol, s);
  }

  getMarketStatus(symbol: TradableSymbol): MarketStatus {
    return this.getSnapshot(symbol).marketStatus;
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
