import Decimal from 'decimal.js';
import { isQuantityWithinBounds } from './trading-math';

/**
 * W4 §21/§22/§24 — Decimal-safe quantity presentation helpers for the
 * Execution Center's stepper and quick presets.
 *
 * These live here, not in `apps/web`, for the same reason every other money
 * calculation does: the browser package has no `decimal.js` dependency at all
 * (see chart-overlay.ts's own note), so a stepper implemented there would
 * have had to use binary floats — and `0.1 + 0.2` is exactly the artefact
 * §21 forbids.
 *
 * Nothing here is a new trading rule. The single source of truth for whether
 * a quantity is acceptable remains `isQuantityWithinBounds` (trading-math.ts),
 * which the server re-runs under lock on every order; these functions only
 * *produce* values that satisfy it, and the last one below re-checks its own
 * output against it rather than assuming.
 *
 * The valid quantity lattice is `minimumQuantity + k × quantityStep` for
 * integer k ≥ 0, capped at `maximumQuantity` — that is exactly what
 * `isQuantityWithinBounds` accepts (it takes the remainder modulo the step
 * *after* subtracting the minimum), and it is why nothing here multiplies the
 * step blindly: when a symbol's minimum is not itself a whole number of
 * steps, `min × 5` need not be a valid quantity at all.
 */

export interface QuantityBounds {
  minimumQuantity: string;
  maximumQuantity: string;
  quantityStep: string;
}

/**
 * Whether a raw input string is a plain non-negative decimal literal.
 *
 * Required because `new Decimal(value)` *throws* on anything it cannot parse
 * ("abc", "1.2.3", " 0.5 ", ""), and the quantity field is a free-text input
 * with `inputMode="decimal"` — a soft keyboard hint, not a constraint. Before
 * W4 the ticket handed raw keystrokes straight to `isQuantityWithinBounds`,
 * so a single stray letter threw during render. Exponent form ("1e5") and the
 * literals "NaN"/"Infinity" are rejected here too: they are parseable but are
 * never what a trader meant to type into a lot-size field.
 */
export function isDecimalQuantityInput(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

/**
 * Decimal places to render a quantity with: enough for both the step and the
 * minimum, so neither is ever truncated. Uses Decimal's own digit count
 * rather than the raw string's, because `numeric(14,4)` columns arrive
 * right-padded ("0.0100" for a step of two meaningful decimals) — the same
 * reasoning as `decimalPlacesOf` in chart-overlay.ts.
 */
export function quantityDisplayScale(bounds: QuantityBounds): number {
  return Math.max(
    new Decimal(bounds.quantityStep).decimalPlaces(),
    new Decimal(bounds.minimumQuantity).decimalPlaces(),
  );
}

/** The highest k for which `minimum + k × step` is still within bounds; null when the bounds are degenerate. */
function maximumStepIndex(bounds: QuantityBounds): Decimal | null {
  const step = new Decimal(bounds.quantityStep);
  if (step.lessThanOrEqualTo(0)) return null;
  const span = new Decimal(bounds.maximumQuantity).minus(bounds.minimumQuantity);
  if (span.lessThan(0)) return null;
  return span.dividedBy(step).floor();
}

/**
 * One press of − or +.
 *
 * Moves to the adjacent point of the valid lattice rather than adding the
 * step to whatever is in the field, so a value that is off-lattice, below the
 * minimum, above the maximum or unparseable still lands on something the
 * canonical validator accepts. An empty or malformed field steps to the
 * minimum — the nearest deliberate, valid quantity — instead of producing
 * NaN.
 */
export function stepQuantity(
  params: QuantityBounds & { quantity: string; direction: 1 | -1 },
): string {
  const scale = quantityDisplayScale(params);
  const minimum = new Decimal(params.minimumQuantity);
  const maxIndex = maximumStepIndex(params);
  if (maxIndex === null) return minimum.toFixed(scale);
  if (!isDecimalQuantityInput(params.quantity)) return minimum.toFixed(scale);

  const step = new Decimal(params.quantityStep);
  const index = new Decimal(params.quantity.trim()).minus(minimum).dividedBy(step);
  // floor/ceil rather than round: from an off-lattice value, + must always
  // move up and − must always move down, never snap back to where it was.
  const next = params.direction === 1 ? index.floor().plus(1) : index.ceil().minus(1);
  const clamped = Decimal.min(Decimal.max(next, 0), maxIndex);
  return minimum.plus(clamped.times(step)).toFixed(scale);
}

/**
 * W4 §22 — the quick-preset row.
 *
 * Speed shortcuts, never risk sizing (§23): the multipliers scale the
 * instrument's own minimum tradable size and know nothing about the account,
 * its balance, its risk budget or any stop-loss distance. Each candidate is
 * snapped onto the valid lattice, dropped if it exceeds `maximumQuantity`,
 * de-duplicated, and finally re-validated with `isQuantityWithinBounds` — so
 * a preset the UI offers cannot be a quantity the server would reject as
 * INVALID_QUANTITY.
 *
 * With the current spec set (minimum equal to step everywhere) this yields
 * 0.01 / 0.05 / 0.10 for forex and gold and 0.1 / 0.5 / 1.0 for NAS100. When
 * a future symbol's minimum is not a whole number of steps, the snap keeps
 * every preset on `minimum + k × step` instead of returning `minimum × m`.
 */
export const DEFAULT_QUANTITY_PRESET_MULTIPLIERS = [1, 5, 10] as const;

export function deriveQuantityPresets(
  params: QuantityBounds & { multipliers?: readonly number[] },
): string[] {
  const multipliers = params.multipliers ?? DEFAULT_QUANTITY_PRESET_MULTIPLIERS;
  const maxIndex = maximumStepIndex(params);
  if (maxIndex === null) return [];

  const scale = quantityDisplayScale(params);
  const minimum = new Decimal(params.minimumQuantity);
  const step = new Decimal(params.quantityStep);
  const maximum = new Decimal(params.maximumQuantity);
  const presets: string[] = [];

  for (const multiplier of multipliers) {
    if (!Number.isFinite(multiplier) || multiplier <= 0) continue;
    const index = minimum
      .times(multiplier)
      .minus(minimum)
      .dividedBy(step)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    if (index.lessThan(0) || index.greaterThan(maxIndex)) continue;
    const value = minimum.plus(index.times(step));
    if (value.greaterThan(maximum) || value.lessThanOrEqualTo(0)) continue;
    const formatted = value.toFixed(scale);
    if (presets.includes(formatted)) continue;
    // The gate the server itself applies — asserted on our own output rather
    // than assumed from the construction above.
    if (
      !isQuantityWithinBounds({
        quantity: formatted,
        minimumQuantity: params.minimumQuantity,
        maximumQuantity: params.maximumQuantity,
        quantityStep: params.quantityStep,
      })
    ) {
      continue;
    }
    presets.push(formatted);
  }

  return presets.sort((left, right) => new Decimal(left).comparedTo(right));
}
