import type { MarketTick } from '@wariba/adapters';
import type { TradableSymbol } from '@wariba/database';

export type TickGateDecision = 'accepted' | 'duplicate' | 'out_of_order' | 'not_open';

export class MarketTickGate {
  private readonly lastAccepted = new Map<
    TradableSymbol,
    { sequence: number; timestampMs: number }
  >();

  evaluate(tick: MarketTick): TickGateDecision {
    if (tick.marketStatus !== 'open') return 'not_open';
    const timestampMs = new Date(tick.timestamp).getTime();
    const previous = this.lastAccepted.get(tick.symbol);
    if (previous) {
      if (tick.sequence === previous.sequence) return 'duplicate';
      if (tick.sequence < previous.sequence || timestampMs < previous.timestampMs) {
        return 'out_of_order';
      }
    }
    this.lastAccepted.set(tick.symbol, { sequence: tick.sequence, timestampMs });
    return 'accepted';
  }
}
