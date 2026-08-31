import { describe, expect, it } from 'vitest';
import { CANONICAL_REASON_CODES, LEGACY_REASON_CODE_ALIASES } from '@wariba/policies';
import {
  ALL_REASON_CODE_COPY,
  reasonCodeCopy,
  resolveReasonCodeCopy,
  UNKNOWN_REASON_COPY,
} from '../src/reason-code-copy';

describe('reason code copy — coverage', () => {
  /**
   * §68 — the registry is the contract. A code added to
   * packages/policies/src/reason-codes.ts with no words here would reach a
   * trader as the generic fallback, which is exactly the silent gap this test
   * closes at build time instead.
   */
  it('has words for every canonical code', () => {
    for (const code of Object.values(CANONICAL_REASON_CODES)) {
      const copy = reasonCodeCopy(code);
      expect(copy.title.length, code).toBeGreaterThan(0);
      expect(copy.body.length, code).toBeGreaterThan(0);
      expect(copy.supportCopy.length, code).toBeGreaterThan(0);
    }
    expect(ALL_REASON_CODE_COPY).toHaveLength(Object.values(CANONICAL_REASON_CODES).length);
  });

  /**
   * §55 — support must not improvise a financial explanation. The persisted
   * legacy vocabularies still arrive from evidence rows, so each has to
   * resolve rather than fall through to the generic message.
   */
  it('resolves every persisted legacy code to words', () => {
    for (const legacy of Object.keys(LEGACY_REASON_CODE_ALIASES)) {
      expect(resolveReasonCodeCopy(legacy), legacy).not.toBeNull();
    }
  });

  it('refuses to invent copy for a code nobody mapped', () => {
    expect(resolveReasonCodeCopy('SOME_FUTURE_CODE')).toBeNull();
  });
});

describe('reason code copy — §16, a refusal is not a breach', () => {
  const BREACH_WORDS = /violation|en faute|compte perdu|perdu|sanction|infraction/i;

  /**
   * The rule with teeth. Margin, exposure, news and market-closure refusals
   * decline one order; they say nothing about the account. Rendering any of
   * them with breach language turns a resized order into a trader believing
   * their account is over.
   */
  it('never uses breach language below terminal severity', () => {
    for (const copy of ALL_REASON_CODE_COPY) {
      if (copy.severity === 'terminal') continue;
      expect(copy.title, copy.code).not.toMatch(BREACH_WORDS);
      expect(copy.body, copy.code).not.toMatch(BREACH_WORDS);
    }
  });

  it('classifies the four pre-trade refusals as refusals, not verdicts', () => {
    for (const code of [
      'MARGIN_CAP_EXCEEDED',
      'GROSS_EXPOSURE_EXCEEDED',
      'EXPOSURE_CONVERSION_UNAVAILABLE',
      'MARGIN_CAP_NOT_CALIBRATED',
    ] as const) {
      expect(reasonCodeCopy(code).severity, code).toBe('refusal');
    }
  });

  it('classifies news and market closure as pauses that lift on their own', () => {
    expect(reasonCodeCopy('NEWS_EXPOSURE_INCREASE_BLOCKED').severity).toBe('pause');
    expect(reasonCodeCopy('MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED').severity).toBe('pause');
  });

  it('reserves terminal severity for the two codes that actually end an account', () => {
    const terminal = ALL_REASON_CODE_COPY.filter((copy) => copy.severity === 'terminal').map(
      (copy) => copy.code,
    );
    expect(terminal.sort()).toEqual(
      ['ACCOUNT_BREACHED', 'FLEX_ACTIVATION_EXPIRED', 'MAXIMUM_LOSS_BREACHED'].sort(),
    );
  });

  /**
   * §69 — reduce and close stay available while an increase is refused. The
   * copy has to say so, otherwise a trader in a news window reads "blocked"
   * and does not try to close the position they wanted to close.
   */
  it('tells a trader they can still reduce or close during every pause', () => {
    for (const copy of ALL_REASON_CODE_COPY.filter((item) => item.severity === 'pause')) {
      const text = `${copy.body} ${copy.remedy ?? ''}`;
      if (copy.code === 'DAILY_RESET_COMPLETED') continue;
      expect(text, copy.code).toMatch(/réduire|fermer|clôturer|reprendre/i);
    }
  });

  it('gives every refusal something the trader can do about it', () => {
    for (const copy of ALL_REASON_CODE_COPY.filter((item) => item.severity === 'refusal')) {
      expect(copy.remedy, copy.code).not.toBeNull();
    }
  });
});

describe('reason code copy — the unknown fallback', () => {
  it('is a refusal and points at support with a reference', () => {
    expect(UNKNOWN_REASON_COPY.severity).toBe('refusal');
    expect(UNKNOWN_REASON_COPY.remedy).toMatch(/support/i);
    expect(UNKNOWN_REASON_COPY.title).not.toMatch(/violation|perdu/i);
  });
});

describe('reason code copy — trader vocabulary', () => {
  /**
   * §4/§93 — the trader-facing half must not leak the platform's own words.
   * `supportCopy` is deliberately exempt: an operator reading a dispute needs
   * the precise term, and that is the whole reason the two strings are
   * separate fields.
   */
  it('keeps internal terms out of the trader-facing strings', () => {
    const forbidden =
      /gross notional|eligible_pnl|policy_version|DLL\b|MLL\b|EOD HWM|reason code|soft lock|hard breach/i;
    for (const copy of ALL_REASON_CODE_COPY) {
      expect(copy.title, copy.code).not.toMatch(forbidden);
      expect(copy.body, copy.code).not.toMatch(forbidden);
      expect(copy.remedy ?? '', copy.code).not.toMatch(forbidden);
    }
  });

  /**
   * §58 — no rail may be named until its capability is actually enabled.
   * A promise in a payout string is the cheapest one to make and the most
   * expensive to withdraw.
   */
  it('names no payment provider anywhere', () => {
    for (const copy of ALL_REASON_CODE_COPY) {
      expect(`${copy.title}${copy.body}${copy.remedy ?? ''}`, copy.code).not.toMatch(
        /wave|orange money|mtn|paydunya|cinetpay/i,
      );
    }
  });
});
