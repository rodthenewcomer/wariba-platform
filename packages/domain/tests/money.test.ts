import { describe, expect, it } from 'vitest';
import { Money } from '../src/money';

describe('Money', () => {
  it('adds and subtracts within the same currency', () => {
    const a = Money.fromString('100.50', 'USD');
    const b = Money.fromString('49.25', 'USD');
    expect(a.add(b).toString()).toBe('149.75');
    expect(a.subtract(b).toString()).toBe('51.25');
  });

  it('rejects cross-currency arithmetic', () => {
    const usd = Money.fromString('10', 'USD');
    const xof = Money.fromString('10', 'XOF');
    expect(() => usd.add(xof)).toThrow('Currency mismatch');
  });

  it('never loses precision the way IEEE-754 float would (0.1 + 0.2 case)', () => {
    const a = Money.fromString('0.1', 'USD');
    const b = Money.fromString('0.2', 'USD');
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(a.add(b).toString()).toBe('0.30');
  });

  it('reports zero and negative correctly', () => {
    expect(Money.zero('USD').isZero()).toBe(true);
    expect(Money.fromString('-5', 'USD').isNegative()).toBe(true);
    expect(Money.fromString('5', 'USD').isNegative()).toBe(false);
  });

  it('compares equality across value and currency', () => {
    expect(Money.fromString('10.00', 'USD').equals(Money.fromString('10', 'USD'))).toBe(true);
    expect(Money.fromString('10', 'USD').equals(Money.fromString('10', 'XOF'))).toBe(false);
  });

  it('serializes as a fixed-precision decimal string, never a float', () => {
    const m = Money.fromString('1234.5', 'USD');
    expect(m.toString()).toBe('1234.50');
    expect(JSON.stringify({ amount: m })).toBe('{"amount":"1234.50"}');
  });

  it('greaterThanOrEqual compares correctly at the boundary', () => {
    const cap = Money.fromString('200', 'USD');
    expect(Money.fromString('200', 'USD').greaterThanOrEqual(cap)).toBe(true);
    expect(Money.fromString('199.99', 'USD').greaterThanOrEqual(cap)).toBe(false);
    expect(Money.fromString('200.01', 'USD').greaterThanOrEqual(cap)).toBe(true);
  });
});
