import { describe, expect, it } from 'vitest';
import { resolveWariXMarketDisplayState } from '../app/(trade)/trade/market-display-state';

describe('WariX market display state', () => {
  it('presents a stale Saturday FX quote as a closed market', () => {
    const state = resolveWariXMarketDisplayState({
      marketStatus: 'stale',
      historyStatus: 'ready',
      realtimeContinuation: 'attached',
      nowMs: Date.UTC(2026, 7, 22, 14),
    });
    expect(state.state).toBe('MARKET_CLOSED');
    expect(state.label).toBe('Marché fermé');
    expect(state.blocksPlot).toBe(false);
  });

  it('uses stale only while the weekly market is expected to be open', () => {
    const state = resolveWariXMarketDisplayState({
      marketStatus: 'stale',
      historyStatus: 'ready',
      realtimeContinuation: 'attached',
      nowMs: Date.UTC(2026, 7, 20, 14),
    });
    expect(state.state).toBe('STALE');
    expect(state.label).toBe('Cours non actualisé');
  });

  it('keeps genuine history visible when realtime cannot continue it', () => {
    const state = resolveWariXMarketDisplayState({
      marketStatus: null,
      historyStatus: 'ready',
      realtimeContinuation: 'refused_source_mismatch',
      nowMs: Date.UTC(2026, 7, 20, 14),
    });
    expect(state.state).toBe('HISTORY_ONLY');
    expect(state.blocksPlot).toBe(false);
  });

  it('blocks the plot only when no usable market or history data exists', () => {
    const state = resolveWariXMarketDisplayState({
      marketStatus: null,
      historyStatus: 'error',
      hasUsableHistory: false,
      nowMs: Date.UTC(2026, 7, 20, 14),
    });
    expect(state.state).toBe('UNAVAILABLE');
    expect(state.blocksPlot).toBe(true);
  });
});
