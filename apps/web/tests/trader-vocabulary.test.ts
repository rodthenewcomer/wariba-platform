import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYOUT_REJECTION_DETAIL } from '../lib/payout-copy';

/**
 * Phase 3.4.4 §4/§36/§93 — the words the product uses in front of a trader.
 *
 * ## Why this reads files
 *
 * The strings under test are literals inside server components, which cannot
 * be rendered in a unit test without a database. Reading the source is the
 * cheap version of the same guarantee: it catches a reintroduced term at the
 * moment it is typed, which is the only moment it is free to fix.
 *
 * ## What is deliberately not covered
 *
 * The Help Center. §4 permits the deeper term in help content, and the help
 * visuals carry image baselines that a text-only change would invalidate
 * without making anything clearer for a trader.
 */
const PRODUCT_SURFACES = [
  'app/(platform)/payouts/page.tsx',
  'app/(platform)/payouts/PayoutStatus.tsx',
  'app/(platform)/payouts/PayoutCenterPanel.tsx',
  'app/(platform)/comptes/[publicId]/PerformanceHandoff.tsx',
  'app/(platform)/comptes/[publicId]/regles/page.tsx',
  'app/(platform)/comptes/AccountCard.tsx',
  'lib/payout-copy.ts',
];

function read(relative: string): string {
  return readFileSync(resolve(__dirname, '..', relative), 'utf8');
}

/**
 * Only the parts a trader can read. Doc comments explain the code to whoever
 * maintains it, and "buffer" is the right word there — the database column is
 * called `permanent_buffer_rate`, and pretending otherwise in a comment would
 * make the code harder to follow, not the product clearer.
 */
function traderFacingText(source: string): string {
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/data-testid="[^"]*"/g, '')
      /*
       * Code identifiers, not prose.
       *
       * The column really is `permanent_buffer_rate` and the persisted
       * rejection code really is `buffer_not_reached` — that string is written
       * into `app.payout_requests.rejection_code` and renaming it would
       * rewrite history to make a label test pass. Renaming the fields to
       * match the label would only move the mismatch somewhere less visible.
       */
      .replace(/\bbuffer[._][A-Za-z]\w*/g, '')
      .replace(/\bbuffer[A-Z]\w*/g, '')
      .replace(/\b\w+\.buffer(?:[A-Z]\w*)?/g, '')
      .replace(/\bconst buffer\b|computeBufferBuildProgress|performance-buffer/g, '')
  );
}

describe('trader vocabulary — the reserve (§36)', () => {
  it('calls it a reserve, never a buffer, on every product surface', () => {
    for (const relative of PRODUCT_SURFACES) {
      expect(traderFacingText(read(relative)), relative).not.toMatch(/buffer/i);
    }
  });

  it('says "réserve" somewhere on the payout surfaces, so the concept did not just disappear', () => {
    const payoutCopy = [
      read('app/(platform)/payouts/page.tsx'),
      read('app/(platform)/payouts/PayoutStatus.tsx'),
    ].join('\n');
    expect(payoutCopy).toMatch(/réserve/i);
  });
});

describe('trader vocabulary — Performance Days (§32)', () => {
  it('writes the French "journées Performance", not the English label', () => {
    for (const relative of PRODUCT_SURFACES) {
      expect(traderFacingText(read(relative)), relative).not.toMatch(/Performance Days/);
    }
  });
});

describe('no financial rule is hardcoded in the browser (§6/§89)', () => {
  /**
   * `consistency_non_compliant` used to read "dépasse 50 % du profit positif
   * total". 50 % is WARIBA ONE V1's best-day ratio; V2 uses 35 %, and INSTANT
   * 30 %. The browser cannot know which applies — that belongs to the policy
   * pinned to the account — so the sentence names the rule and leaves the
   * figure to the server.
   */
  it('quotes no rule percentage in the payout rejection copy', () => {
    for (const [code, sentence] of Object.entries(PAYOUT_REJECTION_DETAIL)) {
      expect(sentence, code).not.toMatch(/\d+\s*%/);
    }
  });

  it('still explains the best-day rejection without its number', () => {
    expect(PAYOUT_REJECTION_DETAIL.consistency_non_compliant).toMatch(/meilleure journée/i);
    expect(PAYOUT_REJECTION_DETAIL.consistency_non_compliant).toMatch(/limite/i);
  });
});

describe('no rule percentage is written into an authenticated page (§6/§89)', () => {
  /**
   * The Hub hero showed every Evaluation account `85 % → 90 %`, written as a
   * literal. That is WARIBA ONE V1's payout schedule; V2 pays 80 % on the
   * first two cycles. The number was wrong for every V2 account, and wrong in
   * the flattering direction, on the screen a trader reads before deciding
   * whether to keep going.
   *
   * Scoped to authenticated surfaces. The public pages carry V1 figures too
   * (`(public)/page.tsx`, `(public)/programme/page.tsx`), and Phase 3.4.4 §84
   * puts them out of scope — they are a documented open contradiction for
   * Phase 3.4.5, not something to fix here.
   */
  const AUTHENTICATED_PAGES = [
    'app/(platform)/hub/page.tsx',
    'app/(platform)/payouts/page.tsx',
    'app/(platform)/payouts/PayoutStatus.tsx',
    'app/(platform)/payouts/PayoutCenterPanel.tsx',
    'app/(platform)/comptes/AccountCard.tsx',
    'app/(platform)/comptes/[publicId]/regles/page.tsx',
  ];

  it('writes no literal rule percentage a policy should have supplied', () => {
    for (const relative of AUTHENTICATED_PAGES) {
      const source = read(relative)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      // Percent literals inside a quoted string — but a colour or a length is
      // not a claim about anyone's money, so CSS values are dropped first.
      const CSS =
        /color-mix|calc\(|rgba?\(|hsla?\(|linear-gradient|translate|width|height|flex-basis|var\(--/;
      const claims = (source.match(/['"`][^'"`]*\d{1,3}\s*%[^'"`]*['"`]/g) ?? []).filter(
        (candidate) => !CSS.test(candidate),
      );
      expect(claims, `${relative} still states a rule percentage`).toEqual([]);
    }
  });
});
