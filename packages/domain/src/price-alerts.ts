import Decimal from 'decimal.js';

/**
 * Prompt 7 Appendix 07-D §17 — server-side price-alert crossing logic.
 * Deliberately a crossing detector, not a threshold-equality check ("Do not
 * trigger an alert merely because one tick equals the alert price"): every
 * evaluation compares the current side of the threshold against the last
 * *observed* side, persisted on the alert row (app.price_alerts.
 * last_observed_side_above) — the alert only fires on an actual
 * above→below or below→above transition, and a one-time alert disables
 * itself after firing while a recurring one only rearms once price
 * genuinely returns to the other side (naturally implied by requiring a
 * transition to fire again, not a separate rearm window).
 */
export type AlertDirection = 'cross_above' | 'cross_below';
export type AlertSource = 'bid' | 'ask' | 'mid';

export function resolveAlertPrice(source: AlertSource, tick: { bid: string; ask: string }): string {
  if (source === 'bid') return tick.bid;
  if (source === 'ask') return tick.ask;
  return new Decimal(tick.bid).plus(tick.ask).dividedBy(2).toFixed();
}

export function isPriceAboveThreshold(price: string, threshold: string): boolean {
  return new Decimal(price).greaterThanOrEqualTo(threshold);
}

/**
 * `lastObservedSideAbove: null` means this is the alert's very first
 * evaluation (or the first since creation/re-enable) — there is no real
 * prior side to have crossed from, so it never fires on that observation;
 * it only establishes the baseline for the next one.
 */
export function shouldTriggerAlert(params: {
  direction: AlertDirection;
  lastObservedSideAbove: boolean | null;
  currentSideAbove: boolean;
}): boolean {
  if (params.lastObservedSideAbove === null) return false;
  if (params.direction === 'cross_above') {
    return !params.lastObservedSideAbove && params.currentSideAbove;
  }
  return params.lastObservedSideAbove && !params.currentSideAbove;
}
