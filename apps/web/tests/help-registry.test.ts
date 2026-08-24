import { describe, expect, it } from 'vitest';
import {
  allHelpArticles,
  helpArticleHref,
  helpCategorySummaries,
  helpRegistryCounts,
  pinnedArticle,
  publishedArticleBySlug,
  publishedArticles,
  relatedArticles,
  searchHelpArticles,
  validateHelpRegistry,
  HELP_CATEGORY_IDS,
} from '../content/help';

/**
 * The Help Center's content QA, from §16 of the content master.
 *
 * These are content assertions, not rendering ones. Each maps to a way the
 * Help Center could tell a trader something untrue: a stale rule, a promise
 * WARIBA has not made, a hidden policy accidentally published, or a link into
 * nothing. Every one is checked against the registry rather than against a
 * reviewer's memory.
 */
describe('help registry integrity', () => {
  it('validates every article against the schema, with no duplicates or dead links', () => {
    const problems = validateHelpRegistry();
    expect(problems, problems.map((p) => `${p.articleId}: ${p.problem}`).join('\n')).toHaveLength(
      0,
    );
  });

  it('publishes only articles whose decisions are closed', () => {
    for (const article of publishedArticles()) {
      expect(article.status, `${article.id} (${article.slug}) must not be served`).not.toMatch(
        /^draft_/,
      );
      expect(article.blockedBy, `${article.id} is published and cannot be blocked`).toBeUndefined();
    }
  });

  it('keeps every blocked article written, hidden, and attributed to a decision', () => {
    const drafts = allHelpArticles().filter((article) => article.status.startsWith('draft_'));
    // Hidden, not missing. An article nobody wrote is an absence no test can
    // see; an article written and withheld is a decision anyone can audit.
    expect(drafts.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      expect(draft.blockedBy, `${draft.id} must name what blocks it`).toBeTruthy();
      expect(publishedArticleBySlug(draft.slug)).toBeNull();
    }
  });

  it('has exactly one pinned article, and it is the essential-rules page', () => {
    const pinned = pinnedArticle();
    expect(pinned?.slug).toBe('regles-essentielles');
  });

  it('gives every category that appears on the home at least one published article', () => {
    for (const summary of helpCategorySummaries()) {
      expect(summary.articleCount).toBeGreaterThan(0);
      expect(HELP_CATEGORY_IDS).toContain(summary.id);
    }
  });

  it('resolves every related link to a published article', () => {
    for (const article of publishedArticles()) {
      const resolved = relatedArticles(article);
      // A related list that silently shrinks because a target is a draft is
      // acceptable; one that points at a slug nobody wrote is not — and that
      // case is caught by validateHelpRegistry above.
      for (const target of resolved) {
        expect(publishedArticleBySlug(target.slug)).not.toBeNull();
      }
    }
  });

  it('builds a href inside /aide for every published article', () => {
    for (const article of publishedArticles()) {
      expect(helpArticleHref(article)).toBe(`/aide/${article.category}/${article.slug}`);
    }
  });
});

describe('help content truth', () => {
  const publishedText = publishedArticles()
    .map((article) =>
      [article.title, article.summary, ...article.body.map((block) => JSON.stringify(block))].join(
        ' ',
      ),
    )
    .join('\n')
    .toLocaleLowerCase('fr');

  it('names no competitor', () => {
    // §16.15. The content master benchmarked four competitors; not one of
    // their names, product names or article titles may appear in WARIBA's own
    // help, and neither may their rules.
    for (const name of ['ftmo', 'lucid', 'tradeify', 'for traders', 'fortraders', 'tradovate']) {
      expect(publishedText, `competitor mention: ${name}`).not.toContain(name);
    }
  });

  it('promises no real capital, live account or guaranteed allocation', () => {
    /*
     * Promise-shaped phrases only.
     *
     * « allocation automatique de capital réel » does appear in the registry —
     * inside the sentence that denies it. Banning the substring would have
     * banned WARIBA's own disclaimer, which is the opposite of what this test
     * protects. So the list holds phrases that cannot be read as a denial, and
     * the disclaimers get their own assertion below.
     */
    for (const claim of [
      'capital réel garanti',
      'compte live garanti',
      'compte financé réel',
      'capital vous est confié',
      'payout garanti',
      'gains garantis',
    ]) {
      expect(publishedText, `unsupported claim: ${claim}`).not.toContain(
        claim.toLocaleLowerCase('fr'),
      );
    }
  });

  it('carries the disclaimers that make the simulation explicit', () => {
    expect(publishedText).toContain('ni d\u2019une allocation automatique de capital réel');
    expect(publishedText).toContain('ne garantit pas une allocation de capital réel');
  });

  it('never describes the Best Day Rule as a breach', () => {
    const bestDay = publishedArticleBySlug('meilleur-jour');
    expect(bestDay).not.toBeNull();
    const text = JSON.stringify(bestDay?.body).toLocaleLowerCase('fr');
    expect(text).toContain('ne termine jamais le compte');
    expect(bestDay?.severity).toBe('pass_condition');
  });

  it('classifies the daily loss as a soft lock and the maximum loss as terminal', () => {
    expect(publishedArticleBySlug('perte-quotidienne')?.severity).toBe('soft_lock');
    expect(publishedArticleBySlug('perte-maximale-eod')?.severity).toBe('hard_breach');
  });

  it('states no live rule percentage in prose — only policy-bound blocks may carry one', () => {
    /*
     * §11.3, enforced.
     *
     * A percentage typed into a paragraph is a value that keeps being right
     * until the published policy changes, and then keeps being displayed. Live
     * rule values come from `ruleTable` blocks and `{{fact:…}}` tokens, both of
     * which read the policy. `example` blocks are exempt — the renderer labels
     * them as illustrations and they say so in their own words.
     */
    for (const article of publishedArticles()) {
      for (const block of article.body) {
        if (block.kind === 'example' || block.kind === 'ruleTable') continue;
        const text =
          block.kind === 'paragraph' || block.kind === 'heading'
            ? block.text
            : block.kind === 'callout'
              ? `${block.title} ${block.text}`
              : block.kind === 'list'
                ? block.items.join(' ')
                : '';
        expect(
          text,
          `${article.id} states a percentage outside a policy-bound block: "${text}"`,
        ).not.toMatch(/\d+([.,]\d+)?\s*%/);
      }
    }
  });

  it('carries no stale rule set from an earlier programme', () => {
    // §16.1 — the 8/4/8/40 shape belonged to a superseded ruleset.
    for (const stale of ['8 %', '4 %', '40 %', '8%', '4%', '40%']) {
      expect(publishedText, `stale rule value: ${stale}`).not.toContain(stale);
    }
  });

  it('publishes no payment or KYC provider name', () => {
    // §16.6 — no rail is announced before the provider confirms it.
    for (const provider of ['orange money', 'mtn', 'moov', 'wave', 'visa', 'mastercard']) {
      expect(publishedText, `unconfirmed provider: ${provider}`).not.toContain(provider);
    }
  });

  it('publishes no support, KYC or payout delay', () => {
    // §16.14 — OPS-012 (support SLA) is OPEN and nothing else is measured.
    expect(publishedText).not.toMatch(/sous \d+ ?(h|heures|jours)/);
    expect(publishedText).not.toMatch(/délai de \d+/);
    expect(publishedText).not.toMatch(/\d+ ?(h|heures) ouvr/);
  });

  it('says explicitly that Performance is simulated', () => {
    const performance = publishedArticleBySlug('compte-performance');
    expect(JSON.stringify(performance?.body)).toContain('simulé');
  });

  it('keeps losses counted when a short-duration profit is not', () => {
    const article = publishedArticleBySlug('profit-court-terme');
    expect(JSON.stringify(article?.body)).toContain('Les pertes');
  });
});

describe('help search', () => {
  it('ignores a query too short to mean anything', () => {
    expect(searchHelpArticles('')).toHaveLength(0);
    expect(searchHelpArticles('a')).toHaveLength(0);
  });

  it('ranks the article about a subject above articles that merely mention it', () => {
    const results = searchHelpArticles('perte quotidienne');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.article.slug).toBe('perte-quotidienne');
  });

  it('finds an article by its acronym', () => {
    expect(searchHelpArticles('DLL')[0]?.article.slug).toBe('perte-quotidienne');
    expect(searchHelpArticles('MLL')[0]?.article.slug).toBe('perte-maximale-eod');
  });

  it('is accent-insensitive in both directions', () => {
    const withAccent = searchHelpArticles('éligible');
    const without = searchHelpArticles('eligible');
    expect(withAccent.length).toBeGreaterThan(0);
    expect(without.map((r) => r.article.slug)).toEqual(withAccent.map((r) => r.article.slug));
  });

  it('never returns an unpublished article', () => {
    for (const term of ['reset', 'remboursement', 'vpn', 'mobile money', 'documents']) {
      for (const result of searchHelpArticles(term, 20)) {
        expect(result.article.status, `${term} surfaced ${result.article.id}`).not.toMatch(
          /^draft_/,
        );
      }
    }
  });

  it('returns nothing rather than something irrelevant', () => {
    expect(searchHelpArticles('zzzzzzz')).toHaveLength(0);
  });
});

describe('registry counts', () => {
  it('reports the published and withheld totals the delivery note quotes', () => {
    const counts = helpRegistryCounts();
    expect(counts.total).toBe(allHelpArticles().length);
    expect(counts.publish + counts.dynamic).toBe(publishedArticles().length);
    expect(counts.draftPolicy + counts.draftProvider).toBe(
      allHelpArticles().length - publishedArticles().length,
    );
  });
});

/**
 * §17 — la recherche doit comprendre ce qu'un trader francophone tape
 * réellement, y compris l'anglais professionnel qu'il utilise tous les jours.
 *
 * Les alias alimentent l'index sans jamais s'afficher : un article n'a pas à
 * porter dix synonymes à l'écran pour être trouvable.
 */
describe('help search vocabulary', () => {
  const EXPECTED: readonly [string, string][] = [
    ['daily loss', 'perte-quotidienne'],
    ['daily drawdown', 'perte-quotidienne'],
    ['perte journaliere', 'perte-quotidienne'],
    ['max loss', 'perte-maximale-eod'],
    ['drawdown', 'perte-maximale-eod'],
    ['retrait', 'eligibilite-payout'],
    ['withdraw', 'eligibilite-payout'],
    ['best day', 'meilleur-jour'],
    ['stop loss', 'stop-loss-take-profit'],
    ['take profit', 'stop-loss-take-profit'],
    ['buy limit', 'ordres-en-attente'],
    ['sell stop', 'ordres-en-attente'],
    ['kyc', 'pourquoi-verification-identite'],
    ['scalping', 'profit-court-terme'],
  ];

  it('finds the right article for the words traders actually type', () => {
    for (const [term, slug] of EXPECTED) {
      const results = searchHelpArticles(term, 5);
      expect(results.length, `"${term}" returns nothing`).toBeGreaterThan(0);
      expect(
        results.map((r) => r.article.slug),
        `"${term}" should reach ${slug}`,
      ).toContain(slug);
    }
  });

  it('keeps English trader vocabulary out of the visible copy', () => {
    // Buy / Sell / Stop Loss / Take Profit / WariX / payout are legitimate and
    // stay. What must not surface is an alias like "withdraw" or "drawdown"
    // pasted into a title just to be findable.
    for (const article of publishedArticles()) {
      for (const banned of ['withdraw', 'drawdown', 'daily loss', 'max loss']) {
        expect(
          article.title.toLocaleLowerCase('fr'),
          `${article.id} puts a search alias in its title`,
        ).not.toContain(banned);
      }
    }
  });
});
