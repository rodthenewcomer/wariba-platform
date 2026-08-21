/**
 * VX1-A.1 §1 — where a price plate is *drawn*, when two of them want the same
 * pixel.
 *
 * The price scale is the one place on the chart where several unrelated levels
 * compete for the same few pixels: an entry five ticks from the market puts the
 * cobalt plate and the ice plate on top of each other, and a trader reading a
 * half-covered figure is worse off than one reading a plate that has visibly
 * stepped aside.
 *
 * Two rules decide everything here.
 *
 * 1. **The level never moves.** Only the plate does. The horizontal rule stays
 *    at its exact coordinate, the plate keeps printing its own true price, and a
 *    displaced plate says so with a connector back to its line. Nothing in this
 *    module may make a price *appear* to be somewhere it is not.
 * 2. **Priority decides who yields.** A trade level — take profit, stop loss,
 *    entry — is an operational commitment and keeps its position. The market's
 *    current price yields to it. Anything analytical yields to both.
 *
 * Pure and DOM-free, so the rules are testable without a chart.
 */

/** Lower sorts first, and first means "keeps its place". */
export const PLATE_PRIORITY = {
  trade: 0,
  current: 1,
  analysis: 2,
} as const;

export type PlatePriority = (typeof PLATE_PRIORITY)[keyof typeof PLATE_PRIORITY];

export interface PriceScalePlateInput {
  id: string;
  /** The plate's true vertical centre, from `priceToCoordinate`. */
  y: number;
  height: number;
  priority: PlatePriority;
}

export interface PriceScalePlatePlacement {
  id: string;
  /** Where the plate is drawn. */
  y: number;
  /** Where its level actually is — always the input `y`, clamped to nothing. */
  trueY: number;
  /** True when the two differ by more than a pixel, i.e. a connector is owed. */
  displaced: boolean;
}

interface Occupied {
  top: number;
  bottom: number;
}

function intersects(a: Occupied, b: Occupied, gap: number): boolean {
  return a.top < b.bottom + gap && b.top < a.bottom + gap;
}

/**
 * Places every plate, resolving collisions by priority.
 *
 * A plate that cannot keep its natural position is moved to the nearest free
 * slot on either side of whatever is in its way — nearest, so the plate stays as
 * close to its own line as the scale allows, and the connector stays short.
 * When the scale is too crowded for any free slot (a plate taller than the space
 * between two fixed ones), the plate stays at its natural position rather than
 * being flung to an arbitrary edge: an overlap a trader can see through is
 * better than a plate parked somewhere meaningless.
 */
export function resolvePriceScalePlates(
  inputs: readonly PriceScalePlateInput[],
  options: { height: number; gap?: number },
): PriceScalePlatePlacement[] {
  const gap = options.gap ?? 2;
  const height = options.height;
  const ordered = [...inputs].sort(
    (a, b) => a.priority - b.priority || a.y - b.y || a.id.localeCompare(b.id),
  );

  const occupied: Occupied[] = [];
  const placements: PriceScalePlatePlacement[] = [];

  for (const input of ordered) {
    const half = input.height / 2;
    const min = half;
    const max = Math.max(half, height - half);
    const natural = Math.min(Math.max(input.y, min), max);
    const boxAt = (centre: number): Occupied => ({ top: centre - half, bottom: centre + half });
    const free = (centre: number): boolean =>
      !occupied.some((taken) => intersects(boxAt(centre), taken, gap));

    let chosen = natural;
    if (!free(natural)) {
      const candidates = occupied
        .flatMap((taken) => [taken.top - gap - half, taken.bottom + gap + half])
        .filter((candidate) => candidate >= min && candidate <= max)
        .sort((a, b) => Math.abs(a - natural) - Math.abs(b - natural));
      chosen = candidates.find(free) ?? natural;
    }

    occupied.push(boxAt(chosen));
    placements.push({
      id: input.id,
      y: chosen,
      trueY: input.y,
      displaced: Math.abs(chosen - input.y) > 1,
    });
  }

  return placements;
}
