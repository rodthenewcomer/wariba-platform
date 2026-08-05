import { describe, expect, it } from 'vitest';
import { formatFcfa, formatUsd } from '../lib/pricing-format';

describe('formatFcfa / formatUsd', () => {
  it('rounds to the nearest whole unit instead of truncating at the decimal point', () => {
    // Number.parseInt("148.50", 10) === 148 — this is exactly the bug: it
    // must round to 149, not silently drop the 50 cents.
    expect(formatFcfa('148.50')).toBe('149 FCFA');
    expect(formatUsd('148.50')).toBe('149 USD');
  });

  it('rounds down when the fractional part is below the midpoint', () => {
    expect(formatFcfa('148.49')).toBe('148 FCFA');
    expect(formatUsd('148.49')).toBe('148 USD');
  });

  it('formats a whole-number amount unchanged', () => {
    expect(formatFcfa('50000.00')).toBe(`${(50000).toLocaleString('fr-FR')} FCFA`);
    expect(formatUsd('69.00')).toBe('69 USD');
  });
});
