import { describe, expect, it } from 'vitest';
import { isProtectionLevelValid, protectionPlacementFor } from '../src/chart-overlay';

/**
 * VX1-D.1 §3/§33 — the geometry rule, pinned.
 *
 * An inversion here is the kind of defect that survives every visual review,
 * because a chart full of longs looks correct whichever way the rule is
 * written. These tests state both sides explicitly, in the prompt's own terms,
 * so the short case can never be the one nobody checked.
 */
describe('protective level geometry', () => {
  it('places a long the way a trader draws one', () => {
    //            TP  ↑
    //         ENTRY  ·
    //            SL  ↓
    expect(protectionPlacementFor('buy', 'take_profit')).toBe('above_entry');
    expect(protectionPlacementFor('buy', 'stop_loss')).toBe('below_entry');
  });

  it('places a short the way a trader draws one', () => {
    //            SL  ↑
    //         ENTRY  ·
    //            TP  ↓
    expect(protectionPlacementFor('sell', 'stop_loss')).toBe('above_entry');
    expect(protectionPlacementFor('sell', 'take_profit')).toBe('below_entry');
  });

  it('accepts the valid arrangements from the specification', () => {
    // BUY at 1.08500 — TP 1.08700, SL 1.08350.
    const buy = { side: 'buy' as const, entryPrice: '1.08500' };
    expect(isProtectionLevelValid({ ...buy, kind: 'take_profit', levelPrice: '1.08700' })).toBe(
      true,
    );
    expect(isProtectionLevelValid({ ...buy, kind: 'stop_loss', levelPrice: '1.08350' })).toBe(true);

    // SELL at 1.08500 — SL 1.08700, TP 1.08350.
    const sell = { side: 'sell' as const, entryPrice: '1.08500' };
    expect(isProtectionLevelValid({ ...sell, kind: 'stop_loss', levelPrice: '1.08700' })).toBe(
      true,
    );
    expect(isProtectionLevelValid({ ...sell, kind: 'take_profit', levelPrice: '1.08350' })).toBe(
      true,
    );
  });

  it('rejects the inverted arrangements rather than silently swapping them', () => {
    const buy = { side: 'buy' as const, entryPrice: '1.08500' };
    expect(isProtectionLevelValid({ ...buy, kind: 'take_profit', levelPrice: '1.08350' })).toBe(
      false,
    );
    expect(isProtectionLevelValid({ ...buy, kind: 'stop_loss', levelPrice: '1.08700' })).toBe(
      false,
    );

    const sell = { side: 'sell' as const, entryPrice: '1.08500' };
    expect(isProtectionLevelValid({ ...sell, kind: 'stop_loss', levelPrice: '1.08350' })).toBe(
      false,
    );
    expect(isProtectionLevelValid({ ...sell, kind: 'take_profit', levelPrice: '1.08700' })).toBe(
      false,
    );
  });

  it('refuses a level sitting exactly on the entry', () => {
    // Not a protection on either side — a stop that triggers at the price you
    // opened at is a round trip, not a risk limit.
    for (const side of ['buy', 'sell'] as const) {
      for (const kind of ['stop_loss', 'take_profit'] as const) {
        expect(
          isProtectionLevelValid({ side, kind, entryPrice: '1.08500', levelPrice: '1.08500' }),
        ).toBe(false);
      }
    }
  });

  it('never reports the same placement for both levels of one position', () => {
    // The two levels always straddle the entry. If they ever agreed, one of
    // them would be on the wrong side of the trade.
    for (const side of ['buy', 'sell'] as const) {
      expect(protectionPlacementFor(side, 'stop_loss')).not.toBe(
        protectionPlacementFor(side, 'take_profit'),
      );
    }
  });
});
