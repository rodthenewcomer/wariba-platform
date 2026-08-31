import { describe, expect, it } from 'vitest';
import {
  rejectionDetailFor,
  UNKNOWN_REJECTION_DETAIL,
  REJECTION_DETAIL,
} from '../app/(trade)/trade/trade-copy';

/**
 * Phase 3.4.4 §15/§68 — WariX must speak for every code the server can put on
 * a refused order.
 *
 * `packages/database/src/trading.ts` returns `v2Decision.reasonCode` directly,
 * so the V2 gate's canonical codes land on `app.trade_orders.rejection_code`
 * unchanged. None of them had a row in WariX's own table, which meant the two
 * refusals V2 produces most often reached the trader as "Cet ordre a été
 * refusé." with no reason and no remedy.
 */
describe('WariX rejection copy — the V2 gate codes', () => {
  /**
   * Written as literals, not imported from `@wariba/policies`: the web app
   * deliberately does not depend on that package, and over the wire these are
   * strings on `app.trade_orders.rejection_code`. Asserting on the literal is
   * asserting on what actually arrives.
   */
  const V2_CODES = [
    'GROSS_EXPOSURE_EXCEEDED',
    'MARGIN_CAP_EXCEEDED',
    'MARGIN_CAP_NOT_CALIBRATED',
    'EXPOSURE_CONVERSION_UNAVAILABLE',
    'NEWS_EXPOSURE_INCREASE_BLOCKED',
    'MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED',
    'NEWS_CALENDAR_SOURCE_UNAVAILABLE',
    'MARKET_SESSION_SOURCE_UNAVAILABLE',
    'DAILY_LOSS_SOFT_LOCKED',
    'MAXIMUM_LOSS_BREACHED',
  ] as const;

  it('gives every V2 gate code a real reason, not the generic fallback', () => {
    for (const code of V2_CODES) {
      const detail = rejectionDetailFor(code);
      expect(detail.reason, code).not.toBe(UNKNOWN_REJECTION_DETAIL.reason);
      expect(detail.reason.length, code).toBeGreaterThan(10);
      expect(detail.action.length, code).toBeGreaterThan(0);
    }
  });

  it('names the size for exposure and the size for margin, so the remedy differs', () => {
    expect(rejectionDetailFor('GROSS_EXPOSURE_EXCEEDED').reason).toMatch(/exposition/i);
    expect(rejectionDetailFor('GROSS_EXPOSURE_EXCEEDED').action).toMatch(/réduisez|fermez/i);
    expect(rejectionDetailFor('MARGIN_CAP_EXCEEDED').reason).toMatch(/marge/i);
  });

  /**
   * §16 — a refused order is not a verdict on the account. This is the copy
   * path a trader hits after resizing one order too large, and it must not
   * read as though their programme just ended.
   */
  it('never tells a trader their account is in breach because one order was refused', () => {
    for (const code of [
      'GROSS_EXPOSURE_EXCEEDED',
      'MARGIN_CAP_EXCEEDED',
      'NEWS_EXPOSURE_INCREASE_BLOCKED',
      'MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED',
    ]) {
      const detail = rejectionDetailFor(code);
      expect(`${detail.reason} ${detail.action}`, code).not.toMatch(
        /violation|en faute|compte perdu|compte terminé/i,
      );
    }
  });

  /**
   * §69 — reduce and close survive a pause. A trader inside a news window who
   * reads only "blocked" does not try the close they actually wanted.
   */
  it('says reduce and close remain possible during a news or session pause', () => {
    for (const code of [
      'NEWS_EXPOSURE_INCREASE_BLOCKED',
      'MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED',
    ]) {
      const detail = rejectionDetailFor(code);
      expect(`${detail.reason} ${detail.action}`, code).toMatch(/réduire|fermer|clôturer/i);
    }
  });
});

describe('WariX rejection copy — the local table still wins', () => {
  /**
   * The execution-specific codes describe this ticket, not the account's
   * policy. They must keep their own words rather than being flattened into
   * the canonical registry's account-level language.
   */
  it('keeps its own copy for the execution codes', () => {
    for (const code of ['invalid_quantity', 'stale_market_data', 'position_already_closed']) {
      expect(rejectionDetailFor(code)).toBe(REJECTION_DETAIL[code]);
    }
  });

  it('still falls back for a code nobody has mapped anywhere', () => {
    expect(rejectionDetailFor('some_unmapped_future_code')).toBe(UNKNOWN_REJECTION_DETAIL);
    expect(rejectionDetailFor(null)).toBe(UNKNOWN_REJECTION_DETAIL);
  });
});
