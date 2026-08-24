import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  HELP_CATEGORIES,
  HELP_CATEGORY_IDS,
  publishedArticlesInCategory,
  type HelpCategoryId,
} from '../../../../content/help';
import { HelpArticleRow, HelpSupportCta } from '../../../../components/help/HelpChrome';

function resolveCategory(id: string) {
  if (!(HELP_CATEGORY_IDS as readonly string[]).includes(id)) return null;
  return HELP_CATEGORIES.find((category) => category.id === id) ?? null;
}

/**
 * Only the categories that actually have published articles are pre-rendered.
 *
 * A category page listing nothing is a dead end a search engine would index
 * and a trader would bounce off. `dynamicParams = false` turns every other
 * segment into a 404 rather than an empty page.
 */
export function generateStaticParams() {
  return HELP_CATEGORIES.filter(
    (category) => publishedArticlesInCategory(category.id).length > 0,
  ).map((category) => ({ category: category.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: id } = await params;
  const category = resolveCategory(id);
  if (!category) return {};
  return {
    title: `${category.title} — Centre d’aide WARIBA`,
    description: category.description,
  };
}

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: id } = await params;
  const category = resolveCategory(id);
  if (!category) notFound();

  const articles = publishedArticlesInCategory(category.id as HelpCategoryId);
  if (articles.length === 0) notFound();

  return (
    <section className="bg-[color:var(--wariba-color-ink-950)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6 lg:py-20">
        <nav aria-label="Fil d’Ariane">
          <Link
            href="/aide"
            className="text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-color-cobalt-300)]"
          >
            ← Centre d’aide
          </Link>
        </nav>

        <header>
          <h1 className="text-[length:var(--wariba-font-size-display-sm)] font-semibold leading-tight text-[color:var(--wariba-color-bone-50)] sm:text-[length:var(--wariba-font-size-display-md)]">
            {category.title}
          </h1>
          <p className="mt-3 max-w-[64ch] text-[length:var(--wariba-font-size-body-lg)] leading-relaxed text-[color:var(--wariba-color-ink-200)]">
            {category.description}
          </p>
        </header>

        <ul className="flex flex-col" data-testid="help-category-articles">
          {articles.map((article) => (
            <li key={article.slug} className="flex flex-col">
              <HelpArticleRow article={article} />
            </li>
          ))}
        </ul>

        <HelpSupportCta
          contestable={category.id === 'support' || category.id === 'risque-regles'}
        />
      </div>
    </section>
  );
}
