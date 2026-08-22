import type { RealtimeContinuation } from '@wariba/contracts';
import Decimal from 'decimal.js';

/**
 * WX3.1 §2 — the historical/realtime cutover decision, on its own.
 *
 * Extracted from the history store so the rule can be tested directly instead
 * of through a database. It is the single most consequential decision in the
 * market-data path — it is what stands between a genuine archive and a
 * synthetic price being drawn onto it — and a rule that important should not
 * only be reachable via an integration fixture.
 */

export type CutoverMode = 'never' | 'verified' | 'always';

export interface CutoverInput {
  mode: CutoverMode;
  toleranceBps: number;
  historyProvider: string;
  realtimeProvider: string;
  /** Newest finalized provider close, or null when the archive is empty. */
  providerClose: string | null;
  /** Current live close, or null when no live candle exists yet. */
  liveClose: string | null;
}

export interface CutoverDecision {
  continuation: RealtimeContinuation;
  /** Measured divergence in basis points, when both prices were available. */
  divergenceBps: string | null;
}

/**
 * Decides whether live ticks may extend a provider series.
 *
 * `verified` runs the price comparison first, **even when both sides are the
 * same vendor**. Sharing a vendor is evidence that two feeds describe the same
 * market; the prices agreeing is proof, and taking the shortcut whenever proof
 * is available would leave the attached path asserted rather than demonstrated.
 * The vendor-identity fallback applies only when there is no price to compare.
 *
 * Refusal is not an error. It means the chart shows genuine history and stops
 * there, which is the truthful outcome when two sources disagree about what
 * the market is worth.
 */
export function decideRealtimeContinuation(input: CutoverInput): CutoverDecision {
  if (input.mode === 'never') {
    return { continuation: 'refused_by_config', divergenceBps: null };
  }
  if (input.mode === 'always') {
    return { continuation: 'attached', divergenceBps: null };
  }
  if (input.providerClose === null || input.liveClose === null) {
    return {
      continuation:
        input.historyProvider === input.realtimeProvider ? 'attached' : 'refused_source_mismatch',
      divergenceBps: null,
    };
  }
  const provider = new Decimal(input.providerClose);
  if (provider.isZero() || provider.isNegative()) {
    return { continuation: 'refused_source_mismatch', divergenceBps: null };
  }
  const divergenceBps = new Decimal(input.liveClose)
    .minus(provider)
    .dividedBy(provider)
    .abs()
    .times(10_000);
  return {
    continuation: divergenceBps.lessThanOrEqualTo(input.toleranceBps)
      ? 'attached'
      : 'refused_price_divergence',
    divergenceBps: divergenceBps.toFixed(1),
  };
}
