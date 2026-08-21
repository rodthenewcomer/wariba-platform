import { describe, expect, it } from 'vitest';
import {
  PLATE_PRIORITY,
  resolvePriceScalePlates,
} from '../app/(trade)/trade/chart-price-plate-layout';

/**
 * VX1-A.1 §1 — the two rules the price scale may never break.
 *
 * These are stated as tests because both failures are silent: a plate that
 * covers another looks like a rendering glitch, and a plate that quietly moved
 * without saying so looks like a price. The second is the dangerous one — it
 * puts a trade level somewhere it is not.
 */

const HEIGHT = 400;

describe('price-scale plate layout', () => {
  it('leaves plates alone when nothing collides', () => {
    const placements = resolvePriceScalePlates(
      [
        { id: 'tp', y: 40, height: 16, priority: PLATE_PRIORITY.trade },
        { id: 'current', y: 200, height: 16, priority: PLATE_PRIORITY.current },
        { id: 'sl', y: 340, height: 16, priority: PLATE_PRIORITY.trade },
      ],
      { height: HEIGHT },
    );
    expect(placements.every((placement) => placement.displaced)).toBe(false);
    expect(placements.map((placement) => placement.y).sort((a, b) => a - b)).toEqual([
      40, 200, 340,
    ]);
  });

  /** The case the close-up caught: an entry a few ticks from the market. */
  it('moves the current price out of a trade level, never the other way round', () => {
    const placements = resolvePriceScalePlates(
      [
        { id: 'entry', y: 200, height: 16, priority: PLATE_PRIORITY.trade },
        { id: 'current', y: 205, height: 16, priority: PLATE_PRIORITY.current },
      ],
      { height: HEIGHT },
    );
    const entry = placements.find((placement) => placement.id === 'entry');
    const current = placements.find((placement) => placement.id === 'current');
    expect(entry?.y).toBe(200);
    expect(entry?.displaced).toBe(false);
    expect(current?.displaced).toBe(true);
    // Far enough not to overlap…
    expect(Math.abs((current?.y ?? 0) - 200)).toBeGreaterThanOrEqual(16);
    // …and no further than it had to go.
    expect(Math.abs((current?.y ?? 0) - 200)).toBeLessThanOrEqual(24);
  });

  it('keeps every displaced plate pointing at its own true level', () => {
    const placements = resolvePriceScalePlates(
      [
        { id: 'entry', y: 200, height: 16, priority: PLATE_PRIORITY.trade },
        { id: 'current', y: 203, height: 16, priority: PLATE_PRIORITY.current },
        { id: 'analysis', y: 206, height: 16, priority: PLATE_PRIORITY.analysis },
      ],
      { height: HEIGHT },
    );
    expect(placements.find((placement) => placement.id === 'current')?.trueY).toBe(203);
    expect(placements.find((placement) => placement.id === 'analysis')?.trueY).toBe(206);
  });

  it('yields in priority order when three levels want the same pixel', () => {
    const placements = resolvePriceScalePlates(
      [
        { id: 'analysis', y: 200, height: 16, priority: PLATE_PRIORITY.analysis },
        { id: 'current', y: 200, height: 16, priority: PLATE_PRIORITY.current },
        { id: 'tp', y: 200, height: 16, priority: PLATE_PRIORITY.trade },
      ],
      { height: HEIGHT },
    );
    expect(placements.find((placement) => placement.id === 'tp')?.y).toBe(200);
    expect(placements.find((placement) => placement.id === 'current')?.displaced).toBe(true);
    expect(placements.find((placement) => placement.id === 'analysis')?.displaced).toBe(true);
    const ys = placements.map((placement) => placement.y);
    expect(new Set(ys).size).toBe(3);
  });

  it('keeps plates inside the scale', () => {
    const placements = resolvePriceScalePlates(
      [
        { id: 'top', y: -30, height: 16, priority: PLATE_PRIORITY.trade },
        { id: 'bottom', y: HEIGHT + 30, height: 16, priority: PLATE_PRIORITY.trade },
      ],
      { height: HEIGHT },
    );
    for (const placement of placements) {
      expect(placement.y).toBeGreaterThanOrEqual(8);
      expect(placement.y).toBeLessThanOrEqual(HEIGHT - 8);
    }
  });

  it('never stacks two plates on the same pixels', () => {
    const placements = resolvePriceScalePlates(
      [
        { id: 'tp', y: 150, height: 16, priority: PLATE_PRIORITY.trade },
        { id: 'entry', y: 158, height: 16, priority: PLATE_PRIORITY.trade },
        { id: 'sl', y: 166, height: 16, priority: PLATE_PRIORITY.trade },
        { id: 'current', y: 160, height: 16, priority: PLATE_PRIORITY.current },
      ],
      { height: HEIGHT },
    );
    const boxes = placements
      .map((placement) => ({ top: placement.y - 8, bottom: placement.y + 8 }))
      .sort((a, b) => a.top - b.top);
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index]!.top).toBeGreaterThanOrEqual(boxes[index - 1]!.bottom);
    }
  });
});
