import Link from 'next/link';
import { buttonClassNames } from '@wariba/ui';
import {
  HELP_AUDIENCE_LABELS,
  HELP_SEVERITY_LABELS,
  helpArticleHref,
  type HelpArticle,
  type HelpCategorySummary,
} from '../../content/help';

/**
 * The Help Center's smaller parts: badges, cards, related links and the two
 * calls to action an article can end on.
 *
 * All of them are server components. Nothing here needs state, and keeping
 * them off the client is what lets the article page stay a single server
 * render with no hydration cost on a page that is mostly text.
 */

/**
 * What kind of rule this is, in words.
 *
 * §4's semantic types matter more than any colour on the page: « blocage
 * temporaire » and « compte terminé » are the difference between a bad day and
 * a finished evaluation. Each badge writes its meaning, and the border carries
 * the tone as a secondary signal only.
 */
const SEVERITY_STYLE: Record<string, { border: string; text: string }> = {
  information: { border: 'var(--wariba-color-ink-600)', text: 'var(--wariba-color-ink-200)' },
  pass_condition: {
    border: 'var(--wariba-color-cobalt-700)',
    text: 'var(--wariba-color-cobalt-300)',
  },
  payout_condition: {
    border: 'var(--wariba-color-cobalt-700)',
    text: 'var(--wariba-color-cobalt-300)',
  },
  soft_lock: { border: 'color-mix(in srgb, #f59e0b 55%, transparent)', text: '#fbbf24' },
  hard_breach: { border: 'color-mix(in srgb, #ef4444 55%, transparent)', text: '#fca5a5' },
  operational: { border: 'var(--wariba-color-ink-600)', text: 'var(--wariba-color-ink-200)' },
};

export function RuleSeverityBadge({ severity }: { severity: HelpArticle['severity'] }) {
  const style = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.information;
  return (
    <span
      data-testid="help-severity"
      data-severity={severity}
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[length:var(--wariba-font-size-label-sm)] font-semibold"
      style={{ borderColor: style?.border, color: style?.text }}
    >
      {HELP_SEVERITY_LABELS[severity]}
    </span>
  );
}

export function AppliesToBadge({ audience }: { audience: HelpArticle['audience'] }) {
  return (
    <>
      {audience.map((value) => (
        <span
          key={value}
          className="inline-flex items-center rounded-full border border-[color:var(--wariba-color-ink-600)] px-2.5 py-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-200)]"
        >
          {HELP_AUDIENCE_LABELS[value]}
        </span>
      ))}
    </>
  );
}

/**
 * Where the article's authority comes from.
 *
 * Rendered on every article, because « la policy publiée gagne » is only a
 * real guarantee if a reader can see what this page is subordinate to.
 */
export function PolicySourceBadge({
  sources,
  policyVersion,
}: {
  sources: readonly string[];
  policyVersion: string | null;
}) {
  return (
    <p
      data-testid="help-source-of-truth"
      className="text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]"
    >
      Source de vérité : {sources.join(' · ')}
      {policyVersion ? ` · policy publiée ${policyVersion}` : ''}. En cas de divergence, la policy
      attachée à votre compte l’emporte sur cet article.
    </p>
  );
}

export function HelpCategoryCard({ category }: { category: HelpCategorySummary }) {
  return (
    <Link
      href={category.href}
      data-testid="help-category-card"
      className="flex min-h-32 flex-col rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-900)] p-5 transition-colors hover:border-[color:var(--wariba-color-cobalt-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-color-cobalt-300)] motion-reduce:transition-none"
    >
      <h3 className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
        {category.title}
      </h3>
      <p className="mt-1.5 flex-1 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
        {category.description}
      </p>
      <p className="mt-3 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-color-cobalt-300)]">
        {category.articleCount} article{category.articleCount > 1 ? 's' : ''}
      </p>
    </Link>
  );
}

export function HelpArticleRow({ article }: { article: HelpArticle }) {
  return (
    <Link
      href={helpArticleHref(article)}
      data-testid="help-article-row"
      data-slug={article.slug}
      className="flex min-h-16 flex-col gap-1 border-b border-[color:var(--wariba-color-ink-800)] py-4 last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-color-cobalt-300)]"
    >
      <span className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
        {article.title}
      </span>
      <span className="max-w-[72ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
        {article.summary}
      </span>
    </Link>
  );
}

export function RelatedArticles({ articles }: { articles: readonly HelpArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-label="Articles liés" data-testid="help-related">
      <h2 className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
        Articles liés
      </h2>
      <ul className="mt-3 flex flex-col">
        {articles.map((article) => (
          <li key={article.slug}>
            <HelpArticleRow article={article} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The two ways out of an article.
 *
 * Support is offered on every article, because the question the page did not
 * answer is exactly the question a request exists for. The contestation path
 * is offered only on articles about a decision that can actually be contested
 * — offering it under « Comment placer un ordre » would invite a formal
 * dispute over a question.
 */
export function HelpSupportCta({ contestable = false }: { contestable?: boolean }) {
  return (
    <section
      data-testid="help-support-cta"
      className="rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-900)] p-5 sm:p-6"
    >
      <h2 className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
        Cette page n’a pas répondu à votre question ?
      </h2>
      <p className="mt-2 max-w-[64ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-200)]">
        Connectez-vous pour ouvrir une demande rattachée à votre compte. Elle est suivie sous une
        référence et un opérateur y répond dans le même fil.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href="/support" className={buttonClassNames({ size: 'md' })}>
          Ouvrir une demande
        </Link>
        {contestable ? (
          <Link
            href="/support/contestations/nouvelle"
            data-testid="help-dispute-cta"
            className={buttonClassNames({ size: 'md', variant: 'secondary' })}
          >
            Contester une décision
          </Link>
        ) : null}
      </div>
    </section>
  );
}
