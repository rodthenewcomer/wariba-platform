import { describe, expect, it } from 'vitest';
import { resolveAlertPrice, isPriceAboveThreshold, shouldTriggerAlert } from '../src/price-alerts';

const TICK = { bid: '1.08450', ask: '1.08460' };

describe('resolveAlertPrice', () => {
  it('bid/ask return the raw tick side', () => {
    expect(resolveAlertPrice('bid', TICK)).toBe('1.08450');
    expect(resolveAlertPrice('ask', TICK)).toBe('1.08460');
  });

  it('mid is the midpoint (the default source)', () => {
    expect(resolveAlertPrice('mid', TICK)).toBe('1.08455');
  });
});

describe('isPriceAboveThreshold', () => {
  it('equal counts as above (>=), matching the crossing definition', () => {
    expect(isPriceAboveThreshold('1.08000', '1.08000')).toBe(true);
    expect(isPriceAboveThreshold('1.08001', '1.08000')).toBe(true);
    expect(isPriceAboveThreshold('1.07999', '1.08000')).toBe(false);
  });
});

describe('shouldTriggerAlert', () => {
  it('never fires on the first observation — only establishes the baseline', () => {
    expect(
      shouldTriggerAlert({
        direction: 'cross_above',
        lastObservedSideAbove: null,
        currentSideAbove: true,
      }),
    ).toBe(false);
    expect(
      shouldTriggerAlert({
        direction: 'cross_below',
        lastObservedSideAbove: null,
        currentSideAbove: false,
      }),
    ).toBe(false);
  });

  it('cross_above fires only on a below→above transition', () => {
    expect(
      shouldTriggerAlert({
        direction: 'cross_above',
        lastObservedSideAbove: false,
        currentSideAbove: true,
      }),
    ).toBe(true);
    expect(
      shouldTriggerAlert({
        direction: 'cross_above',
        lastObservedSideAbove: true,
        currentSideAbove: true,
      }),
    ).toBe(false);
    expect(
      shouldTriggerAlert({
        direction: 'cross_above',
        lastObservedSideAbove: true,
        currentSideAbove: false,
      }),
    ).toBe(false);
  });

  it('cross_below fires only on an above→below transition', () => {
    expect(
      shouldTriggerAlert({
        direction: 'cross_below',
        lastObservedSideAbove: true,
        currentSideAbove: false,
      }),
    ).toBe(true);
    expect(
      shouldTriggerAlert({
        direction: 'cross_below',
        lastObservedSideAbove: false,
        currentSideAbove: false,
      }),
    ).toBe(false);
  });

  it('does not fire merely by touching the threshold without a real transition', () => {
    // Price oscillates exactly at the threshold: above -> above -> above.
    // currentSideAbove is true every time (isPriceAboveThreshold's >=), so
    // lastObservedSideAbove never flips and cross_above never re-fires.
    expect(
      shouldTriggerAlert({
        direction: 'cross_above',
        lastObservedSideAbove: true,
        currentSideAbove: true,
      }),
    ).toBe(false);
  });
});
