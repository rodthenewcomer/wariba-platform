import { describe, expect, it } from 'vitest';
import { summarize } from '../src/journal-view';
import type { JournalEntry } from '../src/journal-view';

/**
 * The journal's totals.
 *
 * These live in the application layer because `apps/web` deliberately carries
 * no decimal library — the page cannot disagree with the column above it if
 * the page never adds anything up. That only holds if the arithmetic here is
 * right, so it is tested against the cases that actually bite: break-evens in
 * the denominator, one-sided records, and float drift.
 */
function entry(netPnl: string, outcome: JournalEntry['outcome']): JournalEntry {
  return {
    id: `fill-${netPnl}-${outcome}`,
    symbol: 'NAS100',
    direction: 'long',
    quantity: '1.00',
    entryPrice: '20000.0',
    exitPrice: '20010.0',
    netPnl,
    netPnlFormatted: netPnl,
    outcome,
    commission: '0.00',
    durationMs: 60_000,
    durationLabel: '1 min',
    timestampLabel: '22 août 2026, 14:38',
    occurredAt: '2026-08-22T14:38:00.000Z',
    eligibilityNote: null,
  };
}

describe('summarize', () => {
  it('has nothing to say about an empty set', () => {
    expect(summarize([])).toBeNull();
  });

  it('totals net P&L across wins and losses', () => {
    const summary = summarize([
      entry('184.00', 'win'),
      entry('-67.00', 'loss'),
      entry('210.00', 'win'),
    ]);
    expect(summary?.netPnl).toBe('327.00');
    expect(summary?.tradeCount).toBe(3);
    expect(summary?.wins).toBe(2);
    expect(summary?.losses).toBe(1);
  });

  it('does not drift on repeated two-decimal addition', () => {
    // The float trap: 0.1 + 0.2 !== 0.3. Ten of these is a visible cent.
    const summary = summarize(Array.from({ length: 10 }, () => entry('0.10', 'win')));
    expect(summary?.netPnl).toBe('1.00');
  });

  it('excludes break-evens from the win rate denominator', () => {
    // 1 win, 1 loss, 2 break-evens. A break-even is neither won nor lost;
    // counting it as a non-win would report 25 % for an even record.
    const summary = summarize([
      entry('100.00', 'win'),
      entry('-100.00', 'loss'),
      entry('0.00', 'breakeven'),
      entry('0.00', 'breakeven'),
    ]);
    expect(summary?.winRatePercent).toBe(50);
    expect(summary?.tradeCount).toBe(4);
  });

  it('reports no win rate rather than 0 % when nothing was decided', () => {
    const summary = summarize([entry('0.00', 'breakeven')]);
    // "0 %" is a claim the trader lost; null is the truth.
    expect(summary?.winRatePercent).toBeNull();
  });

  it('averages each side over its own count, not the total', () => {
    const summary = summarize([
      entry('300.00', 'win'),
      entry('100.00', 'win'),
      entry('-50.00', 'loss'),
    ]);
    expect(summary?.averageWinFormatted).toContain('200,00');
    expect(summary?.averageLossFormatted).toContain('-50,00');
  });

  it('omits an average with no trades on that side', () => {
    const summary = summarize([entry('300.00', 'win')]);
    expect(summary?.averageWinFormatted).toContain('300,00');
    // No losing trade means there is no average loss — not a zero one.
    expect(summary?.averageLossFormatted).toBeNull();
    expect(summary?.winRatePercent).toBe(100);
  });
});
