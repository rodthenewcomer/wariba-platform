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

/** The hybrid band (visual closure §22): desktop grid, but not enough width for three columns. */
export const HYBRID_QUERY = '(min-width: 1024px) and (max-width: 1279px)';

/**
 * Whether the workstation is in the 1024–1279 hybrid band.
 *
 * Used for one decision only: whether an explicitly-opened Market Navigator
 * takes width from the chart or floats over it. Starting `false` keeps the SSR
 * render and the first client paint on the wide composition, which is both the
 * common case and the safe one — a first paint that reserves the track and then
 * releases it is a layout shift; the reverse is not.
 */
export function useIsHybridDesktop(query: string = HYBRID_QUERY): boolean {
  const [isHybrid, setIsHybrid] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setIsHybrid(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [query]);

  return isHybrid;
}

export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * The live viewport, for the Workspace Layout Engine's effective-dimension
 * derivation.
 *
 * Starts at a wide desktop so the server render and the first client paint
 * agree, then resolves after mount — the same hydrate-then-apply shape the two
 * media-query hooks above use. Resize events are throttled to one per frame:
 * the engine is pure and cheap, but a resize storm should still cost one React
 * commit per painted frame rather than one per event.
 *
 * Deliberately *not* a `ResizeObserver` on the shell: the engine reasons about
 * the viewport the trader has, not about a box whose size it is itself deciding
 * — observing the latter would close a feedback loop between a pane's width and
 * the budget that constrains it.
 */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>({ width: 1440, height: 900 });

  useEffect(() => {
    let frame: number | null = null;
    const apply = () => {
      frame = null;
      setSize((previous) =>
        previous.width === window.innerWidth && previous.height === window.innerHeight
          ? previous
          : { width: window.innerWidth, height: window.innerHeight },
      );
    };
    apply();
    const onResize = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(apply);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return size;
}
