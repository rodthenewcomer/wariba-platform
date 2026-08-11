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
 * every symbol. Choosing in JavaScript means exactly one dock tree exists at a
 * time: inline on desktop, inside the sheet on mobile.
 *
 * SSR-safe: the server and the first client render agree on `true`, then the
 * real match is applied on mount — so the markup never differs during
 * hydration, and a desktop user (the common case) never sees a flip.
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
