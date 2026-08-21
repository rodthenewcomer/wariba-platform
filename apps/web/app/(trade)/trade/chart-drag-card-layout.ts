/**
 * Where the drag validation card is allowed to sit — VX1-D.1.2 §1.
 *
 * The card explains why a level cannot go where the pointer is taking it, so it
 * is read *during* the gesture — which is exactly when the chart is at its most
 * crowded: a pinned take profit at the top boundary, a pinned stop at the
 * bottom, the entry chip somewhere between them, the current-price plate on the
 * scale, and the legend above everything. WX1's fixed `top-4, right-14` landed
 * on whichever of those happened to be there.
 *
 * **The card moves; nothing else does.** The preview line stays at the price
 * the pointer is on, every chip stays where the resolver put it, and the true
 * levels stay at `priceToCoordinate`. This chooses a Y for one explanatory
 * panel, and it is the only thing in the drag that yields.
 */

export interface OccupiedBand {
  /** Top edge, in plot coordinates. */
  top: number;
  /** Bottom edge, in plot coordinates. */
  bottom: number;
}

export interface DragCardLayoutInput {
  /** Plot height in pixels. */
  plotHeight: number;
  /** Legend depth to clear at the top — OHLC plus indicator rows. */
  legendHeight: number;
  /** Pixels reserved at the bottom for the time axis and the feedback lane. */
  bottomReserved: number;
  /** The card's own height. */
  cardHeight: number;
  /** Which way the pointer is taking the level: up on screen, or down. */
  dragDirection: 'up' | 'down';
  /** Everything the card must not cover, in plot coordinates. */
  occupied: readonly OccupiedBand[];
}

/** A little air between the card and whatever it is avoiding. */
const CLEARANCE = 8;

function overlap(a: OccupiedBand, b: OccupiedBand): number {
  return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function totalOverlap(candidate: OccupiedBand, occupied: readonly OccupiedBand[]): number {
  let sum = 0;
  for (const band of occupied) {
    sum += overlap(candidate, {
      top: band.top - CLEARANCE,
      bottom: band.bottom + CLEARANCE,
    });
  }
  return sum;
}

/**
 * Resolve the card's top edge.
 *
 * The preference order is §1's, and the reason for the first rule is that a
 * trader dragging upward is looking upward: putting the explanation in the
 * lower half keeps it out of both the pointer's path and the region the level
 * is heading into.
 *
 *   1. the half opposite the drag
 *   2. the other half
 *   3. a scan of every position between the boundaries, least-covered wins
 *
 * Step 3 never fails: with nowhere clean it returns the position that covers
 * the least, which on a very short plot is the honest answer — something has to
 * be behind the card, and it should be as little as possible.
 */
export function resolveDragCardTop(input: DragCardLayoutInput): number {
  const { plotHeight, legendHeight, bottomReserved, cardHeight, dragDirection, occupied } = input;
  const minTop = legendHeight + CLEARANCE;
  const maxTop = Math.max(minTop, plotHeight - bottomReserved - cardHeight - CLEARANCE);

  const highCandidate = minTop;
  const lowCandidate = maxTop;
  // Dragging up puts the level and the eye in the upper half, so the card
  // prefers the lower one — and vice versa.
  const preferred = dragDirection === 'up' ? lowCandidate : highCandidate;
  const alternate = dragDirection === 'up' ? highCandidate : lowCandidate;

  for (const candidate of [preferred, alternate]) {
    if (totalOverlap({ top: candidate, bottom: candidate + cardHeight }, occupied) === 0) {
      return candidate;
    }
  }

  let best = preferred;
  let bestOverlap = Number.POSITIVE_INFINITY;
  const span = Math.max(0, maxTop - minTop);
  const steps = 24;
  for (let step = 0; step <= steps; step += 1) {
    // Scanned from the preferred end, so an exact tie resolves toward §1's
    // first rule rather than toward whichever end the loop happens to start at.
    const ratio = step / steps;
    const candidate = dragDirection === 'up' ? maxTop - span * ratio : minTop + span * ratio;
    const covered = totalOverlap({ top: candidate, bottom: candidate + cardHeight }, occupied);
    if (covered < bestOverlap) {
      bestOverlap = covered;
      best = candidate;
      if (covered === 0) break;
    }
  }
  return best;
}
