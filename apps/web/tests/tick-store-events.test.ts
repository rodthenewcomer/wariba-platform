import { describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { createCandleAggregator, midPrice } from '@wariba/contracts';
import type { MarketTick } from '@wariba/contracts';
import { createTickStore, useTick } from '../app/(trade)/trade/tick-store';

function tick(seconds: number, bid: string, ask: string): MarketTick {
  return {
    symbol: 'EURUSD',
    bid,
    ask,
    timestamp: new Date(Date.UTC(2026, 0, 1, 10, 0, seconds)).toISOString(),
    sequence: seconds,
    marketStatus: 'open',
  } as MarketTick;
}

describe('TickStore event subscription — W3 §6', () => {
  it('delivers every accepted tick exactly once, with the tick itself', () => {
    const store = createTickStore();
    const seen: MarketTick[] = [];
    const off = store.subscribeTickEvents('EURUSD', (t) => seen.push(t));

    store.update(tick(1, '1.10000', '1.10002'));
    store.update(tick(2, '1.10500', '1.10502'));
    store.update(tick(3, '1.10100', '1.10102'));

    expect(seen.map((t) => t.sequence)).toEqual([1, 2, 3]);
    off();
    store.update(tick(4, '1.10200', '1.10202'));
    expect(seen).toHaveLength(3);
  });

  it('does not deliver another symbol’s ticks', () => {
    const store = createTickStore();
    const seen: MarketTick[] = [];
    store.subscribeTickEvents('EURUSD', (t) => seen.push(t));
    store.update({ ...tick(1, '1.26000', '1.26002'), symbol: 'GBPUSD' } as MarketTick);
    expect(seen).toHaveLength(0);
  });

  it('releases its listener set on unsubscribe, so nothing leaks', () => {
    const store = createTickStore();
    const listener = vi.fn();
    const off = store.subscribeTickEvents('EURUSD', listener);
    off();
    off(); // idempotent
    store.update(tick(1, '1.10000', '1.10002'));
    expect(listener).not.toHaveBeenCalled();
  });
});

/**
 * W3 §52 — the regression that motivated the whole of B1.
 *
 * The shipped chart aggregated candles from a React effect keyed on the tick
 * prop. These two tests drive the *same* store the same way and show the
 * difference: the render path collapses a batch, the event path does not.
 */
describe('React batching independence — W3 §52/§53', () => {
  const PRECISION = 5;
  const observe = (aggregator: ReturnType<typeof createCandleAggregator>, t: MarketTick) =>
    aggregator.observe({
      timestampMs: new Date(t.timestamp).getTime(),
      price: midPrice(t.bid, t.ask, PRECISION),
    });

  it('the render path loses an intermediate spike — the defect being fixed', () => {
    const store = createTickStore();
    const aggregator = createCandleAggregator('1m');
    const { result } = renderHook(() => useTick(store, 'EURUSD'));

    // Three accepted ticks inside one React batch: open, spike, lower close.
    act(() => {
      store.update(tick(1, '1.10000', '1.10000'));
      store.update(tick(2, '1.10500', '1.10500'));
      store.update(tick(3, '1.10100', '1.10100'));
    });

    // React rendered once, with only the final tick — so an aggregator driven
    // from the rendered value never sees the 1.10500 high.
    const rendered = result.current as MarketTick;
    observe(aggregator, rendered);
    expect(aggregator.current()?.high).toBe('1.10100');
  });

  it('the event path preserves the true high and low across one batch', () => {
    const store = createTickStore();
    const aggregator = createCandleAggregator('1m');
    store.subscribeTickEvents('EURUSD', (t) => observe(aggregator, t));

    act(() => {
      store.update(tick(1, '1.10000', '1.10000'));
      store.update(tick(2, '1.10500', '1.10500'));
      store.update(tick(3, '1.09500', '1.09500'));
      store.update(tick(4, '1.10100', '1.10100'));
    });

    expect(aggregator.current()).toEqual({
      startTime: Date.UTC(2026, 0, 1, 10, 0, 0) / 1000,
      open: '1.10000',
      high: '1.10500',
      low: '1.09500',
      close: '1.10100',
    });
  });

  it('is unaffected by how many renders occur', () => {
    const store = createTickStore();
    const aggregator = createCandleAggregator('1m');
    store.subscribeTickEvents('EURUSD', (t) => observe(aggregator, t));
    renderHook(() => useTick(store, 'EURUSD'));

    // One tick per act() — the maximum number of renders — must produce the
    // identical candle to the single-batch case above.
    for (const t of [
      tick(1, '1.10000', '1.10000'),
      tick(2, '1.10500', '1.10500'),
      tick(3, '1.09500', '1.09500'),
      tick(4, '1.10100', '1.10100'),
    ]) {
      act(() => store.update(t));
    }

    expect(aggregator.current()).toEqual({
      startTime: Date.UTC(2026, 0, 1, 10, 0, 0) / 1000,
      open: '1.10000',
      high: '1.10500',
      low: '1.09500',
      close: '1.10100',
    });
  });
});
