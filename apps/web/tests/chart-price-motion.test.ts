import { describe, expect, it } from 'vitest';
import { interpolationDurationFor } from '../app/(trade)/trade/chart-price-motion';

/**
 * VX1-D §4/§59 — the display layer is a *duration*, and nothing else.
 *
 * The whole safety argument for interpolating a price marker rests on there
 * being no interpolated price anywhere in the module: `chart-price-motion`
 * exports a duration and a direction, so there is no midpoint value for
 * execution, PnL, risk or an order to reach even by accident. These tests pin
 * that shape as much as they pin the ladder.
 */
describe('display-only price motion', () => {
  it('never produces a price, only a duration', () => {
    // Every value the module can return for a tick cadence is a finite
    // millisecond count. A price would be a five-decimal float; a duration is
    // an integer under 200. The types differ, and so does the range.
    for (const interval of [10, 50, 89, 90, 219, 220, 499, 500, 1_399, 1_400, 10_000]) {
      const duration = interpolationDurationFor(interval);
      expect(Number.isInteger(duration)).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThanOrEqual(200);
    }
  });

  it('always finishes well inside the gap it was given', () => {
    // §5's failure mode is a renderer that accumulates delay: a marker still
    // travelling toward a price two ticks stale. So for every cadence the
    // motion must complete in comfortably less time than the next tick takes
    // to arrive.
    for (const interval of [90, 150, 300, 800, 2_000, 5_000]) {
      expect(interpolationDurationFor(interval)).toBeLessThan(interval);
    }
  });

  it('snaps rather than animating once ticks outrun the eye', () => {
    // Faster than ~11/s the movement already reads as continuous, and a
    // transition would only be a claim about where the price is not.
    expect(interpolationDurationFor(89)).toBe(0);
    expect(interpolationDurationFor(40)).toBe(0);
    expect(interpolationDurationFor(1)).toBe(0);
  });

  it('slows as the feed slows, and is monotone in the cadence', () => {
    const ladder = [90, 220, 500, 1_400, 4_000].map(interpolationDurationFor);
    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i]!).toBeGreaterThanOrEqual(ladder[i - 1]!);
    }
    // A slow feed is where the glide is worth having, and it still stays
    // inside the 80-160ms band §5 asks for.
    expect(interpolationDurationFor(4_000)).toBeGreaterThanOrEqual(80);
    expect(interpolationDurationFor(4_000)).toBeLessThanOrEqual(160);
  });

  it('treats a nonsensical cadence as no cadence at all', () => {
    // A first tick, a clock that went backwards, a resumed background tab:
    // none of these is a measurement, and none of them may produce motion.
    expect(interpolationDurationFor(0)).toBe(0);
    expect(interpolationDurationFor(-500)).toBe(0);
    expect(interpolationDurationFor(Number.NaN)).toBe(0);
    expect(interpolationDurationFor(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
