'use client';

import { useEffect, useRef, useState } from 'react';

export type ValueDirection = 'up' | 'down';

/**
 * VX1 §22/§27/§40 — the one place WariX decides what a changing number looks
 * like while it changes.
 *
 * A live figure that only ever snaps tells a trader its value and nothing about
 * its motion; they learn the direction by watching two frames and remembering.
 * This returns `'up'` or `'down'` for one short beat after a formatted value
 * changes, and `null` the rest of the time — enough for a caller to wash the
 * cell mint or coral and let it settle.
 *
 * **What it is not.** It never touches the value. Money, prices and risk figures
 * are rendered exactly as their authoritative source formatted them; the only
 * thing interpolated anywhere here is a background colour. That separation is
 * the rule VX1 §41 asks to be preserved for the day presentation smoothing
 * arrives: canonical price ≠ visual presentation.
 *
 * Both callers pass an already-formatted string rather than a number, so a
 * change that rounds away (a fifth decimal on a 2-decimal figure) never
 * flashes — the trader sees a flash exactly when they see a different number.
 */
/**
 * VX1-A.1 §2 — the flash a figure is allowed to wear, given its own sign.
 *
 * A losing position that loses a little less is an improvement, and §6 wants
 * improvements to read mint. But §2 is absolute: a negative figure must never
 * sit on a positive surface, in any frame, including an animated one — a trader
 * glancing at a green cell holding `−$63.00` has been told two contradictory
 * things, and the colour is the one they will believe.
 *
 * So the semantic hue is only used when it *agrees* with the value's own sign.
 * When the direction and the sign disagree, the flash is a neutral highlight:
 * the cell still visibly reacts, and it makes no claim about profit or loss the
 * number itself contradicts.
 */
export type FlashTone = 'positive' | 'negative' | 'neutral';

export function flashToneFor(direction: ValueDirection | null, value: number | null): FlashTone {
  if (direction === null) return 'neutral';
  if (value === null || value === 0) return direction === 'up' ? 'positive' : 'negative';
  if (direction === 'up') return value > 0 ? 'positive' : 'neutral';
  return value < 0 ? 'negative' : 'neutral';
}

/** Reads the number back out of an already-formatted figure. */
export function parseFormattedNumber(formatted: string | null): number | null {
  return formatted === null ? null : parseSignedNumber(formatted);
}

export function useValueFlash(formatted: string, durationMs = 160): ValueDirection | null {
  const previous = useRef(formatted);
  const [direction, setDirection] = useState<ValueDirection | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = formatted;
    if (before === formatted) return;
    const parsedBefore = parseSignedNumber(before);
    const parsedAfter = parseSignedNumber(formatted);
    if (parsedBefore === null || parsedAfter === null || parsedBefore === parsedAfter) return;
    setDirection(parsedAfter > parsedBefore ? 'up' : 'down');
    const timer = setTimeout(() => setDirection(null), durationMs);
    return () => clearTimeout(timer);
  }, [formatted, durationMs]);

  return direction;
}

/**
 * Reads the number back out of a formatted figure — `+$78.00`, `−$63.00`,
 * `10 000.00`, `1.08265`.
 *
 * Handles the two minus signs WariX prints (ASCII `-` and the typographic `−`
 * the money formatter uses) and the narrow spaces French grouping inserts.
 * Returns null rather than NaN when there is no number in there at all, so a
 * placeholder dash never registers as a change of value.
 */
function parseSignedNumber(formatted: string): number | null {
  const normalized = formatted.replace(/−/g, '-').replace(/[\s  ]/g, '');
  const match = normalized.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
