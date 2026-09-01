'use client';

export type CommerceAnalyticsEvent =
  | 'commerce_catalog_viewed'
  | 'commerce_family_selected'
  | 'commerce_size_selected'
  | 'commerce_checkout_started'
  | 'commerce_checkout_submitted'
  | 'commerce_payment_started'
  | 'commerce_payment_result'
  /*
   * Added for the /offres V2 acquisition rebuild — one funnel event per
   * commercial job a section performs, so paid-traffic diagnosis can see
   * where a visitor converts or drops, per the CTA's `ctaLocation`
   * ('hero' | 'fast_path' | 'decision_engine' | 'lifecycle' | 'risk' |
   * 'payouts' | 'decision_assist' | 'sticky_dock' | 'final'). No new
   * provider, no PII — same first-party beacon as the events above.
   */
  | 'commerce_offers_primary_cta_clicked'
  | 'commerce_offer_cta_clicked'
  | 'commerce_rules_clicked'
  | 'commerce_payouts_clicked'
  | 'commerce_warix_clicked'
  /*
   * Added for the Decision Engine V2 rebuild — the toolbar and rule-layer
   * controls are display/view preferences, not commercial decisions, but
   * knowing which visitors reach for "Comparer" or "Montants" is exactly
   * the signal that decides what the default should be later.
   */
  | 'commerce_display_mode_changed'
  | 'commerce_view_mode_changed'
  | 'commerce_performance_rules_expanded'
  | 'commerce_performance_rules_collapsed';

export function trackCommerceEvent(
  event: CommerceAnalyticsEvent,
  context: {
    offerId?: string;
    source?: string;
    result?: string;
    utmSource?: string;
    utmCampaign?: string;
    ctaLocation?: string;
    mode?: string;
  } = {},
): void {
  const body = JSON.stringify({ event, ...context });
  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    navigator.sendBeacon('/api/v1/commerce/events', new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch('/api/v1/commerce/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}
