import Decimal from 'decimal.js';

/**
 * Pure treasury/reserve calculations — Prompt 08 Phase E. Same conventions
 * as risk-math.ts/performance-math.ts (Decimal.js only, decimal strings in
 * and out, no DB/IO dependency). Zones and thresholds are
 * TREASURY-001/002 (docs/00-decisions/DECISION_LOG.md), copied verbatim
 * from the operator's own revised Prompt 08 text §20 — this is genuinely
 * new ground, not a restatement of anything already locked elsewhere.
 */

export type ReserveZone = 'normal' | 'prudence' | 'defensive' | 'critical';

/** Undefined (not 0 or Infinity) when there are no projected payouts — a zero-payout period isn't "infinitely well covered", it's not a meaningful ratio at all. */
export function computeReserveCoverageRatio(params: {
  availableReserve: string;
  projectedPayoutsNext30Days: string;
}): string | null {
  const projected = new Decimal(params.projectedPayoutsNext30Days);
  if (projected.lessThanOrEqualTo(0)) return null;
  return new Decimal(params.availableReserve).dividedBy(projected).toFixed(4);
}

/**
 * TREASURY-002 zone table:
 *   >= 2.0x    NORMAL
 *   1.5x-2.0x  PRUDENCE
 *   1.2x-1.5x  DEFENSIVE
 *   < 1.2x     CRITICAL
 * A null ratio (no projected payouts at all) is NORMAL — there is nothing
 * to be defensive about yet.
 */
export function resolveReserveZone(coverageRatio: string | null): ReserveZone {
  if (coverageRatio === null) return 'normal';
  const ratio = new Decimal(coverageRatio);
  if (ratio.greaterThanOrEqualTo('2.0')) return 'normal';
  if (ratio.greaterThanOrEqualTo('1.5')) return 'prudence';
  if (ratio.greaterThanOrEqualTo('1.2')) return 'defensive';
  return 'critical';
}

/**
 * TREASURY-002's required actions, expressed as what a product listing
 * must check — not a generic "is this zone bad" boolean, since NORMAL and
 * PRUDENCE both allow normal sales (PRUDENCE only tightens promotions and
 * review frequency, neither of which this function's callers control).
 */
export function isSizeCommerciallyAvailableInZone(params: {
  zone: ReserveZone;
  productCode: '5K' | '10K' | '25K' | '50K' | '100K';
}): boolean {
  if (params.zone === 'critical') return false;
  if (params.zone === 'defensive') {
    return params.productCode !== '50K' && params.productCode !== '100K';
  }
  return true;
}
