'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { HubIcon } from '../../components/hub/icons';
import { Surface } from '../../components/hub/Surface';
import { helpArticleHref, searchHelpArticles } from '../../content/help';

/**
 * Search the help before opening a request.
 *
 * The order on this page is deliberate: search first, then requests, then the
 * button that creates one. Most support volume is a question the rulebook
 * already answers, and a trader who finds it here gets an answer in four
 * seconds instead of four hours. That is not deflection — nothing is hidden
 * behind the search, and « Nouvelle demande » is visible the whole time.
 *
 * Results only appear once something is typed. A page that opens with twenty
 * expanded answers has buried the two things the trader came for.
 */
export function SupportHelpSearch() {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  // The same ranked index `/aide` uses. A trader who finds an answer in the
  // public Help Center must find it here too, at the same rank.
  const results = useMemo(() => searchHelpArticles(trimmed, 6), [trimmed]);
  const searching = trimmed.length >= 2;

  return (
    <Surface className="p-5 sm:p-6">
      <label
        htmlFor="support-help-search"
        className="text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-secondary)]"
      >
        Rechercher dans l’aide
      </label>
      <div className="relative mt-2.5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--wariba-text-tertiary)]"
        >
          <HubIcon role="support" size={18} />
        </span>
        <input
          id="support-help-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex. Maximum Loss, payout, FCFA…"
          data-testid="support-help-search"
          className="min-h-12 w-full rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] pl-11 pr-3.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)] placeholder:text-[color:var(--wariba-text-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
        />
      </div>

      {searching ? (
        <div className="mt-4" data-testid="support-help-results" aria-live="polite">
          {results.length === 0 ? (
            <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              Aucune réponse ne correspond. Ouvrez une demande ci-dessous — un opérateur WARIBA vous
              répondra.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-[color:var(--warix-border-subtle)]">
              {results.map(({ article }) => (
                <li key={article.slug}>
                  {/*
                   * Links out to the article rather than expanding it inline.
                   * A rule article carries live policy values, a severity badge
                   * and its source of truth; a summary pasted into an accordion
                   * would be the second version of a rule this slice exists to
                   * prevent.
                   */}
                  <Link
                    href={helpArticleHref(article)}
                    data-testid="support-help-result"
                    data-slug={article.slug}
                    className="flex min-h-14 items-center gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                        {article.title}
                      </span>
                      <span className="mt-0.5 block text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                        {article.summary}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[color:var(--wariba-text-tertiary)]"
                    >
                      <HubIcon role="chevron" size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Surface>
  );
}
