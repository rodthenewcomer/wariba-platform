'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * How long a directional tint may sit on a quote before it must be gone.
 * Matches the `wariba-quote-*` keyframes in `globals.css`.
 */
const WASH_MS = 160;
/**
 * The floor between two washes on the same quote.
 *
 * Final closure §9 requires a cooldown "to avoid strobe". A liquid instrument
 * can tick several times a second; without this the cell would be permanently
 * mid-animation, which is decorative constant movement — the exact thing §9
 * forbids. At 260ms a fast market shows a settled rhythm rather than a flicker,
 * and a slow one shows every move.
 */
const COOLDOWN_MS = 260;

/**
 * A brief directional tint on a quote that has just moved.
 *
 * **This causes no React render.** The obvious implementation — state plus a
 * timer to clear it — would re-render the quote's owner twice per tick and put
 * a `setTimeout` on every instrument, which is precisely the "tick-animation
 * subscription" §30 rules out. Instead the effect writes a data attribute onto
 * a node the component already owns and lets a CSS animation expire on its own;
 * React is not involved after the first paint, and the render-ownership counts
 * are unchanged.
 *
 * The hook is deliberately attached where the tick is *already* consumed — the
 * execution quote deck, whose parent subscribes for the figures themselves — so
 * it adds no new subscription to `TickStore`.
 *
 * The authoritative number is never animated: it updates the instant the tick
 * arrives, through the ordinary render path. Only the background behind it is
 * touched, so a digit never moves, glows or bounces.
 *
 * `prefers-reduced-motion` is honoured globally — `globals.css` collapses every
 * animation to 1ms — so a reduced-motion trader sees the value change and no
 * wash at all.
 */
export function useQuoteDirection<T extends HTMLElement>(
  value: string | null | undefined,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  /** `undefined` until the first quote, so the opening paint never washes. */
  const previous = useRef<string | null | undefined>(undefined);
  const lastWashAt = useRef(0);

  useEffect(() => {
    const node = ref.current;
    const before = previous.current;
    previous.current = value;

    if (!node || before === undefined || before === null || value === null || value === undefined) {
      return;
    }
    if (before === value) return;

    const from = Number(before);
    const to = Number(value);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;

    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    if (now - lastWashAt.current < COOLDOWN_MS) return;
    lastWashAt.current = now;

    node.dataset.quoteDirection = to > from ? 'up' : 'down';
    // Restart the animation even when the direction repeats: re-assigning an
    // identical attribute value would not retrigger it.
    node.style.animation = 'none';
    void node.offsetWidth;
    node.style.animation = '';
  }, [value]);

  return ref;
}

export const QUOTE_WASH_DURATION_MS = WASH_MS;
export const QUOTE_WASH_COOLDOWN_MS = COOLDOWN_MS;
