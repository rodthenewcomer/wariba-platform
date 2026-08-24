import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { buildHelpPolicyFacts } from '@wariba/application';
import { getDb } from '../../../../../lib/db';
import {
  HELP_CATEGORIES,
  publishedArticleBySlug,
  publishedArticles,
  relatedArticles,
} from '../../../../../content/help';
import { HelpBlocks } from '../../../../../components/help/HelpBlocks';
import {
  AppliesToBadge,
  HelpSupportCta,
  PolicySourceBadge,
  RelatedArticles,
  RuleSeverityBadge,
} from '../../../../../components/help/HelpChrome';

// Every rule article resolves live policy values, so no article may be served
// from a cache that outlives a policy change.
export const dynamic = 'force-dynamic';

/**
 * One article.
 *
 * ## The reading column
 *
 * `max-w-3xl` puts a line at roughly 70 characters — §10's 720–820px, which is
 * where continuous prose stops costing the reader eye movement. Tables and
 * formulas are allowed to break out of it because they are scanned, not read.
 *
 * ## The contestation call to action, conditionally
 *
 * Offered on articles whose severity means a decision was recorded against an
 * account — a terminal breach or a risk decision. Under « Comment placer un
 * ordre » it would invite a formal dispute over a question, which is exactly
 * the confusion Phase 3.2 separated support from contestations to avoid.
 */
const CONTESTABLE_SEVERITIES = new Set(['hard_breach', 'soft_lock']);

export function generateStaticParams() {
  return publishedArticles().map((article) => ({
    category: article.category,
    slug: article.slug,
  }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = publishedArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.title} — Centre d’aide WARIBA`,
    description: article.summary,
  };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categoryId, slug } = await params;
  const article = publishedArticleBySlug(slug);

  // The category has to match the one the article declares, so a valid slug
  // under the wrong category is a 404 rather than a second URL for one page.
  if (!article || article.category !== categoryId) notFound();

  const category = HELP_CATEGORIES.find((entry) => entry.id === article.category);
  const facts = await buildHelpPolicyFacts(getDb());
  const related = relatedArticles(article);
  const policyVersion =
    article.audience.includes('performance') && !article.audience.includes('evaluation')
      ? facts.performancePolicyVersion
      : facts.evaluationPolicyVersion;

  return (
    <section className="bg-[color:var(--wariba-color-ink-950)]">
      <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 lg:py-16">
        <nav
          aria-label="Fil d’Ariane"
          className="flex flex-wrap items-center gap-2 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]"
        >
          <Link href="/aide" className="font-semibold text-[color:var(--wariba-color-cobalt-300)]">
            Centre d’aide
          </Link>
          <span aria-hidden="true">/</span>
          {category ? (
            <Link
              href={`/aide/${category.id}`}
              className="font-semibold text-[color:var(--wariba-color-cobalt-300)]"
            >
              {category.title}
            </Link>
          ) : null}
        </nav>

        <header className="flex flex-col gap-4">
          <h1 className="text-[length:var(--wariba-font-size-display-sm)] font-semibold leading-tight text-[color:var(--wariba-color-bone-50)] sm:text-[length:var(--wariba-font-size-display-md)]">
            {article.title}
          </h1>
          <p className="max-w-[68ch] text-[length:var(--wariba-font-size-body-lg)] leading-relaxed text-[color:var(--wariba-color-ink-200)]">
            {article.summary}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <RuleSeverityBadge severity={article.severity} />
            <AppliesToBadge audience={article.audience} />
          </div>
          <PolicySourceBadge sources={article.sourceOfTruth} policyVersion={policyVersion} />
        </header>

        <HelpBlocks blocks={article.body} policyFacts={facts} />

        <RelatedArticles articles={related} />

        <HelpSupportCta contestable={CONTESTABLE_SEVERITIES.has(article.severity)} />

        <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
          Dernière relecture : {article.lastReviewedAt}
        </p>
      </article>
    </section>
  );
}
