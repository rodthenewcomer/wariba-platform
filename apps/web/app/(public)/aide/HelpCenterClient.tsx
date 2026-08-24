'use client';

import { useMemo, useState } from 'react';
import { HELP_CATEGORIES, searchHelpArticles, type HelpFilter } from '../../../lib/help-articles';

export function HelpCenterClient() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<HelpFilter>('Tous');
  // The articles and the matching both live in lib/help-articles.ts so that
  // the Trader Hub's Support search returns the same answers as this page.
  const results = useMemo(() => searchHelpArticles(query, category), [category, query]);

  return (
    <div>
      <label
        htmlFor="help-search"
        className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]"
      >
        Rechercher dans les réponses
      </label>
      <input
        id="help-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ex. Maximum Loss, FCFA, WariX…"
        className="mt-3 min-h-14 w-full rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-900)] px-4 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-color-bone-50)] placeholder:text-[color:var(--wariba-color-ink-300)]"
      />
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Catégories d’aide">
        {HELP_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
            className={`min-h-11 rounded-[var(--wariba-radius-full)] border px-4 text-[length:var(--wariba-font-size-label-sm)] font-semibold ${
              category === item
                ? 'border-[color:var(--wariba-color-cobalt-300)] bg-[color:var(--wariba-color-cobalt-900)] text-[color:var(--wariba-color-bone-50)]'
                : 'border-[color:var(--wariba-color-ink-600)] text-[color:var(--wariba-color-ink-100)] hover:bg-[color:var(--wariba-color-ink-800)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {results.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-900)] p-5 open:bg-[color:var(--wariba-color-ink-800)]"
          >
            <summary className="min-h-11 cursor-pointer pr-4 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
              {faq.question}
            </summary>
            <p className="mt-4 border-t border-[color:var(--wariba-color-ink-600)] pt-4 text-[length:var(--wariba-font-size-body-sm)] leading-[var(--wariba-line-height-body-md)] text-[color:var(--wariba-color-ink-200)]">
              {faq.answer}
            </p>
            <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-cobalt-300)]">
              {faq.category}
            </p>
          </details>
        ))}
      </div>

      {results.length === 0 && (
        <div className="mt-10 rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-ink-700)] p-8 text-center">
          <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">
            Aucun résultat pour cette recherche.
          </p>
          <p className="mt-2 text-[color:var(--wariba-color-ink-300)]">
            Essayez un autre terme ou choisissez « Tous ».
          </p>
        </div>
      )}
    </div>
  );
}
