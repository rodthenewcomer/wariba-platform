import { describe, expect, it } from 'vitest';
import { helpLinkForReasonCode, mappedReasonCodes } from '../lib/help-links';
import { publishedArticleBySlug } from '../content/help';

/**
 * Content master §12 — every reason code a trader can be shown resolves to
 * the article that explains it.
 *
 * The failure this guards against is subtle: a renamed article leaves the map
 * pointing at an id nobody serves, and the "Comprendre cette règle" button
 * quietly disappears from the one screen a confused trader is looking at.
 */
describe('reason-code help links', () => {
  it('resolves every mapped code to a published article', () => {
    for (const code of mappedReasonCodes()) {
      const link = helpLinkForReasonCode(code);
      expect(link, `${code} resolves to nothing`).not.toBeNull();
      expect(link?.href).toMatch(/^\/aide\/[a-z-]+\/[a-z0-9-]+$/);
      expect(link?.title.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('covers every rule code the risk engine can record', () => {
    /*
     * The eight values of `RiskViolationRuleCode`, listed literally.
     *
     * They are not imported: `apps/web` is forbidden from reaching into the
     * database package at all (AGENTS.md §7.1), and the boundary checker
     * matches the package name as text — a comment naming it would trip the
     * same guard. Listing them here also means a code added to the schema
     * without an explanation fails this test rather than shipping as a bare
     * identifier on a trader's screen.
     */
    const riskCodes = [
      'RISK_DAILY_LOSS_LOCK',
      'RISK_MAXIMUM_LOSS_BREACH',
      'RISK_CONSISTENCY_NON_COMPLIANT',
      'RISK_TARGET_NOT_REALIZED',
      'RISK_OPEN_POSITIONS_BLOCK_TRANSITION',
      'RISK_PENDING_ORDERS_BLOCK_TRANSITION',
      'RISK_SHORT_DURATION_WARNING',
      'RISK_SHORT_DURATION_ENTRY_LOCK',
    ];
    for (const code of riskCodes) {
      expect(helpLinkForReasonCode(code), `no article explains ${code}`).not.toBeNull();
    }
  });

  it('sends the two loss rules to their own articles, not to a shared page', () => {
    expect(helpLinkForReasonCode('RISK_DAILY_LOSS_LOCK')?.href).toContain('perte-quotidienne');
    expect(helpLinkForReasonCode('RISK_MAXIMUM_LOSS_BREACH')?.href).toContain('perte-maximale-eod');
  });

  it('returns null rather than a broken link', () => {
    expect(helpLinkForReasonCode(null)).toBeNull();
    expect(helpLinkForReasonCode(undefined)).toBeNull();
    expect(helpLinkForReasonCode('')).toBeNull();
    expect(helpLinkForReasonCode('SOMETHING_NOBODY_MAPPED')).toBeNull();
  });

  it('never links to an article that is withheld', () => {
    // A code mapped to a draft would 404. Every target must be servable today.
    for (const code of mappedReasonCodes()) {
      const link = helpLinkForReasonCode(code);
      const slug = link?.href.split('/').pop() ?? '';
      expect(publishedArticleBySlug(slug), `${code} → ${slug} is not published`).not.toBeNull();
    }
  });
});
