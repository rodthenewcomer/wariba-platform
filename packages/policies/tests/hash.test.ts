import { describe, expect, it } from 'vitest';
import { computeMachineHash } from '../src/hash';

describe('computeMachineHash', () => {
  it('is deterministic — the same object always hashes the same', () => {
    const parameters = { profit_target_rate: '0.10', daily_loss_rate: '0.03' };
    expect(computeMachineHash(parameters)).toBe(computeMachineHash(parameters));
  });

  it('is key-order independent (canonicalization sorts keys)', () => {
    const a = { profit_target_rate: '0.10', daily_loss_rate: '0.03' };
    const b = { daily_loss_rate: '0.03', profit_target_rate: '0.10' };
    expect(computeMachineHash(a)).toBe(computeMachineHash(b));
  });

  it('is sensitive to any value change', () => {
    const a = { profit_target_rate: '0.10' };
    const b = { profit_target_rate: '0.11' };
    expect(computeMachineHash(a)).not.toBe(computeMachineHash(b));
  });

  it('is sorted deeply for nested objects', () => {
    const a = { outer: { b: 1, a: 2 } };
    const b = { outer: { a: 2, b: 1 } };
    expect(computeMachineHash(a)).toBe(computeMachineHash(b));
  });

  it('returns a "sha256:" prefixed 64-hex-char digest', () => {
    const hash = computeMachineHash({ profit_target_rate: '0.10' });
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
