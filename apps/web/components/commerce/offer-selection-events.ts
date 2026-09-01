'use client';

/**
 * The two `window` events that let marketing sections outside
 * `OfferConfigurator` read and (with permission) drive its selection,
 * without lifting its state or re-deriving it from `useSearchParams` — see
 * `OfferConfigurator`'s own comment on why selection is local `useState`
 * with a manually patched URL, not router-driven.
 *
 * `SELECTED`: dispatched by `OfferConfigurator` whenever the selected offer
 * changes, including on mount — the read side for the sticky dock, the
 * final CTA, and anything else that only displays the current choice.
 *
 * `SELECT_REQUEST`: dispatched by any other section (the fast-path rail,
 * decision-assist) to ask for a change. `OfferConfigurator` listens and
 * routes the request through its own `selectOffer`, so URL sync, analytics
 * and the spec-flash animation all still happen in exactly one place.
 */
export interface OfferSelectionEventDetail {
  offerId: string;
}

export const OFFER_SELECTED_EVENT = 'wariba:offer-selected';
export const OFFER_SELECT_REQUEST_EVENT = 'wariba:select-offer';

export function announceOfferSelected(offerId: string): void {
  window.dispatchEvent(
    new CustomEvent<OfferSelectionEventDetail>(OFFER_SELECTED_EVENT, { detail: { offerId } }),
  );
}

export function requestOfferSelection(offerId: string): void {
  window.dispatchEvent(
    new CustomEvent<OfferSelectionEventDetail>(OFFER_SELECT_REQUEST_EVENT, { detail: { offerId } }),
  );
}

export function onOfferSelected(handler: (offerId: string) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<OfferSelectionEventDetail>).detail;
    if (detail?.offerId) handler(detail.offerId);
  };
  window.addEventListener(OFFER_SELECTED_EVENT, listener);
  return () => window.removeEventListener(OFFER_SELECTED_EVENT, listener);
}

export function onOfferSelectionRequested(handler: (offerId: string) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<OfferSelectionEventDetail>).detail;
    if (detail?.offerId) handler(detail.offerId);
  };
  window.addEventListener(OFFER_SELECT_REQUEST_EVENT, listener);
  return () => window.removeEventListener(OFFER_SELECT_REQUEST_EVENT, listener);
}
