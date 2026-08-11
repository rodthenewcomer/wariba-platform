'use client';

import { useEffect, useState } from 'react';

/** Matches the `lg:` breakpoint the workstation grid switches on. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Whether the workstation is on its desktop presentation.
 *
 * This exists because W2 §27 requires that **only the active presentation owns
 * the expensive tick consumers**. CSS can hide the desktop dock on a phone, but
 * it cannot unmount it — and a hidden `PositionsTabPanel` still holds a
 * `useAllTicks` subscription and still recomputes live P&L on every tick of
 * every symbol. Choosing in JavaScript is what keeps the two presentations
 * from being live at once: inline on desktop, inside the sheet on mobile.
 *
 * **What is actually guaranteed.** This hook starts from the SSR-safe desktop
 * assumption (`true`) so server and first client render agree, and resolves
 * `matchMedia` after mount. So the honest invariant is not "only one dock tree
 * is ever constructed" — on a phone the desktop branch renders for the first
 * client paint and is then replaced. What is certified is that **after viewport
 * resolution exactly one dock presentation remains mounted**, and that the
 * mobile and desktop docks are never concurrently active. A desktop user (the
 * common case) never sees a flip at all.
 */
export function useIsDesktop(query: string = DESKTOP_QUERY): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setIsDesktop(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [query]);

  return isDesktop;
}
