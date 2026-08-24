import { COMMENCER_ARTICLES } from './commencer';
import { COMPTE_ARTICLES } from './compte-securite';
import { IDENTITE_ARTICLES } from './identite';
import { PAIEMENTS_ARTICLES } from './paiements';
import { PAYOUTS_ARTICLES } from './payouts';
import { PERFORMANCE_ARTICLES } from './performance';
import { RISQUE_ARTICLES } from './risque-regles';
import { SUPPORT_ARTICLES } from './support';
import { TECHNIQUE_ARTICLES } from './technique';
import { WARIBA_ONE_ARTICLES } from './wariba-one';
import { WARIX_ARTICLES } from './warix';
import {
  HELP_CATEGORIES,
  helpArticleSchema,
  type HelpArticle,
  type HelpCategoryId,
  type HelpStatus,
} from './types';

export * from './types';

/**
 * The Help Center registry.
 *
 * ## Repository-backed, deliberately
 *
 * `HELP_ARTICLE_DATABASE = deferred`. There is no `help_articles` table and no
 * CMS, because a private beta is not blocked on editing help without a deploy —
 * it was blocked on the help existing at all. What the registry does provide is
 * everything a table would have been bought for except late editing: typed
 * fields, validation, a unique-slug guarantee, resolvable cross-references and
 * a search index.
 *
 * ## Drafts live here and are never served
 *
 * An article whose decision is still open is written, kept, and marked. That
 * is a stronger position than omitting it: `publishedArticles()` filters by
 * status, and a test asserts the filter holds — so "no unpublished policy is
 * on the site" is a checked property rather than an editorial habit.
 */
const ALL_ARTICLES: readonly HelpArticle[] = [
  ...COMMENCER_ARTICLES,
  ...WARIBA_ONE_ARTICLES,
  ...RISQUE_ARTICLES,
  ...WARIX_ARTICLES,
  ...PERFORMANCE_ARTICLES,
  ...PAYOUTS_ARTICLES,
  ...PAIEMENTS_ARTICLES,
  ...IDENTITE_ARTICLES,
  ...COMPTE_ARTICLES,
  ...TECHNIQUE_ARTICLES,
  ...SUPPORT_ARTICLES,
];

export interface RegistryProblem {
  articleId: string;
  problem: string;
}

/**
 * Validates the whole registry and returns every problem found.
 *
 * Returns rather than throws, so the test can report all of them at once. A
 * validator that throws on the first failure turns a content review into a
 * dozen sequential runs.
 */
export function validateHelpRegistry(): readonly RegistryProblem[] {
  const problems: RegistryProblem[] = [];
  const slugs = new Set<string>();
  const ids = new Set<string>();

  for (const article of ALL_ARTICLES) {
    const parsed = helpArticleSchema.safeParse(article);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push({
          articleId: article.id ?? '(sans id)',
          problem: `${issue.path.join('.')}: ${issue.message}`,
        });
      }
      continue;
    }

    if (ids.has(article.id)) {
      problems.push({ articleId: article.id, problem: 'identifiant dupliqué' });
    }
    ids.add(article.id);

    if (slugs.has(article.slug)) {
      problems.push({ articleId: article.id, problem: `slug dupliqué: ${article.slug}` });
    }
    slugs.add(article.slug);

    const isDraft = article.status === 'draft_policy' || article.status === 'draft_provider';
    if (isDraft && !article.blockedBy) {
      problems.push({
        articleId: article.id,
        problem: 'un brouillon doit nommer la décision qui le débloque (blockedBy)',
      });
    }
    if (!isDraft && article.blockedBy) {
      problems.push({
        articleId: article.id,
        problem: 'blockedBy n’a de sens que sur un brouillon',
      });
    }
  }

  // Cross-references resolve. A "related" link to a slug that does not exist
  // renders as a dead end for a trader already looking for help.
  for (const article of ALL_ARTICLES) {
    for (const slug of article.related ?? []) {
      if (!slugs.has(slug)) {
        problems.push({ articleId: article.id, problem: `lien connexe introuvable: ${slug}` });
      }
      if (slug === article.slug) {
        problems.push({ articleId: article.id, problem: 'un article ne se lie pas à lui-même' });
      }
    }
  }

  const pinned = ALL_ARTICLES.filter((article) => article.pinned);
  if (pinned.length !== 1) {
    problems.push({
      articleId: '(registre)',
      problem: `exactement un article épinglé attendu, ${pinned.length} trouvés`,
    });
  }

  return problems;
}

/** Every article, drafts included. For tests and reporting only. */
export function allHelpArticles(): readonly HelpArticle[] {
  return ALL_ARTICLES;
}

const PUBLISHED_STATUSES: readonly HelpStatus[] = ['publish', 'dynamic'];

/** What the site is allowed to render. The only list any page should use. */
export function publishedArticles(): readonly HelpArticle[] {
  return ALL_ARTICLES.filter((article) => PUBLISHED_STATUSES.includes(article.status));
}

export function publishedArticleBySlug(slug: string): HelpArticle | null {
  return publishedArticles().find((article) => article.slug === slug) ?? null;
}

export function publishedArticleById(id: string): HelpArticle | null {
  return publishedArticles().find((article) => article.id === id) ?? null;
}

export function publishedArticlesInCategory(category: HelpCategoryId): readonly HelpArticle[] {
  return publishedArticles().filter((article) => article.category === category);
}

/** The single article shown above the categories on `/aide`. */
export function pinnedArticle(): HelpArticle | null {
  return publishedArticles().find((article) => article.pinned) ?? null;
}

export interface HelpCategorySummary {
  id: HelpCategoryId;
  title: string;
  description: string;
  articleCount: number;
  href: string;
}

export function helpCategorySummaries(): readonly HelpCategorySummary[] {
  return HELP_CATEGORIES.map((category) => ({
    ...category,
    articleCount: publishedArticlesInCategory(category.id).length,
    href: `/aide/${category.id}`,
  })).filter((category) => category.articleCount > 0);
}

export function helpArticleHref(article: HelpArticle): string {
  return `/aide/${article.category}/${article.slug}`;
}

/**
 * Accent-insensitive normalisation.
 *
 * A trader searching « perte quotidienne » on a phone keyboard types
 * « perte quotidienne » with or without the accents, and « éligible » is
 * unfindable if the index keeps its é. Unicode NFD then stripping combining
 * marks handles the whole French set without a hand-written table.
 */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr');
}

function searchableText(article: HelpArticle): string {
  const blockText = article.body
    .map((block) => {
      switch (block.kind) {
        case 'paragraph':
        case 'heading':
          return block.text;
        case 'list':
          return block.items.join(' ');
        case 'table':
          return [block.caption ?? '', ...block.columns, ...block.rows.flat()].join(' ');
        case 'ruleTable':
          return block.caption ?? '';
        case 'formula':
          return `${block.expression} ${block.caption ?? ''}`;
        case 'example':
          return [block.title, ...block.lines, block.conclusion ?? ''].join(' ');
        case 'callout':
          return `${block.title} ${block.text}`;
      }
    })
    .join(' ');

  return normalize([article.title, article.summary, ...article.searchAliases, blockText].join(' '));
}

export interface HelpSearchResult {
  article: HelpArticle;
  /** Higher is better. Title and alias hits outrank a body mention. */
  score: number;
}

/**
 * The one search both `/aide` and the Trader Hub's Support home use.
 *
 * Ranked rather than merely filtered, because a term like « payout » appears
 * in a dozen articles and the one *about* payouts should not be seventh. The
 * ranking is deliberately simple — a title match beats an alias match beats a
 * summary match beats a body mention — and makes no claim to relevance it
 * cannot justify. There is no fuzzy matching and no external search service.
 */
export function searchHelpArticles(query: string, limit = 8): readonly HelpSearchResult[] {
  const needle = normalize(query.trim());
  if (needle.length < 2) return [];

  const results: HelpSearchResult[] = [];
  for (const article of publishedArticles()) {
    const title = normalize(article.title);
    const aliases = article.searchAliases.map(normalize);
    const summary = normalize(article.summary);
    const body = searchableText(article);

    let score = 0;
    if (title.includes(needle)) score += 100;
    if (aliases.some((alias) => alias === needle)) score += 80;
    else if (aliases.some((alias) => alias.includes(needle))) score += 50;
    if (summary.includes(needle)) score += 25;
    if (body.includes(needle)) score += 10;

    if (score > 0) results.push({ article, score });
  }

  return results
    .sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id))
    .slice(0, limit);
}

/** Resolves an article's `related` slugs to the articles that are published. */
export function relatedArticles(article: HelpArticle): readonly HelpArticle[] {
  return article.related
    .map((slug) => publishedArticleBySlug(slug))
    .filter((candidate): candidate is HelpArticle => candidate !== null);
}

export interface HelpRegistryCounts {
  publish: number;
  dynamic: number;
  draftPolicy: number;
  draftProvider: number;
  total: number;
}

/** For the delivery report — counted from the registry, never by hand. */
export function helpRegistryCounts(): HelpRegistryCounts {
  const by = (status: HelpStatus) => ALL_ARTICLES.filter((a) => a.status === status).length;
  return {
    publish: by('publish'),
    dynamic: by('dynamic'),
    draftPolicy: by('draft_policy'),
    draftProvider: by('draft_provider'),
    total: ALL_ARTICLES.length,
  };
}
