'use client';

export type CommerceAnalyticsEvent =
  | 'commerce_catalog_viewed'
  | 'commerce_family_selected'
  | 'commerce_size_selected'
  | 'commerce_checkout_started'
  | 'commerce_checkout_submitted'
  | 'commerce_payment_started'
  | 'commerce_payment_result';

export function trackCommerceEvent(
  event: CommerceAnalyticsEvent,
  context: {
    offerId?: string;
    source?: string;
    result?: string;
    utmSource?: string;
    utmCampaign?: string;
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
