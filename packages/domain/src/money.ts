import { Decimal } from 'decimal.js';

/**
 * Money value object — Engineering Constitution §13.1: no financial value as
 * a native `number`. Wraps Decimal.js; serializes to a decimal string at
 * every boundary (API, DB), never a float.
 */
export class Money {
  private readonly value: Decimal;
  readonly currency: string;

  private constructor(value: Decimal, currency: string) {
    this.value = value;
    this.currency = currency;
  }

  static fromString(amount: string, currency: string): Money {
    return new Money(new Decimal(amount), currency);
  }

  static zero(currency: string): Money {
    return new Money(new Decimal(0), currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.plus(other.value), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.minus(other.value), this.currency);
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.value.greaterThanOrEqualTo(other.value);
  }

  /** Decimal string — the only representation allowed to cross a JSON/DB boundary. */
  toString(): string {
    return this.value.toFixed(2);
  }

  toJSON(): string {
    return this.toString();
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
