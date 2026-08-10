import { describe, expect, it } from 'vitest';
import type { MarketTick } from '@wariba/adapters';
import { MarketTickGate } from '../src/tick-gate';

function tick(overrides: Partial<MarketTick> = {}): MarketTick {
  return {
    symbol: 'EURUSD',
    bid: '1.08450',
    ask: '1.08460',
    timestamp: '2026-08-09T00:00:00.000Z',
    sequence: 1,
    marketStatus: 'open',
    ...overrides,
  };
}

describe('MarketTickGate', () => {
  it('accepts a monotonic stream', () => {
    const gate = new MarketTickGate();
    expect(gate.evaluate(tick())).toBe('accepted');
    expect(gate.evaluate(tick({ sequence: 2, timestamp: '2026-08-09T00:00:00.100Z' }))).toBe(
      'accepted',
    );
  });

  it('rejects duplicate and out-of-order sequence values', () => {
    const gate = new MarketTickGate();
    expect(gate.evaluate(tick({ sequence: 4 }))).toBe('accepted');
    expect(gate.evaluate(tick({ sequence: 4 }))).toBe('duplicate');
    expect(gate.evaluate(tick({ sequence: 3 }))).toBe('out_of_order');
  });

  it('rejects timestamp regression even when sequence rises', () => {
    const gate = new MarketTickGate();
    expect(gate.evaluate(tick({ sequence: 4, timestamp: '2026-08-09T00:00:01.000Z' }))).toBe(
      'accepted',
    );
    expect(gate.evaluate(tick({ sequence: 5, timestamp: '2026-08-09T00:00:00.999Z' }))).toBe(
      'out_of_order',
    );
  });

  it('broadcasts feed state but excludes stale/outage ticks from financial processing', () => {
    const gate = new MarketTickGate();
    expect(gate.evaluate(tick({ marketStatus: 'stale' }))).toBe('not_open');
    expect(gate.evaluate(tick({ marketStatus: 'closed' }))).toBe('not_open');
    expect(gate.evaluate(tick({ marketStatus: 'open' }))).toBe('accepted');
  });
});
