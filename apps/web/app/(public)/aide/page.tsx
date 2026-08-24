import Link from 'next/link';
import { buttonClassNames, Text } from '@wariba/ui';
import { buildHelpPolicyFacts } from '@wariba/application';
import { getDb } from '../../../lib/db';
import {
  helpArticleHref,
  helpCategorySummaries,
  pinnedArticle,
  publishedArticleBySlug,
} from '../../../content/help';
import { HelpSearch } from '../../../components/help/HelpSearch';
import { HelpArticleRow, HelpCategoryCard } from '../../../components/help/HelpChrome';

// The pinned article renders live policy values, so the page cannot be cached
// past a policy change.
export const dynamic = 'force-dynamic';

/**
 * The Help Center home — search first, then the one article to read before a
 * first trade, then the categories, then the questions people actually ask.
 *
 * ## Why the essential-rules article is pinned above the categories
 *
 * §3 and Tradeify's one genuinely good idea: the trader who most needs help is
 * the one who has not started yet and does not know what to search for. A grid
 * of eleven categories does not tell them that daily loss and maximum loss are
 * different things. One pinned article does.
 */
const FREQUENT_QUESTIONS: readonly string[] = [
  'perte-quotidienne',
  'perte-maximale-eod',
  'meilleur-jour',
  'objectif-atteint',
  'profit-court-terme',
  'eligibilite-payout',
  'ordre-refuse',
  'ouvrir-une-contestation',
];

export default async function HelpPage() {
  const [facts, categories, pinned] = await Promise.all([
    buildHelpPolicyFacts(getDb()),
    Promise.resolve(helpCategorySummaries()),
    Promise.resolve(pinnedArticle()),
  ]);

  const frequent = FREQUENT_QUESTIONS.map((slug) => publishedArticleBySlug(slug)).filter(
    (article): article is NonNullable<typeof article> => article !== null,
  );

  return (
    <>
      <section className="border-b border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
            Centre d’aide WARIBA
          </Text>
          <h1 className="mt-4 text-[length:var(--wariba-font-size-display-lg)] font-semibold leading-[var(--wariba-line-height-display-lg)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-bone-50)]">
            Comment pouvons-nous vous aider ?
          </h1>
          <div className="mt-8">
            <HelpSearch />
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto flex max-w-[var(--wariba-size-marketing-container-max)] flex-col gap-14 px-4 py-14 sm:px-6 lg:py-20">
          {pinned ? (
            <Link
              href={helpArticleHref(pinned)}
              data-testid="help-pinned"
              className="flex flex-col gap-3 rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-cobalt-700)] bg-[color:var(--wariba-color-ink-900)] p-6 transition-colors hover:border-[color:var(--wariba-color-cobalt-300)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-color-cobalt-300)] motion-reduce:transition-none sm:p-8"
            >
              <span className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-cobalt-300)]">
                À lire en premier
              </span>
              <span className="text-[length:var(--wariba-font-size-heading-lg)] font-semibold text-[color:var(--wariba-color-bone-50)]">
                {pinned.title}
              </span>
              <span className="max-w-[68ch] text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-color-ink-200)]">
                {pinned.summary}
              </span>
              {facts.evaluationPolicyVersion ? (
                <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                  Policy WARIBA ONE {facts.evaluationPolicyVersion}
                </span>
              ) : null}
            </Link>
          ) : null}

          <section aria-label="Catégories d’aide">
            <h2 className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
              Catégories
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <HelpCategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>

          <section aria-label="Questions fréquentes">
            <h2 className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
              Questions fréquentes
            </h2>
            <ul className="mt-3 flex max-w-3xl flex-col">
              {frequent.map((article) => (
                <li key={article.slug} className="flex flex-col">
                  <HelpArticleRow article={article} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-100)]">
        <div className="mx-auto flex max-w-[var(--wariba-size-marketing-container-max)] flex-col items-start gap-5 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div>
            <h2 className="text-[length:var(--wariba-font-size-heading-lg)] font-semibold text-[color:var(--wariba-color-ink-950)]">
              Vous ne trouvez pas votre réponse ?
            </h2>
            <p className="mt-2 max-w-[60ch] text-[color:var(--wariba-color-ink-600)]">
              Le support prend le relais pour tout ce qui touche à votre compte, à une commande ou à
              une preuve. Votre demande est suivie sous une référence.
            </p>
          </div>
          <Link href="/support" className={buttonClassNames({ size: 'lg' })}>
            Ouvrir une demande
          </Link>
        </div>
      </section>
    </>
  );
}
