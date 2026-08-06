/**
 * Prompt 7 Appendix 07-C §3 — "collision-aware label placement and compact
 * stacking" for the chart's HTML overlay (position badges, SL/TP chips).
 * Pure, DOM-free geometry so it's unit-testable without a real chart:
 * lightweight-charts' native price-line labels render on the price axis
 * with no per-pixel offset API, so every interactive label here is our own
 * absolutely-positioned overlay element, placed at `series.priceToCoordinate`
 * and then nudged apart by this function when two labels would overlap.
 */
export interface OverlayLabelInput {
  id: string;
  /** Ideal (unadjusted) vertical center, in pixels from the chart's top. */
  y: number;
  /** Rendered height of this label, in pixels. */
  height: number;
  /** Lower id sorts first when two labels start at the exact same y — keeps ordering deterministic in tests. */
}

export interface OverlayLabelPlacement {
  id: string;
  /** Adjusted vertical center — equal to the input `y` unless collision-nudged. */
  y: number;
}

/**
 * Sorts by ideal y, then walks top to bottom pushing any label whose top
 * edge would overlap the previous (already-placed) label's bottom edge
 * (plus `gap`) further down. Single downward pass — simple, deterministic,
 * and sufficient for the handful of labels one symbol's chart ever shows
 * (one badge per open position, plus that position's SL/TP chips/lines).
 */
export function resolveLabelCollisions(
  labels: readonly OverlayLabelInput[],
  gap = 4,
): OverlayLabelPlacement[] {
  const sorted = [...labels].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
  const placements: OverlayLabelPlacement[] = [];
  let previousBottom: number | null = null;
  for (const label of sorted) {
    const minTop = previousBottom === null ? -Infinity : previousBottom + gap;
    const top = Math.max(label.y - label.height / 2, minTop);
    const center = top + label.height / 2;
    placements.push({ id: label.id, y: center });
    previousBottom = top + label.height;
  }
  return placements;
}
