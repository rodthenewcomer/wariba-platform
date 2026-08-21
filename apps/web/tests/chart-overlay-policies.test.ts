import { describe, expect, it } from 'vitest';
import {
  COMPACT_MARKER_CLUSTER_LIMIT,
  resolveExecutionMarkers,
  type ExecutionFill,
} from '../app/(trade)/trade/chart-execution-markers';
import { resolveDragCardTop, type OccupiedBand } from '../app/(trade)/trade/chart-drag-card-layout';

/**
 * VX1-D.1.2 — the two presentation rules this pass added, pinned.
 *
 * Both exist to stop something covering something else, and both are the kind
 * of rule that is easy to regress silently: a card lands on a chip only in the
 * configurations nobody screenshots, and a marker pile only appears after
 * enough round trips that no manual test does.
 */

function fill(time: number, over: Partial<ExecutionFill> = {}): ExecutionFill {
  return { time, side: 'buy', effect: 'open', ...over };
}

describe('execution marker policy', () => {
  it('draws one arrow per bar, never a column', () => {
    // Four executions inside one five-second bucket is one event at this zoom.
    const clusters = resolveExecutionMarkers(
      [fill(100), fill(100, { effect: 'close' }), fill(100), fill(100, { effect: 'close' })],
      { compact: false },
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.count).toBe(4);
  });

  it('leaves a lone fill as a plain arrow with nothing to read', () => {
    // The count is only worth drawing when it says something the arrow cannot.
    const clusters = resolveExecutionMarkers([fill(100)], { compact: false });
    expect(clusters[0]!.count).toBe(1);
  });

  it('takes the latest fill in a bar as the marker’s identity', () => {
    // The arrow points the way the last thing that happened went, because that
    // is the one whose consequence is still on the chart.
    const clusters = resolveExecutionMarkers(
      [fill(100, { side: 'buy', effect: 'open' }), fill(100, { side: 'sell', effect: 'close' })],
      { compact: false },
    );
    expect(clusters[0]!.side).toBe('sell');
    expect(clusters[0]!.effect).toBe('close');
  });

  it('bounds what a phone draws, keeping the most recent clusters', () => {
    const clusters = resolveExecutionMarkers([fill(10), fill(20), fill(30), fill(40), fill(50)], {
      compact: true,
    });
    expect(clusters).toHaveLength(COMPACT_MARKER_CLUSTER_LIMIT);
    expect(clusters.map((cluster) => cluster.time)).toEqual([30, 40, 50]);
  });

  it('does not bound the desktop, and always returns clusters in time order', () => {
    const clusters = resolveExecutionMarkers([fill(50), fill(10), fill(30)], { compact: false });
    expect(clusters.map((cluster) => cluster.time)).toEqual([10, 30, 50]);
  });
});

describe('drag validation card placement', () => {
  const base = {
    plotHeight: 600,
    legendHeight: 60,
    bottomReserved: 86,
    cardHeight: 104,
    occupied: [] as OccupiedBand[],
  };

  it('takes the half the trader is not looking at', () => {
    // Dragging up puts the level and the eye high, so the card goes low.
    expect(resolveDragCardTop({ ...base, dragDirection: 'up' })).toBeGreaterThan(300);
    expect(resolveDragCardTop({ ...base, dragDirection: 'down' })).toBeLessThan(300);
  });

  it('gives up its preferred half rather than cover a chip', () => {
    // A stop pinned to the bottom boundary is exactly where an upward drag
    // would otherwise put the card.
    const top = resolveDragCardTop({
      ...base,
      dragDirection: 'up',
      occupied: [{ top: 470, bottom: 500 }],
    });
    expect(top + base.cardHeight).toBeLessThanOrEqual(470);
  });

  it('moves away from the active preview line and its axis label', () => {
    const previewBand = { top: 462, bottom: 490 };
    const top = resolveDragCardTop({
      ...base,
      dragDirection: 'up',
      occupied: [previewBand],
    });
    const card = { top, bottom: top + base.cardHeight };
    expect(card.bottom <= previewBand.top || card.top >= previewBand.bottom).toBe(true);
  });

  it('clears every trade object when both halves are contested', () => {
    // Take profit pinned top, entry mid, stop pinned bottom: the card has to
    // find a gap between them rather than pick a side.
    const occupied: OccupiedBand[] = [
      { top: 66, bottom: 94 },
      { top: 290, bottom: 318 },
      { top: 480, bottom: 508 },
    ];
    for (const dragDirection of ['up', 'down'] as const) {
      const top = resolveDragCardTop({ ...base, dragDirection, occupied });
      const card = { top, bottom: top + base.cardHeight };
      for (const band of occupied) {
        expect(
          card.bottom <= band.top || card.top >= band.bottom,
          `card ${card.top}-${card.bottom} overlaps ${band.top}-${band.bottom}`,
        ).toBe(true);
      }
    }
  });

  it('never places the card under the legend or inside the reserved lane', () => {
    for (const dragDirection of ['up', 'down'] as const) {
      const top = resolveDragCardTop({
        ...base,
        dragDirection,
        occupied: [{ top: 0, bottom: 600 }],
      });
      expect(top).toBeGreaterThanOrEqual(base.legendHeight);
      expect(top + base.cardHeight).toBeLessThanOrEqual(base.plotHeight - base.bottomReserved);
    }
  });

  it('still returns a position when nothing is clean', () => {
    // A short plot with the whole thing occupied: something must be behind the
    // card, and the rule returns the least-covered spot rather than nothing.
    const top = resolveDragCardTop({
      ...base,
      plotHeight: 220,
      dragDirection: 'up',
      occupied: [{ top: 0, bottom: 220 }],
    });
    expect(Number.isFinite(top)).toBe(true);
    expect(top).toBeGreaterThanOrEqual(base.legendHeight);
  });
});
