import { helpArticleHref, publishedArticleById } from '../content/help';

/**
 * From a reason code to the article that explains it.
 *
 * ## Why this exists
 *
 * §12 of the content master. When the risk engine refuses an order or a
 * violation is recorded, the surface showing it has two bad options and one
 * good one. It can print the code and leave the trader to search; it can write
 * its own local explanation, which is the fifth place a rule now lives and
 * drifts; or it can link to the one article that owns the subject. This map is
 * the third.
 *
 * ## Codes, not slugs, at the call site
 *
 * Callers pass the code the engine actually emitted — `RISK_DAILY_LOSS_LOCK`,
 * not `perte-quotidienne`. That keeps the mapping in one file, so renaming an
 * article is a one-line change rather than a search across risk surfaces, and
 * a code with no article resolves to `null` rather than to a broken link.
 */
const REASON_CODE_ARTICLES: Record<string, string> = {
  // Risk — the codes app.risk_violations actually carries.
  RISK_DAILY_LOSS_LOCK: 'HLP-012',
  RISK_MAXIMUM_LOSS_BREACH: 'HLP-013',
  RISK_CONSISTENCY_NON_COMPLIANT: 'HLP-014',
  RISK_TARGET_NOT_REALIZED: 'HLP-011',
  RISK_SHORT_DURATION_WARNING: 'HLP-015',
  RISK_SHORT_DURATION_ENTRY_LOCK: 'HLP-015',
  RISK_OPEN_POSITIONS_BLOCK_TRANSITION: 'HLP-021',
  RISK_PENDING_ORDERS_BLOCK_TRANSITION: 'HLP-021',

  // Execution and market data.
  MARKET_DATA_STALE: 'HLP-037',
  OFFLINE: 'HLP-056',
  ORDER_REJECTED: 'HLP-036',

  // Payout.
  PAYOUT_NOT_READY: 'HLP-070',
  PAYOUT_ALREADY_OPEN: 'HLP-072',
  PAYOUT_FAILED: 'HLP-074',

  // Identity.
  KYC_ACTION_REQUIRED: 'HLP-094',
  KYC_REQUIRED: 'HLP-091',

  // Commerce.
  PAYMENT_STATUS_UNKNOWN: 'HLP-082',
  PAYMENT_FAILED: 'HLP-083',
  ACCOUNT_ACTIVATION_DELAYED: 'HLP-113',
  PASS_REVIEW_DELAYED: 'HLP-021',
};

export interface HelpLink {
  href: string;
  title: string;
}

/**
 * Resolves a reason code to a published article.
 *
 * Returns `null` for an unmapped code *and* for a code whose article is
 * currently withheld — a link to a draft would 404, and a surface asking for
 * help on an error is the worst place to send someone into a dead end.
 */
export function helpLinkForReasonCode(code: string | null | undefined): HelpLink | null {
  if (!code) return null;
  const articleId = REASON_CODE_ARTICLES[code];
  if (!articleId) return null;
  const article = publishedArticleById(articleId);
  if (!article) return null;
  return { href: helpArticleHref(article), title: article.title };
}

/** Every code that has an explanation. For the coverage test. */
export function mappedReasonCodes(): readonly string[] {
  return Object.keys(REASON_CODE_ARTICLES);
}
