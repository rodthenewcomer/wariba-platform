import { describe, expect, it } from 'vitest';
import { decideRealtimeContinuation } from '../src/market-history-cutover';

const base = {
  mode: 'verified' as const,
  toleranceBps: 50,
  historyProvider: 'twelve-data',
  realtimeProvider: 'twelve-data',
  providerClose: '1.16761',
  liveClose: '1.16761',
};

describe('realtime cutover', () => {
  it('attaches when both sources quote the same price', () => {
    const decision = decideRealtimeContinuation(base);
    expect(decision.continuation).toBe('attached');
    expect(decision.divergenceBps).toBe('0.0');
  });

  it('attaches across a spread-sized difference', () => {
    // Half a pip on EURUSD is well inside any reasonable agreement.
    const decision = decideRealtimeContinuation({ ...base, liveClose: '1.16766' });
    expect(decision.continuation).toBe('attached');
    expect(Number(decision.divergenceBps)).toBeLessThan(1);
  });

  it('refuses the sandbox feed against genuine history — the WX3 regression', () => {
    const decision = decideRealtimeContinuation({
      ...base,
      realtimeProvider: 'mock',
      liveClose: '1.08450',
    });
    expect(decision.continuation).toBe('refused_price_divergence');
    // The measured figure from the WX3 evidence run.
    expect(Number(decision.divergenceBps)).toBeGreaterThan(700);
  });

  it('still refuses a divergent feed even when both sides share a vendor', () => {
    const decision = decideRealtimeContinuation({ ...base, liveClose: '1.30000' });
    expect(decision.continuation).toBe('refused_price_divergence');
  });

  it('falls back to vendor identity only when there is no price to compare', () => {
    expect(decideRealtimeContinuation({ ...base, liveClose: null }).continuation).toBe('attached');
    expect(
      decideRealtimeContinuation({ ...base, realtimeProvider: 'mock', liveClose: null })
        .continuation,
    ).toBe('refused_source_mismatch');
  });

  it('honours an explicit configuration refusal', () => {
    expect(decideRealtimeContinuation({ ...base, mode: 'never' }).continuation).toBe(
      'refused_by_config',
    );
  });

  it('does not measure when configured to always attach', () => {
    const decision = decideRealtimeContinuation({
      ...base,
      mode: 'always',
      liveClose: '1.30000',
    });
    expect(decision.continuation).toBe('attached');
    expect(decision.divergenceBps).toBeNull();
  });

  it('refuses rather than dividing by a nonsensical provider close', () => {
    expect(decideRealtimeContinuation({ ...base, providerClose: '0' }).continuation).toBe(
      'refused_source_mismatch',
    );
  });
});
