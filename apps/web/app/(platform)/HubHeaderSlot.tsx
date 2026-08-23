'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const HUB_HEADER_SLOT_ID = 'hub-header-slot';

/**
 * Lets a page put its own controls in the Hub header.
 *
 * §5's rule is that the header carries what is contextual — a date range on
 * Performance, "Ajouter un compte" on Comptes, a payout request when the
 * trader is eligible — and not the union of every page's controls. The only
 * place that knows which control belongs to a page is the page, so the header
 * exposes a slot instead of a lookup table the pages would have to be kept in
 * sync with.
 *
 * A portal rather than context, because the pages that need this are server
 * components: they can render a client component with children, but they
 * cannot subscribe to a provider. Mounting is deferred one effect so the
 * target exists — rendering into a node that is not in the document yet is
 * how a portal silently drops its children on first paint.
 */
export function HubHeaderSlot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(HUB_HEADER_SLOT_ID));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
