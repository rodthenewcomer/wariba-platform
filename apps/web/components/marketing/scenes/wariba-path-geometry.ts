export interface Point {
  x: number;
  y: number;
}

/**
 * The WARIBA PATH's geometry, derived rather than drawn.
 *
 * ## Why this is computed and not three path strings
 *
 * The previous field kept its curves, its crossing markers and its pulses in
 * separate hand-typed lists. They disagreed twice: markers sat where the paths
 * did not cross, and a pulse expanded in empty canvas after the curves moved.
 * Two lists that must agree eventually will not.
 *
 * Here there is one system. A centreline and a half-width are sampled over the
 * same parameter; the upper and lower boundaries *are* `centre ∓ halfWidth`, and
 * the constriction *is* the sample where half-width is smallest. Nothing can
 * drift, because nothing is stated twice.
 */

/**
 * The centreline.
 *
 * Deliberately not monotonic. A line that only ever rises is both the most
 * common shape in fintech and an implied promise — "WARIBA is the curve that
 * goes up". This one climbs, flattens, gives a little back, then resumes. That
 * is what a path through a market looks like, and it is the only honest shape
 * for a brand that sells discipline rather than returns.
 */
const CENTRE_CONTROL: readonly Point[] = [
  { x: -140, y: 566 },
  { x: 120, y: 540 },
  { x: 330, y: 486 },
  { x: 520, y: 470 },
  { x: 660, y: 498 },
  { x: 810, y: 452 },
  { x: 950, y: 404 },
  { x: 1080, y: 412 },
  { x: 1230, y: 336 },
  { x: 1380, y: 300 },
  { x: 1560, y: 262 },
];

/**
 * The corridor's half-width.
 *
 * Wide at the edges, tightest around x≈950 — the signature moment. The signal
 * crosses a narrower system there, then the space reopens. Space → constraint →
 * passage → space, with no rule written anywhere.
 */
const WIDTH_CONTROL: readonly Point[] = [
  { x: -140, y: 128 },
  { x: 120, y: 120 },
  { x: 330, y: 112 },
  { x: 520, y: 96 },
  { x: 660, y: 74 },
  { x: 810, y: 50 },
  { x: 950, y: 34 },
  { x: 1080, y: 46 },
  { x: 1230, y: 78 },
  { x: 1380, y: 104 },
  { x: 1560, y: 118 },
];

/** The mobile system: same grammar, a third of the detail, low in the frame. */
const MOBILE_CENTRE: readonly Point[] = [
  { x: -140, y: 844 },
  { x: 220, y: 822 },
  { x: 560, y: 834 },
  { x: 900, y: 782 },
  { x: 1240, y: 774 },
  { x: 1560, y: 728 },
];

const MOBILE_WIDTH: readonly Point[] = [
  { x: -140, y: 74 },
  { x: 220, y: 66 },
  { x: 560, y: 52 },
  { x: 900, y: 26 },
  { x: 1240, y: 54 },
  { x: 1560, y: 70 },
];

/**
 * Catmull-Rom through the control points, emitted as cubic Béziers.
 *
 * A spline rather than hand-written `C`/`S` commands so the three curves are
 * guaranteed to share their shape: the same routine draws the centreline and
 * both boundaries from the same samples.
 */
function spline(points: readonly Point[]): string {
  if (points.length < 2) return '';
  const first = points[0]!;
  let d = `M${first.x} ${round(first.y)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;

    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${round(c1.x)} ${round(c1.y)}, ${round(c2.x)} ${round(c2.y)}, ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

function splineSegments(points: readonly Point[]): string {
  return spline(points).replace(/^M[^C]+/, '');
}

const round = (value: number) => Math.round(value * 10) / 10;

/** `centre ∓ halfWidth`, sample by sample. The boundaries cannot leave the path. */
function offsetControl(centre: readonly Point[], width: readonly Point[], sign: 1 | -1): Point[] {
  return centre.map((point, index) => ({
    x: point.x,
    y: point.y + sign * (width[index]?.y ?? 0),
  }));
}

export interface Corridor {
  centre: string;
  upper: string;
  lower: string;
  /** Closed shape between both boundaries, used for the corridor's quiet fill. */
  band: string;
  /** Where the corridor is tightest — the signature moment. */
  waist: Point;
  /** The corridor's half-width at the waist, for sizing the marker. */
  waistHalfWidth: number;
  /** Approximate progress along the centreline when the signal reaches the waist. */
  waistProgress: number;
  /** A handful of points on the centreline, for ticks and markers. */
  stations: readonly Point[];
}

function segmentLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function progressAt(points: readonly Point[], index: number): number {
  const lengths = points
    .slice(1)
    .map((point, pointIndex) => segmentLength(points[pointIndex]!, point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const travelled = lengths.slice(0, index).reduce((sum, length) => sum + length, 0);
  return total === 0 ? 0 : travelled / total;
}

function build(
  centre: readonly Point[],
  width: readonly Point[],
  stationIndices: readonly number[],
): Corridor {
  let waistIndex = 0;
  width.forEach((point, index) => {
    if (point.y < width[waistIndex]!.y) waistIndex = index;
  });

  const upper = offsetControl(centre, width, -1);
  const lower = offsetControl(centre, width, 1);
  const lowerReturn = [...lower].reverse();
  const lowerEnd = lowerReturn[0]!;

  return {
    centre: spline(centre),
    upper: spline(upper),
    lower: spline(lower),
    band: `${spline(upper)} L${lowerEnd.x} ${round(lowerEnd.y)}${splineSegments(lowerReturn)} Z`,
    waist: centre[waistIndex]!,
    waistHalfWidth: width[waistIndex]!.y,
    waistProgress: progressAt(centre, waistIndex),
    stations: stationIndices.map((index) => centre[index]!).filter(Boolean),
  };
}

export const DESKTOP_CORRIDOR = build(CENTRE_CONTROL, WIDTH_CONTROL, [3, 5, 6, 8, 9]);
export const MOBILE_CORRIDOR = build(MOBILE_CENTRE, MOBILE_WIDTH, [2, 3, 4]);
