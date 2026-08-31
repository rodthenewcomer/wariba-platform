import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import { LEGAL_CENTER_PAGES } from '../../../components/legal/legal-index';

export default function LegalCenterPage() {
  return (
    <article className="bg-[color:var(--wariba-canvas-deep)]">
      <div className="border-b border-[color:var(--wariba-seam)]">
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-14 sm:py-16">
          <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-brand-300)]">
            Légal · WARIBA
          </p>
          <h1 className="mt-4 max-w-3xl text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] tracking-[-0.02em] text-[color:var(--wariba-on-dark)]">
            Centre légal
          </h1>
          <p className="mt-4 max-w-2xl text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
            Onze pages, une frontière commune&nbsp;: WARIBA est un service numérique de simulation et
            d’évaluation de trading. Chaque page couvre un sujet précis plutôt qu’un seul document
            générique qui tenterait de tout contenir.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEGAL_CENTER_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="wariba-focus-ring group flex flex-col justify-between gap-6 rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-elevated)] px-5 py-6 transition-colors hover:border-[color:var(--wariba-brand-edge)]"
            >
              <div>
                <p className="text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark)]">
                  {page.label}
                </p>
                <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                  {page.description}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-brand-300)] transition-colors group-hover:text-[color:var(--wariba-brand-200)]">
                Lire
                <ArrowRightIcon size="sm" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
