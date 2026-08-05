import { afterEach, describe, expect, it } from 'vitest';
import { isPartialCloseEnabled } from '../lib/feature-flags';

const ORIGINAL = process.env.NEXT_PUBLIC_FEATURE_PARTIAL_CLOSE;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_FEATURE_PARTIAL_CLOSE;
  } else {
    process.env.NEXT_PUBLIC_FEATURE_PARTIAL_CLOSE = ORIGINAL;
  }
});

describe('isPartialCloseEnabled', () => {
  it('is disabled by default (unset)', () => {
    delete process.env.NEXT_PUBLIC_FEATURE_PARTIAL_CLOSE;
    expect(isPartialCloseEnabled()).toBe(false);
  });

  it('is disabled for any value other than the literal string "true"', () => {
    process.env.NEXT_PUBLIC_FEATURE_PARTIAL_CLOSE = '1';
    expect(isPartialCloseEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_FEATURE_PARTIAL_CLOSE = 'yes';
    expect(isPartialCloseEnabled()).toBe(false);
  });

  it('is enabled only when explicitly set to "true"', () => {
    process.env.NEXT_PUBLIC_FEATURE_PARTIAL_CLOSE = 'true';
    expect(isPartialCloseEnabled()).toBe(true);
  });
});
