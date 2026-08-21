import type {
  MarketDataProvider,
  MarketStatus,
  MarketTick,
  TradableSymbol,
} from '@wariba/adapters';

interface SequenceState {
  lastRaw: number;
  lastCanonical: number;
  offset: number;
}

/**
 * Converts a provider's process-local sequence into a source-stable WariX
 * sequence. Provider reconnects and service restarts may legitimately reset a
 * local counter; durable chart cutover cannot. Prices and timestamps pass
 * through unchanged and the provider DTO remains behind this boundary.
 */
export class MarketSequenceContinuityProvider implements MarketDataProvider {
  readonly providerName: string;
  readonly source: MarketDataProvider['source'];

  private readonly states = new Map<TradableSymbol, SequenceState>();

  constructor(
    private readonly delegate: MarketDataProvider,
    private readonly persistedWatermarks: Readonly<Record<string, number>>,
  ) {
    this.providerName = delegate.providerName;
    this.source = delegate.source;
  }

  private normalize(tick: MarketTick): MarketTick {
    const state = this.states.get(tick.symbol);
    if (!state) {
      const persisted = this.persistedWatermarks[tick.symbol];
      const canonical =
        persisted === undefined ? tick.sequence : Math.max(tick.sequence, persisted + 1);
      this.states.set(tick.symbol, {
        lastRaw: tick.sequence,
        lastCanonical: canonical,
        offset: canonical - tick.sequence,
      });
      return canonical === tick.sequence ? tick : { ...tick, sequence: canonical };
    }

    if (tick.sequence === state.lastRaw) {
      return state.lastCanonical === tick.sequence
        ? tick
        : { ...tick, sequence: state.lastCanonical };
    }

    if (tick.sequence < state.lastRaw) {
      state.offset = state.lastCanonical + 1 - tick.sequence;
    }
    const canonical = tick.sequence + state.offset;
    state.lastRaw = tick.sequence;
    state.lastCanonical = Math.max(state.lastCanonical + 1, canonical);
    return { ...tick, sequence: state.lastCanonical };
  }

  start(): void {
    this.delegate.start();
  }

  stop(): void {
    this.delegate.stop();
  }

  getSnapshot(symbol: TradableSymbol): MarketTick {
    return this.normalize(this.delegate.getSnapshot(symbol));
  }

  getMarketStatus(symbol: TradableSymbol): MarketStatus {
    return this.delegate.getMarketStatus(symbol);
  }

  subscribe(symbols: TradableSymbol[], onTick: (tick: MarketTick) => void): () => void {
    return this.delegate.subscribe(symbols, (tick) => onTick(this.normalize(tick)));
  }
}
