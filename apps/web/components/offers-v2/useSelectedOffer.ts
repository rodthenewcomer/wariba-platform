'use client';

import { useEffect, useState } from 'react';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { onOfferSelected } from '../commerce/offer-selection-events';

export { requestOfferSelection } from '../commerce/offer-selection-events';

/**
 * The read side of the offer-selection event bus (see
 * `offer-selection-events.ts`) — for a section that displays the current
 * selection (the sticky dock, the final CTA) without driving it.
 *
 * ## Why this doesn't read `window.location.search` in its initial state
 *
 * An earlier version did exactly that in the `useState` initializer, which
 * is a real hydration bug, not a style nit: the server has no `window`, so
 * it always rendered `fallback`, while the client's first render read the
 * real `?offre=` value immediately — two different trees for the same
 * markup, and React logs a hydration-mismatch error and discards the
 * server HTML for that subtree. Both renders start from `fallback` here,
 * matching what the server produced; a `useEffect` (client-only, runs
 * after hydration completes) then reads the URL once and, if it names a
 * real offer, corrects the state. A shared link still lands every section
 * on the same offer, one paint later rather than on the first one.
 */
export function useSelectedOffer(
  offers: readonly CanonicalOfferReadModel[],
  fallback: CanonicalOfferReadModel,
): CanonicalOfferReadModel {
  const [offerId, setOfferId] = useState<string>(fallback.offerId);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('offre');
    if (fromUrl) setOfferId(fromUrl);
  }, []);

  useEffect(() => onOfferSelected(setOfferId), []);

  return offers.find((offer) => offer.offerId === offerId) ?? fallback;
}
