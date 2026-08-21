'use client';

import {
  DRAWING_ANCHOR_COUNT,
  FIBONACCI_EXTENSION_LEVELS,
  FIBONACCI_LEVELS,
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
  /** Fibonacci extension only: the clipped plot edge its levels reach. */
  extensionEndX?: number;
  /**
   * Extended line only: where the line leaves the plot on *both* sides. Same
   * contract as `rayEnd` — computed from the two stored anchors, never stored,
   * never draggable.
   */
  extendedEnds?: [ProjectedPoint, ProjectedPoint];
  /** Parallel channel only: the offset copy of the base line, from the third anchor. */
  parallel?: [ProjectedPoint, ProjectedPoint];
  /** Measurer tools only: what the tool reports, already formatted for display. */
  measure?: DrawingMeasurement;
  /** Trend-angle only: the signed screen-space angle shown beside the segment. */
  angleDegrees?: number;
  /** Fibonacci channel: the parallel rails interpolated between the base and offset. */
  channelLevels?: { level: number; start: ProjectedPoint; end: ProjectedPoint }[];
  /** Fibonacci circles: screen-space radii around the first anchor. */
  circleRadii?: { level: number; radius: number }[];
  /** Rotated rectangle: four computed corners; only the first three anchors persist. */
  rotatedCorners?: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
}

/**
 * What a measurer tool says.
 *
 * Every field is arithmetic on the trader's *own two anchors* — not market data,
 * not a statistic about the instrument, and not a P&L. That distinction is the
 * reason these tools are allowed: "the distance between the two points I just
 * clicked" is what the tool is for, whereas a daily percentage change would be a
 * claim about the market that WariX's feed cannot support.
 */
export interface DrawingMeasurement {
  /** Signed price difference, at the instrument's own precision. */
  price: string;
  /** Signed percentage of the first anchor's price. */
  percent: string;
  /** Elapsed time between the anchors, as a compact duration. */
  duration: string;
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

  /*
   * The one-anchor tools that *do* depend on their time.
   *
   * A horizontal line above ignores its anchor time on purpose — a level holds
   * across the whole window. These three do not: a vertical line asserts "this
   * bar", and a horizontal ray asserts "from this bar onward". So they project
   * through the adapter like any two-anchor tool and go absent, rather than
   * drifting, when their bar is outside the loaded range (§48).
   */
  if (
    drawing.type === 'vertical_line' ||
    drawing.type === 'cross_line' ||
    drawing.type === 'horizontal_ray' ||
    drawing.type === 'arrow_mark_up' ||
    drawing.type === 'arrow_mark_down' ||
    drawing.type === 'arrow_mark_left' ||
    drawing.type === 'arrow_mark_right'
  ) {
    const anchor = drawing.anchors[0];
    if (!anchor) return null;
    const point = projectAnchor(adapter, anchor);
    if (point === null) return null;
    if (drawing.type === 'horizontal_ray') {
      return {
        id: drawing.id,
        drawing,
        points: [point, { x: adapter.width(), y: point.y }],
      };
    }
    if (drawing.type.startsWith('arrow_mark_')) {
      return { id: drawing.id, drawing, points: [point] };
    }
    return {
      id: drawing.id,
      drawing,
      points: [
        { x: point.x, y: 0 },
        { x: point.x, y: adapter.height() },
      ],
      // A cross line reuses `parallel` for its horizontal arm: both arms are
      // derived from one anchor, so neither is a stored point and neither may
      // become a drag handle.
      ...(drawing.type === 'cross_line'
        ? {
            parallel: [
              { x: 0, y: point.y },
              { x: adapter.width(), y: point.y },
            ] as [ProjectedPoint, ProjectedPoint],
          }
        : {}),
    };
  }

  const [first, second, third, fourth] = drawing.anchors;
  if (!first || !second) return null;
  const a = projectAnchor(adapter, first);
  const b = projectAnchor(adapter, second);
  if (a === null || b === null) return null;

  if (drawing.type === 'ray') {
    return { id: drawing.id, drawing, points: [a, b], rayEnd: extendRay(a, b, adapter.width()) };
  }

  if (drawing.type === 'extended_line') {
    return {
      id: drawing.id,
      drawing,
      points: [a, b],
      extendedEnds: [extendRay(b, a, adapter.width()), extendRay(a, b, adapter.width())],
    };
  }

  if (drawing.type === 'info_line') {
    return {
      id: drawing.id,
      drawing,
      points: [a, b],
      measure: measureBetween(first, second),
    };
  }

  if (drawing.type === 'trend_angle') {
    const angle = (Math.atan2(a.y - b.y, b.x - a.x) * 180) / Math.PI;
    return { id: drawing.id, drawing, points: [a, b], angleDegrees: angle };
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

  if (drawing.type === 'fib_extension') {
    if (!third) return null;
    const c = projectAnchor(adapter, third);
    if (c === null) return null;
    const firstPrice = Number(first.price);
    const secondPrice = Number(second.price);
    const originPrice = Number(third.price);
    const levels: { level: number; y: number; label: number }[] = [];
    for (const level of FIBONACCI_EXTENSION_LEVELS) {
      const price = originPrice + (secondPrice - firstPrice) * level;
      const y = adapter.priceToY(formatFiniteNumber(price));
      if (y !== null) levels.push({ level, y, label: level });
    }
    return {
      id: drawing.id,
      drawing,
      points: [a, b, c],
      levels,
      extensionEndX: adapter.width(),
    };
  }

  if (drawing.type === 'fib_circles') {
    const radius = Math.hypot(b.x - a.x, b.y - a.y);
    return {
      id: drawing.id,
      drawing,
      points: [a, b],
      circleRadii: FIBONACCI_LEVELS.filter((level) => level > 0).map((level) => ({
        level,
        radius: radius * level,
      })),
    };
  }

  if (drawing.type === 'triangle') {
    if (!third) return null;
    const c = projectAnchor(adapter, third);
    if (c === null) return null;
    return { id: drawing.id, drawing, points: [a, b, c] };
  }

  /*
   * A parallel channel's third anchor sets the offset, not a free corner: the
   * copy stays parallel to the base by construction, because the offset applied
   * to both ends is the same vector. Storing two independent lines would have
   * let a drag make them non-parallel, which is the one thing the tool promises.
   */
  if (drawing.type === 'parallel_channel') {
    if (!third) return null;
    const c = projectAnchor(adapter, third);
    if (c === null) return null;
    const offsetY = c.y - a.y;
    return {
      id: drawing.id,
      drawing,
      points: [a, b, c],
      parallel: [
        { x: a.x, y: a.y + offsetY },
        { x: b.x, y: b.y + offsetY },
      ],
    };
  }

  if (drawing.type === 'flat_top_bottom') {
    if (!third) return null;
    const c = projectAnchor(adapter, third);
    if (c === null) return null;
    return {
      id: drawing.id,
      drawing,
      points: [a, b, c],
      parallel: [
        { x: a.x, y: c.y },
        { x: b.x, y: c.y },
      ],
    };
  }

  if (drawing.type === 'disjoint_channel') {
    if (!third || !fourth) return null;
    const c = projectAnchor(adapter, third);
    const d = projectAnchor(adapter, fourth);
    if (c === null || d === null) return null;
    return { id: drawing.id, drawing, points: [a, b, c, d], parallel: [c, d] };
  }

  if (drawing.type === 'fib_channel') {
    if (!third) return null;
    const c = projectAnchor(adapter, third);
    if (c === null) return null;
    const offset = { x: c.x - a.x, y: c.y - a.y };
    return {
      id: drawing.id,
      drawing,
      points: [a, b, c],
      parallel: [
        { x: a.x + offset.x, y: a.y + offset.y },
        { x: b.x + offset.x, y: b.y + offset.y },
      ],
      channelLevels: FIBONACCI_LEVELS.map((level) => ({
        level,
        start: { x: a.x + offset.x * level, y: a.y + offset.y * level },
        end: { x: b.x + offset.x * level, y: b.y + offset.y * level },
      })),
    };
  }

  if (drawing.type === 'rotated_rectangle') {
    if (!third) return null;
    const c = projectAnchor(adapter, third);
    if (c === null) return null;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return { id: drawing.id, drawing, points: [a, b, c] };
    const normal = { x: -dy / length, y: dx / length };
    const height = (c.x - a.x) * normal.x + (c.y - a.y) * normal.y;
    const offset = { x: normal.x * height, y: normal.y * height };
    return {
      id: drawing.id,
      drawing,
      points: [a, b, c],
      rotatedCorners: [
        a,
        b,
        { x: b.x + offset.x, y: b.y + offset.y },
        { x: a.x + offset.x, y: a.y + offset.y },
      ],
    };
  }

  if (
    drawing.type === 'price_range' ||
    drawing.type === 'date_range' ||
    drawing.type === 'date_price_range'
  ) {
    return {
      id: drawing.id,
      drawing,
      points: [a, b],
      measure: measureBetween(first, second),
    };
  }

  if (drawing.type === 'circle') {
    return { id: drawing.id, drawing, points: [a, b] };
  }

  if (drawing.type === 'arc') {
    if (!third) return null;
    const c = projectAnchor(adapter, third);
    if (c === null) return null;
    return { id: drawing.id, drawing, points: [a, b, c] };
  }

  if (drawing.type === 'curve') {
    if (!third || !fourth) return null;
    const c = projectAnchor(adapter, third);
    const d = projectAnchor(adapter, fourth);
    if (c === null || d === null) return null;
    return { id: drawing.id, drawing, points: [a, b, c, d] };
  }

  return { id: drawing.id, drawing, points: [a, b] };
}

/** Compact durations: `45s`, `12m`, `3h 20m`, `2j 4h`. */
function formatDuration(seconds: number): string {
  const total = Math.abs(Math.round(seconds));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days}j` : `${days}j ${rest}h`;
}

/**
 * The measurement between two anchors.
 *
 * Precision is taken from the anchors themselves rather than from the adapter:
 * every stored price is already a decimal string at the instrument's precision,
 * so the difference is rendered at that same precision and a five-decimal FX
 * measurement never prints as `0.00`.
 */
export function measureBetween(
  from: ChartDrawingAnchor,
  to: ChartDrawingAnchor,
): DrawingMeasurement {
  const start = Number(from.price);
  const end = Number(to.price);
  const decimals = (from.price.split('.')[1] ?? '').length;
  const delta = end - start;
  const percent = start === 0 || !Number.isFinite(start) ? 0 : (delta / start) * 100;
  const sign = delta > 0 ? '+' : '';
  return {
    price: Number.isFinite(delta) ? `${sign}${delta.toFixed(decimals)}` : '—',
    percent: Number.isFinite(percent) ? `${sign}${percent.toFixed(2)} %` : '—',
    duration: formatDuration(to.time - from.time),
  };
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

function quadraticPoint(
  a: ProjectedPoint,
  control: ProjectedPoint,
  b: ProjectedPoint,
  t: number,
): ProjectedPoint {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * a.x + 2 * inverse * t * control.x + t * t * b.x,
    y: inverse * inverse * a.y + 2 * inverse * t * control.y + t * t * b.y,
  };
}

function cubicPoint(
  a: ProjectedPoint,
  firstControl: ProjectedPoint,
  secondControl: ProjectedPoint,
  b: ProjectedPoint,
  t: number,
): ProjectedPoint {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * a.x +
      3 * inverse * inverse * t * firstControl.x +
      3 * inverse * t * t * secondControl.x +
      t ** 3 * b.x,
    y:
      inverse ** 3 * a.y +
      3 * inverse * inverse * t * firstControl.y +
      3 * inverse * t * t * secondControl.y +
      t ** 3 * b.y,
  };
}

function hitSampledCurve(point: ProjectedPoint, sample: (t: number) => ProjectedPoint): boolean {
  let previous = sample(0);
  for (let index = 1; index <= 24; index += 1) {
    const next = sample(index / 24);
    if (distanceToSegment(point, previous, next) <= DRAWING_HIT_TOLERANCE_PX) return true;
    previous = next;
  }
  return false;
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
  const [a, rawB, rawC, rawD] = projected.points;
  const type = projected.drawing.type;
  if (
    a &&
    (type === 'arrow_mark_up' ||
      type === 'arrow_mark_down' ||
      type === 'arrow_mark_left' ||
      type === 'arrow_mark_right')
  ) {
    return Math.hypot(point.x - a.x, point.y - a.y) <= 14;
  }
  // A ray is hit anywhere along its drawn extent, which reaches past its second
  // anchor to the plot edge.
  const b = projected.drawing.type === 'ray' ? (projected.rayEnd ?? rawB) : rawB;
  if (!a || !b) return false;

  // An extended line is hit along the whole drawn line, not just between the
  // anchors — otherwise the visible parts outside them would be unselectable.
  if (type === 'extended_line' && projected.extendedEnds) {
    const [start, end] = projected.extendedEnds;
    return distanceToSegment(point, start, end) <= DRAWING_HIT_TOLERANCE_PX;
  }

  if (type === 'cross_line') {
    const horizontal = projected.parallel;
    const onVertical = Math.abs(point.x - a.x) <= DRAWING_HIT_TOLERANCE_PX;
    const onHorizontal =
      horizontal !== undefined && Math.abs(point.y - horizontal[0].y) <= DRAWING_HIT_TOLERANCE_PX;
    return onVertical || onHorizontal;
  }

  if (type === 'vertical_line') {
    return Math.abs(point.x - a.x) <= DRAWING_HIT_TOLERANCE_PX;
  }

  if (type === 'triangle' && rawC) {
    const edges: [ProjectedPoint, ProjectedPoint][] = [
      [a, b],
      [b, rawC],
      [rawC, a],
    ];
    return edges.some(
      ([from, to]) => distanceToSegment(point, from, to) <= DRAWING_HIT_TOLERANCE_PX,
    );
  }

  if (type === 'parallel_channel' && projected.parallel) {
    const [pa, pb] = projected.parallel;
    return (
      distanceToSegment(point, a, b) <= DRAWING_HIT_TOLERANCE_PX ||
      distanceToSegment(point, pa, pb) <= DRAWING_HIT_TOLERANCE_PX
    );
  }

  if (
    (type === 'flat_top_bottom' || type === 'disjoint_channel' || type === 'fib_channel') &&
    projected.parallel
  ) {
    const [pa, pb] = projected.parallel;
    if (distanceToSegment(point, a, b) <= DRAWING_HIT_TOLERANCE_PX) return true;
    if (distanceToSegment(point, pa, pb) <= DRAWING_HIT_TOLERANCE_PX) return true;
    return (projected.channelLevels ?? []).some(
      (level) => distanceToSegment(point, level.start, level.end) <= DRAWING_HIT_TOLERANCE_PX,
    );
  }

  /*
   * An ellipse is hit near its outline, which is the same rule as a rectangle's
   * edges and for the same reason: the interior must stay transparent to
   * pointer events or it becomes an invisible pane over the trading overlays.
   * Tested in normalised space, so the tolerance is scaled by the radii rather
   * than by an arbitrary constant.
   */
  if (type === 'ellipse') {
    const rx = Math.abs(b.x - a.x) / 2;
    const ry = Math.abs(b.y - a.y) / 2;
    if (rx < 1 || ry < 1) return distanceToSegment(point, a, b) <= DRAWING_HIT_TOLERANCE_PX;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const normalized = Math.hypot((point.x - cx) / rx, (point.y - cy) / ry);
    const tolerance = DRAWING_HIT_TOLERANCE_PX / Math.min(rx, ry);
    return Math.abs(normalized - 1) <= tolerance;
  }

  if (type === 'circle') {
    const radius = Math.hypot(b.x - a.x, b.y - a.y);
    return Math.abs(Math.hypot(point.x - a.x, point.y - a.y) - radius) <= DRAWING_HIT_TOLERANCE_PX;
  }

  if (type === 'fib_circles') {
    return (projected.circleRadii ?? []).some(
      ({ radius }) =>
        Math.abs(Math.hypot(point.x - a.x, point.y - a.y) - radius) <= DRAWING_HIT_TOLERANCE_PX,
    );
  }

  if (type === 'rotated_rectangle' && projected.rotatedCorners) {
    return projected.rotatedCorners.some((corner, index, corners) => {
      const next = corners[(index + 1) % corners.length];
      return (
        next !== undefined && distanceToSegment(point, corner, next) <= DRAWING_HIT_TOLERANCE_PX
      );
    });
  }

  if (type === 'arc' && rawC) {
    return hitSampledCurve(point, (t) => quadraticPoint(a, rawC, b, t));
  }

  if (type === 'curve' && rawC && rawD) {
    return hitSampledCurve(point, (t) => cubicPoint(a, b, rawC, rawD, t));
  }

  if (
    type === 'rectangle' ||
    type === 'date_price_range' ||
    type === 'date_range' ||
    type === 'price_range'
  ) {
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

  if (type === 'fibonacci' || type === 'fib_extension') {
    const left = type === 'fib_extension' ? (rawC?.x ?? Math.min(a.x, b.x)) : Math.min(a.x, b.x);
    const right =
      type === 'fib_extension'
        ? (projected.extensionEndX ?? Math.max(a.x, b.x))
        : Math.max(a.x, b.x);
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
  /*
   * The one-anchor tools move as a body, because they have exactly one point to
   * express and no endpoint to pull. Which axis a body drag writes to is the
   * caller's decision — a horizontal line takes a price, a vertical line takes a
   * time, a cross line takes both — and that is why `grabAt` reports `body`
   * rather than an axis.
   */
  const type = projected.drawing.type;
  if (
    type === 'horizontal_line' ||
    type === 'vertical_line' ||
    type === 'cross_line' ||
    type === 'horizontal_ray' ||
    type === 'arrow_mark_up' ||
    type === 'arrow_mark_down' ||
    type === 'arrow_mark_left' ||
    type === 'arrow_mark_right'
  ) {
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
  const type = projected.drawing.type;
  const [a, b] = projected.points;
  if (type === 'horizontal_line' || type === 'horizontal_ray') {
    return a && b ? [{ x: (a.x + b.x) / 2, y: a.y }] : [];
  }
  // A vertical or cross line's handle sits at its own anchor, mid-plot, so it is
  // reachable without hunting along a full-height rule.
  if (type === 'vertical_line' || type === 'cross_line') {
    return a && b ? [{ x: a.x, y: (a.y + b.y) / 2 }] : [];
  }
  if (
    type === 'arrow_mark_up' ||
    type === 'arrow_mark_down' ||
    type === 'arrow_mark_left' ||
    type === 'arrow_mark_right'
  ) {
    return a ? [a] : [];
  }
  return projected.points.slice(0, DRAWING_ANCHOR_COUNT[type]);
}
