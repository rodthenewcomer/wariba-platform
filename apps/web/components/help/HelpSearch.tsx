'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { helpArticleHref, searchHelpArticles } from '../../content/help';

/**
 * Search, first.
 *
 * §3 puts the field above the categories because a trader arriving at the Help
 * Center already has a question — they are not browsing. Category cards are
 * for the person who does not know what to call the thing they are looking
 * for, which is the second case, not the first.
 *
 * ## Client-side on purpose
 *
 * The whole index is ~50 articles compiled into the bundle. A round trip per
 * keystroke would be slower and would need a route; a build-time index and a
 * local match answer in a frame, work offline, and cost no infrastructure
 * (§11.4). There is no external search service and no query is sent anywhere —
 * which also means nothing a trader types is logged.
 */
export function HelpSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const results = useMemo(() => searchHelpArticles(trimmed), [trimmed]);
  const searching = trimmed.length >= 2;

  return (
    <div className="w-full">
      <label
        htmlFor="help-search"
        className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]"
      >
        Rechercher une réponse
      </label>
      <input
        id="help-search"
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ex. perte maximale, payout, ordre refusé…"
        data-testid="help-search-input"
        className="mt-3 min-h-14 w-full rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-900)] px-4 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-color-bone-50)] placeholder:text-[color:var(--wariba-color-ink-300)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-color-cobalt-300)]"
      />

      {searching ? (
        <div className="mt-4" data-testid="help-search-results" aria-live="polite">
          {results.length === 0 ? (
            <div className="rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] p-5">
              <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">
                Aucune réponse ne correspond.
              </p>
              <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
                Essayez un autre terme, ou{' '}
                <Link
                  href="/support"
                  className="font-semibold text-[color:var(--wariba-color-cobalt-300)] underline underline-offset-2"
                >
                  ouvrez une demande
                </Link>{' '}
                — un opérateur WARIBA vous répondra.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-[color:var(--wariba-color-ink-800)]">
              {results.map(({ article }) => (
                <li key={article.slug}>
                  <Link
                    href={helpArticleHref(article)}
                    data-testid="help-search-result"
                    data-slug={article.slug}
                    className="flex min-h-16 flex-col gap-1 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-color-cobalt-300)]"
                  >
                    <span className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
                      {article.title}
                    </span>
                    <span className="max-w-[72ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                      {article.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
