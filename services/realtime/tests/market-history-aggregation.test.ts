import { describe, expect, it } from 'vitest';
import type { HistoricalBar } from '@wariba/adapters';
import { DERIVATION_SOURCE, deriveBars, sourceBarsNeeded } from '../src/market-history-aggregation';

const MINUTE = 60;

function minuteBar(
  startTime: number,
  prices: { open: string; high: string; low: string; close: string },
  volume: number | null = null,
): HistoricalBar {
  return {
    startTime,
    ...prices,
    volume: volume === null ? null : { value: String(volume), semantics: 'tick' },
  };
}

const BASE = Date.UTC(2026, 7, 20, 12, 0, 0) / 1000;

describe('DERIVATION_SOURCE', () => {
  it('derives 3m from 1m and nothing else', () => {
    expect(DERIVATION_SOURCE['3m']).toBe('1m');
    expect(DERIVATION_SOURCE['5m']).toBeUndefined();
  });
});

describe('deriveBars', () => {
  it('builds a 3m bar from three complete 1m bars', () => {
    const source = [
      minuteBar(BASE, { open: '1.1000', high: '1.1010', low: '1.0990', close: '1.1005' }),
      minuteBar(BASE + MINUTE, { open: '1.1005', high: '1.1030', low: '1.1000', close: '1.1020' }),
      minuteBar(BASE + 2 * MINUTE, {
        open: '1.1020',
        high: '1.1025',
        low: '1.0980',
        close: '1.1015',
      }),
    ];
    const { bars } = deriveBars(source, '1m', '3m', { from: BASE, to: BASE + 3 * MINUTE });
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({
      startTime: BASE,
      open: '1.1000',
      high: '1.1030',
      low: '1.0980',
      close: '1.1015',
    });
  });

  it('emits a bucket whose middle minute never printed, using only real prices', () => {
    const source = [
      minuteBar(BASE, { open: '1.1000', high: '1.1010', low: '1.0990', close: '1.1005' }),
      minuteBar(BASE + 2 * MINUTE, {
        open: '1.1020',
        high: '1.1025',
        low: '1.1015',
        close: '1.1018',
      }),
    ];
    const { bars } = deriveBars(source, '1m', '3m', { from: BASE, to: BASE + 3 * MINUTE });
    expect(bars).toHaveLength(1);
    // No fill-forward: the absent minute contributes nothing at all.
    expect(bars[0]).toMatchObject({
      open: '1.1000',
      close: '1.1018',
      high: '1.1025',
      low: '1.0990',
    });
  });

  it('refuses a bucket the fetched window does not fully contain', () => {
    const source = [
      minuteBar(BASE + MINUTE, { open: '1.1005', high: '1.1030', low: '1.1000', close: '1.1020' }),
      minuteBar(BASE + 2 * MINUTE, {
        open: '1.1020',
        high: '1.1025',
        low: '1.0980',
        close: '1.1015',
      }),
    ];
    const { bars, skippedIncomplete } = deriveBars(source, '1m', '3m', {
      from: BASE + MINUTE,
      to: BASE + 3 * MINUTE,
    });
    expect(bars).toHaveLength(0);
    expect(skippedIncomplete).toBe(1);
  });

  it('refuses the newest bucket while its window is still open', () => {
    const source = [
      minuteBar(BASE, { open: '1.1000', high: '1.1010', low: '1.0990', close: '1.1005' }),
      minuteBar(BASE + 3 * MINUTE, {
        open: '1.1005',
        high: '1.1030',
        low: '1.1000',
        close: '1.1020',
      }),
    ];
    const { bars, skippedIncomplete } = deriveBars(source, '1m', '3m', {
      from: BASE,
      to: BASE + 4 * MINUTE,
    });
    expect(bars.map((bar) => bar.startTime)).toEqual([BASE]);
    expect(skippedIncomplete).toBe(1);
  });

  it('sums tick volume when every contributing bar carries it', () => {
    const source = [
      minuteBar(BASE, { open: '1.1000', high: '1.1010', low: '1.0990', close: '1.1005' }, 100),
      minuteBar(
        BASE + MINUTE,
        { open: '1.1005', high: '1.1030', low: '1.1000', close: '1.1020' },
        250,
      ),
      minuteBar(
        BASE + 2 * MINUTE,
        { open: '1.1020', high: '1.1025', low: '1.0980', close: '1.1015' },
        50,
      ),
    ];
    const { bars } = deriveBars(source, '1m', '3m', { from: BASE, to: BASE + 3 * MINUTE });
    expect(bars[0]?.volume).toEqual({ value: '400', semantics: 'tick' });
  });

  it('reports no volume rather than an understated total when one bar lacks it', () => {
    const source = [
      minuteBar(BASE, { open: '1.1000', high: '1.1010', low: '1.0990', close: '1.1005' }, 100),
      minuteBar(BASE + MINUTE, { open: '1.1005', high: '1.1030', low: '1.1000', close: '1.1020' }),
    ];
    const { bars } = deriveBars(source, '1m', '3m', { from: BASE, to: BASE + 3 * MINUTE });
    expect(bars[0]?.volume).toBeNull();
  });
});

describe('sourceBarsNeeded', () => {
  it('scales the request by the interval ratio', () => {
    expect(sourceBarsNeeded('3m', '1m', 1000)).toBe(3000);
  });
});
