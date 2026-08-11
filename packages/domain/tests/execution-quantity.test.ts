import { describe, expect, it } from 'vitest';
import {
  deriveQuantityPresets,
  isDecimalQuantityInput,
  isQuantityWithinBounds,
  quantityDisplayScale,
  stepQuantity,
} from '../src/index.js';

/**
 * W4 §73/§74 — the quantity stepper and quick presets, against the three
 * representative shapes in the shipped spec set.
 *
 * The bounds strings are written the way the server actually delivers them:
 * `app.symbol_specs.quantity_step` is `numeric(14,4)`, so a step of two
 * meaningful decimals arrives as "0.0100". A helper that counted the raw
 * string's decimals would render "0.0500" here; that is precisely the case
 * these fixtures exist to catch.
 */
const FOREX = { minimumQuantity: '0.0100', maximumQuantity: '10.0000', quantityStep: '0.0100' };
const GOLD = { minimumQuantity: '0.0100', maximumQuantity: '5.0000', quantityStep: '0.0100' };
const NAS100 = { minimumQuantity: '0.1000', maximumQuantity: '20.0000', quantityStep: '0.1000' };

describe('isDecimalQuantityInput', () => {
  it('accepts plain non-negative decimal literals', () => {
    for (const value of ['0', '1', '0.01', '10.0000', '  0.5  ']) {
      expect(isDecimalQuantityInput(value)).toBe(true);
    }
  });

  it('rejects everything Decimal would throw on, plus exponent and non-finite literals', () => {
    for (const value of ['', 'abc', '1.2.3', '-1', '1e5', 'NaN', 'Infinity', '.5', '1.']) {
      expect(isDecimalQuantityInput(value)).toBe(false);
    }
  });

  it('guards the input path that used to throw during render', () => {
    // Before W4 the ticket handed raw keystrokes to isQuantityWithinBounds,
    // which constructs a Decimal — and Decimal throws on unparseable input.
    expect(() => isQuantityWithinBounds({ quantity: 'abc', ...FOREX })).toThrow();
    expect(isDecimalQuantityInput('abc')).toBe(false);
  });
});

describe('quantityDisplayScale', () => {
  it('uses the value’s meaningful decimals, not the numeric column’s padding', () => {
    expect(quantityDisplayScale(FOREX)).toBe(2);
    expect(quantityDisplayScale(NAS100)).toBe(1);
  });
});

describe('stepQuantity', () => {
  it('adds and subtracts exactly one step on a fractional-step symbol', () => {
    expect(stepQuantity({ ...FOREX, quantity: '0.10', direction: 1 })).toBe('0.11');
    expect(stepQuantity({ ...FOREX, quantity: '0.10', direction: -1 })).toBe('0.09');
  });

  it('adds and subtracts exactly one step on NAS100', () => {
    expect(stepQuantity({ ...NAS100, quantity: '0.1', direction: 1 })).toBe('0.2');
    expect(stepQuantity({ ...NAS100, quantity: '1.0', direction: -1 })).toBe('0.9');
  });

  it('produces no binary floating artefact across a long run of steps', () => {
    let quantity = '0.01';
    for (let i = 0; i < 300; i += 1) {
      quantity = stepQuantity({ ...FOREX, quantity, direction: 1 });
      expect(quantity).not.toMatch(/\d{5,}/);
      expect(Number.isFinite(Number(quantity))).toBe(true);
    }
    // 0.01 + 300 × 0.01, exactly — a float accumulator lands on 3.0100000000000007.
    expect(quantity).toBe('3.01');
    for (let i = 0; i < 300; i += 1) {
      quantity = stepQuantity({ ...FOREX, quantity, direction: -1 });
    }
    expect(quantity).toBe('0.01');
  });

  it('clamps at the minimum and the maximum instead of leaving the lattice', () => {
    expect(stepQuantity({ ...FOREX, quantity: '0.01', direction: -1 })).toBe('0.01');
    expect(stepQuantity({ ...FOREX, quantity: '10', direction: 1 })).toBe('10.00');
    expect(stepQuantity({ ...GOLD, quantity: '5', direction: 1 })).toBe('5.00');
  });

  it('moves an off-lattice value onto the lattice, in the pressed direction', () => {
    expect(stepQuantity({ ...FOREX, quantity: '0.015', direction: 1 })).toBe('0.02');
    expect(stepQuantity({ ...FOREX, quantity: '0.015', direction: -1 })).toBe('0.01');
  });

  it('recovers to the minimum from empty, malformed, zero and negative input', () => {
    for (const quantity of ['', '   ', 'abc', '1.2.3', '-5', '0']) {
      expect(stepQuantity({ ...FOREX, quantity, direction: 1 })).toBe('0.01');
      expect(stepQuantity({ ...FOREX, quantity, direction: -1 })).toBe('0.01');
    }
  });

  it('brings a pasted out-of-range value back inside the bounds', () => {
    expect(stepQuantity({ ...FOREX, quantity: '999999', direction: -1 })).toBe('10.00');
    expect(stepQuantity({ ...FOREX, quantity: '0.0001', direction: 1 })).toBe('0.01');
  });

  it('only ever returns a quantity the canonical validator accepts', () => {
    for (const bounds of [FOREX, GOLD, NAS100]) {
      for (const quantity of ['', 'abc', '0', '0.015', '999999', '0.10', '3']) {
        for (const direction of [1, -1] as const) {
          const stepped = stepQuantity({ ...bounds, quantity, direction });
          expect(isQuantityWithinBounds({ quantity: stepped, ...bounds })).toBe(true);
        }
      }
    }
  });
});

describe('deriveQuantityPresets', () => {
  it('derives 1× / 5× / 10× of the minimum for the shipped spec set', () => {
    expect(deriveQuantityPresets(FOREX)).toEqual(['0.01', '0.05', '0.10']);
    expect(deriveQuantityPresets(GOLD)).toEqual(['0.01', '0.05', '0.10']);
    expect(deriveQuantityPresets(NAS100)).toEqual(['0.1', '0.5', '1.0']);
  });

  it('every preset passes canonical quantity validation', () => {
    for (const bounds of [FOREX, GOLD, NAS100]) {
      for (const preset of deriveQuantityPresets(bounds)) {
        expect(isQuantityWithinBounds({ quantity: preset, ...bounds })).toBe(true);
      }
    }
  });

  it('never offers a preset above the maximum, at zero, or duplicated', () => {
    const tight = { minimumQuantity: '1', maximumQuantity: '3', quantityStep: '1' };
    const presets = deriveQuantityPresets(tight);
    expect(presets).toEqual(['1']);
    expect(new Set(presets).size).toBe(presets.length);
    for (const preset of presets) expect(Number(preset)).toBeGreaterThan(0);
  });

  it('derives from minimum + step increments when the minimum is not a whole number of steps', () => {
    // 5 × 0.5 = 2.5 is on the lattice; 10 × 0.5 = 5 exceeds the maximum and is
    // dropped rather than clamped to an invalid value.
    const offset = { minimumQuantity: '0.5', maximumQuantity: '3', quantityStep: '0.1' };
    const presets = deriveQuantityPresets(offset);
    expect(presets).toEqual(['0.5', '2.5']);
    for (const preset of presets) {
      expect(isQuantityWithinBounds({ quantity: preset, ...offset })).toBe(true);
    }
  });

  it('returns nothing rather than guessing when the bounds are degenerate', () => {
    expect(
      deriveQuantityPresets({ minimumQuantity: '1', maximumQuantity: '0.5', quantityStep: '0.1' }),
    ).toEqual([]);
    expect(
      deriveQuantityPresets({ minimumQuantity: '1', maximumQuantity: '10', quantityStep: '0' }),
    ).toEqual([]);
  });

  it('ignores non-positive or non-finite multipliers', () => {
    expect(deriveQuantityPresets({ ...FOREX, multipliers: [0, -3, Number.NaN, 2] })).toEqual([
      '0.02',
    ]);
  });
});
