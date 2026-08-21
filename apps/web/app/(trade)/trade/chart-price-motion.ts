'use client';

import { useRef } from 'react';

/**
 * WariX's display-only price motion — VX1-D §4-§7.
 *
 * **The one rule this file exists to keep.** There are two values in a trading
 * terminal and they are not the same thing:
 *
 *     AUTHORITATIVE PRICE  — what the feed said. Drives execution, PnL, risk,
 *                            orders, SL, TP, alerts, accounting, and every
 *                            printed digit. Never interpolated, ever.
 *     DISPLAY POSITION     — where a marker is *drawn* on the way there.
 *
 * Nothing here produces a price. It produces a **duration**, which a CSS
 * transition then uses to move a marker from where it currently sits to the
 * coordinate the authoritative price already resolved to. The number on the
 * plate is the new authoritative string in the same frame; only the pixels
 * take the scenic route. An interpolated midpoint is never readable, never
 * stored, and never reachable by execution — there is no midpoint value in this
 * module to leak.
 *
 * **Why a CSS transition rather than a rAF loop.** §5 asks for retargeting
 * without queueing, no accumulated delay, and no lag behind the feed; §52 adds
 * no leaked frames, no duplicate subscription, and a stop when hidden. A CSS
 * transition gives all of that from the platform: retargeting a transition
 * interrupts it *from its current computed value*, the compositor drops frames
 * rather than accruing them, an off-screen element costs nothing, and
 * `prefers-reduced-motion` already collapses every transition in the product to
 * 1ms (globals.css). A hand-rolled loop would have to re-earn each of those and
 * would run React state at tick frequency to do it, which §51 forbids outright.
 */

/**
 * How long a marker may take to reach a coordinate the price has already
 * reached, given how fast ticks are actually arriving (§5).
 *
 * The ladder exists because a fixed duration is wrong at both ends: 150ms looks
 * mechanical on a slow feed and, on a burst, means the marker is still
 * travelling toward a price two ticks stale — which is the one failure mode §5
 * names, a renderer that accumulates delay. So the motion always finishes well
 * inside the gap it was given, and past a certain rate it stops pretending
 * there is time to animate at all.
 */
export function interpolationDurationFor(intervalMs: number): number {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return 0;
  // Faster than ~10/s: the eye reads this as continuous motion already, and any
  // transition is a lie about where the price is. Snap.
  if (intervalMs < 90) return 0;
  if (intervalMs < 220) return 55;
  if (intervalMs < 500) return 95;
  if (intervalMs < 1_400) return 130;
  return 150;
}

export type PriceMoveDirection = 'up' | 'down' | null;

export interface PriceMotion {
  /** Milliseconds the display marker may spend travelling. 0 means snap. */
  durationMs: number;
  /** Which way the authoritative price last moved, for §6's brief emphasis. */
  direction: PriceMoveDirection;
  /**
   * Increments on every authoritative change, so a consumer can key a one-shot
   * animation (§7's micro-pulse) without diffing floats itself.
   */
  beat: number;
}

const RESTING: PriceMotion = { durationMs: 0, direction: null, beat: 0 };

/**
 * Observe an authoritative price and report how its marker should move.
 *
 * Deliberately ref-only: this is called from a component that already
 * re-renders on the tick it is reporting, so the cadence is measured for free
 * and no state is written. A `useState` here would add a second render per
 * tick to the busiest component in the workstation — §51's "market ticks must
 * NOT cause whole-workstation rerenders" starts with not causing extra ones
 * where the render is already happening.
 *
 * @param priceFormatted the authoritative price string, exactly as printed.
 */
export function usePriceMotion(priceFormatted: string | null): PriceMotion {
  const previous = useRef<{ price: number; at: number } | null>(null);
  const beat = useRef(0);
  const last = useRef<PriceMotion>(RESTING);

  if (priceFormatted === null) return RESTING;
  const price = Number(priceFormatted);
  if (!Number.isFinite(price)) return RESTING;

  const now = typeof performance === 'undefined' ? Date.now() : performance.now();
  const before = previous.current;

  // First sight of an instrument is not a move: a marker that glides in from
  // wherever the previous symbol's price happened to sit would be inventing a
  // price history that never existed.
  if (before === null) {
    previous.current = { price, at: now };
    return RESTING;
  }
  // A repeated tick at an unchanged price is not a beat. §7 is explicit: do not
  // pulse when nothing changed.
  if (price === before.price) return last.current;

  beat.current += 1;
  const motion: PriceMotion = {
    durationMs: interpolationDurationFor(now - before.at),
    direction: price > before.price ? 'up' : 'down',
    beat: beat.current,
  };
  previous.current = { price, at: now };
  last.current = motion;
  return motion;
}
