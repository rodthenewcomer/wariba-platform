'use client';

import {
  fibonacciLevelPrices,
  type ChartDrawing,
  type ChartDrawingAnchor,
} from './chart-drawing-model';

/**
 * The drawing coordinate boundary — W5 §45/§46.
 *
 * `ChartCoordinateAdapter` is the *only* thing that knows a chart engine exists.
 * Everything above it — the drawing model, this projection code, the hit testing
 * below, the SVG overlay that consumes it — works in plain numbers and would
 * survive replacing lightweight-charts wholesale, which is precisely what W0's
 * ARCH-028 `ChartEngineAdapter` seam is for.
 *
 * Note what the interface does *not* offer: no series handle, no chart instance,
 * no `Time` branded type, no way to draw. It converts, and that is all.
 */
export interface ChartCoordinateAdapter {
  /** Epoch seconds → x pixels, or null when the time is outside the loaded range. */
  timeToX(time: number): number | null;
  /** Decimal price string → y pixels, or null when the price is off-scale. */
  priceToY(price: string): number | null;
  /** x pixels → the nearest **loaded candle** time (§47), or null before hydration. */
  xToTime(x: number): number | null;
  /** y pixels → a decimal price string at the instrument's precision. */
  yToPrice(y: number): string | null;
  width(): number;
  height(): number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

/**
 * A drawing in screen space, or `null` when it cannot be drawn right now.
 *
 * `null` is a normal, expected outcome (§48): a trend line anchored to a candle
 * older than the loaded window simply has no x for its first anchor until
 * backfill reaches back that far. The stored record is untouched — re-anchoring
 * it to the oldest visible bar would silently rewrite the trader's analysis.
 */
export interface ProjectedDrawing {
  id: string;
  drawing: ChartDrawing;
  /** The stored anchors in screen space — one per anchor, in stored order. */
  points: ProjectedPoint[];
  /**
   * Ray only: where the line leaves the plot, computed from the two anchors.
   * Never a stored anchor, and never offered as a drag handle (§107).
   */
  rayEnd?: ProjectedPoint;
  /** Fibonacci only: one y per level, with its label. */
  levels?: { level: number; y: number; label: number }[];
}

function projectAnchor(
  adapter: ChartCoordinateAdapter,
  anchor: ChartDrawingAnchor,
): ProjectedPoint | null {
  const x = adapter.timeToX(anchor.time);
  const y = adapter.priceToY(anchor.price);
  if (x === null || y === null) return null;
  return { x, y };
}

/**
 * W5 §43 — a horizontal line spans the plot regardless of where it was clicked.
 *
 * Its one anchor carries a time so the record has a stable ordering and a
 * creation context, but the time is not part of what it asserts: a level holds
 * across the whole visible window, so it is drawn edge to edge and stays
 * projectable even when its own anchor time has scrolled out of the loaded range.
 */
export function projectDrawing(
  adapter: ChartCoordinateAdapter,
  drawing: ChartDrawing,
): ProjectedDrawing | null {
  if (drawing.type === 'horizontal_line') {
    const anchor = drawing.anchors[0];
    if (!anchor) return null;
    const y = adapter.priceToY(anchor.price);
    if (y === null) return null;
    return {
      id: drawing.id,
      drawing,
      points: [
        { x: 0, y },
        { x: adapter.width(), y },
      ],
    };
  }

  const [first, second] = drawing.anchors;
  if (!first || !second) return null;
  const a = projectAnchor(adapter, first);
  const b = projectAnchor(adapter, second);
  if (a === null || b === null) return null;

  if (drawing.type === 'ray') {
    return { id: drawing.id, drawing, points: [a, b], rayEnd: extendRay(a, b, adapter.width()) };
  }

  if (drawing.type === 'fibonacci') {
    const levels = fibonacciLevelPrices(drawing.anchors)
      .map(({ level, price }) => {
        const y = adapter.priceToY(formatFiniteNumber(price));
        return y === null ? null : { level, y, label: level };
      })
      .filter((entry): entry is { level: number; y: number; label: number } => entry !== null);
    return { id: drawing.id, drawing, points: [a, b], levels };
  }

  return { id: drawing.id, drawing, points: [a, b] };
}

/**
 * W5 §107 — a ray leaves the chart in the direction of its second anchor.
 *
 * The canonical record still stores exactly two anchors: the extension is a
 * rendering decision computed from the plot width, not a third, invented time
 * anchor at some far-future timestamp that no candle will ever occupy.
 *
 * A ray drawn right-to-left extends leftwards, toward x = 0, because "from the
 * first anchor through the second" is the definition and reversing it to always
 * point at the future would silently redraw what the trader placed.
 */
export function extendRay(a: ProjectedPoint, b: ProjectedPoint, width: number): ProjectedPoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0) {
    // Vertical: extend downward or upward past any plausible plot height rather
    // than dividing by zero.
    const far = dy >= 0 ? 1e5 : -1e5;
    return { x: b.x, y: a.y + far };
  }
  const targetX = dx > 0 ? width : 0;
  const scale = (targetX - a.x) / dx;
  return { x: targetX, y: a.y + dy * scale };
}

/** Chart prices are decimal strings; this is the one place a level price becomes one. */
function formatFiniteNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(8) : '0';
}

/** How close a pointer must come, in pixels, to select a drawing (§50). */
export const DRAWING_HIT_TOLERANCE_PX = 8;

function distanceToSegment(point: ProjectedPoint, a: ProjectedPoint, b: ProjectedPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * W5 §50 — hit testing, in screen space, on projected geometry.
 *
 * Deliberately not delegated to SVG `pointer-events`: a rectangle's *interior*
 * must not swallow pointer events (that would put an invisible pane over the
 * trading overlays and the crosshair, which §57 forbids), so a rectangle is hit
 * on its four edges only, and this function is what expresses that.
 */
export function hitTestDrawing(projected: ProjectedDrawing, point: ProjectedPoint): boolean {
  const [a, rawB] = projected.points;
  // A ray is hit anywhere along its drawn extent, which reaches past its second
  // anchor to the plot edge.
  const b = projected.drawing.type === 'ray' ? (projected.rayEnd ?? rawB) : rawB;
  if (!a || !b) return false;

  if (projected.drawing.type === 'rectangle') {
    const corners: ProjectedPoint[] = [
      { x: a.x, y: a.y },
      { x: b.x, y: a.y },
      { x: b.x, y: b.y },
      { x: a.x, y: b.y },
    ];
    return corners.some((corner, index) => {
      const next = corners[(index + 1) % corners.length];
      return (
        next !== undefined && distanceToSegment(point, corner, next) <= DRAWING_HIT_TOLERANCE_PX
      );
    });
  }

  if (projected.drawing.type === 'fibonacci') {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    if (point.x < left - DRAWING_HIT_TOLERANCE_PX || point.x > right + DRAWING_HIT_TOLERANCE_PX) {
      return false;
    }
    return (projected.levels ?? []).some(
      (level) => Math.abs(point.y - level.y) <= DRAWING_HIT_TOLERANCE_PX,
    );
  }

  return distanceToSegment(point, a, b) <= DRAWING_HIT_TOLERANCE_PX;
}

/**
 * The topmost drawing under a pointer, or null.
 *
 * Iterates back to front so the most recently created drawing wins an overlap,
 * matching what the trader sees.
 */
export function findDrawingAt(
  projected: readonly ProjectedDrawing[],
  point: ProjectedPoint,
): ProjectedDrawing | null {
  for (let index = projected.length - 1; index >= 0; index -= 1) {
    const candidate = projected[index];
    if (candidate && hitTestDrawing(candidate, point)) return candidate;
  }
  return null;
}

/**
 * Which anchor a drag grabbed, or `'body'` for a whole-drawing move.
 *
 * Only horizontal lines move as a body in W5 (§51: "drag horizontal line
 * vertically"); every other tool moves by its endpoints, which is both simpler
 * to reason about and much harder to do by accident.
 */
export type DrawingGrab = { kind: 'anchor'; index: number } | { kind: 'body' };

export const DRAWING_HANDLE_RADIUS_PX = 6;

export function grabAt(projected: ProjectedDrawing, point: ProjectedPoint): DrawingGrab | null {
  if (projected.drawing.type === 'horizontal_line') {
    return hitTestDrawing(projected, point) ? { kind: 'body' } : null;
  }
  const handles = handlePoints(projected);
  for (let index = 0; index < handles.length; index += 1) {
    const handle = handles[index];
    if (
      handle &&
      Math.hypot(point.x - handle.x, point.y - handle.y) <= DRAWING_HANDLE_RADIUS_PX * 2
    ) {
      return { kind: 'anchor', index };
    }
  }
  return hitTestDrawing(projected, point) ? { kind: 'body' } : null;
}

/**
 * The draggable handles a selected drawing shows — one per **stored** anchor (§51).
 *
 * A ray therefore shows two, at its two anchors, and none at the computed far
 * end: dragging something the model has no anchor for would have nowhere to
 * write the result.
 */
export function handlePoints(projected: ProjectedDrawing): ProjectedPoint[] {
  if (projected.drawing.type === 'horizontal_line') {
    const [a, b] = projected.points;
    return a && b ? [{ x: (a.x + b.x) / 2, y: a.y }] : [];
  }
  return projected.points.slice(0, 2);
}
