import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, ExternalIcon } from '@wariba/ui';
import { LEGAL_OPERATOR, TARGET_MARKETS } from '@wariba/ui';
import type { LegalSourceRef } from './legal-sources';

export interface LegalTocItem {
  id: string;
  label: string;
}

export interface LegalRelatedLink {
  href: string;
  label: string;
}

export interface LegalPageShellProps {
  title: string;
  summary: string;
  lastUpdated: string;
  version?: string;
  toc: readonly LegalTocItem[];
  enClair: readonly string[];
  sources: readonly LegalSourceRef[];
  related: readonly LegalRelatedLink[];
  /** Overrides the default operator-identity rail card — used where a page-specific distinction matters more. */
  rail?: ReactNode;
  children: ReactNode;
}

/**
 * The one shared shell for all 11 Legal Center pages.
 *
 * ## Why one shell, not eleven bespoke pages
 *
 * A reader who opens two of these pages back to back should recognise the
 * grammar instantly: same hero, same "En clair" box, same sticky table of
 * contents, same source-citation pattern. That repetition is the point — it
 * is what makes a legal page feel like part of a real Legal Center instead
 * of eleven documents written on different days.
 *
 * ## What this shell does not do
 *
 * It never renders a commercial CTA ("Commencer", "Acheter") — legal pages
 * end with a question-and-contact band, not a conversion prompt. It never
 * asserts a regulatory conclusion of its own; `title`/`summary`/`children`
 * are supplied by each page, and the shell only arranges them.
 */
export function LegalPageShell({
  title,
  summary,
  lastUpdated,
  version = '1.0',
  toc,
  enClair,
  sources,
  related,
  rail,
  children,
}: LegalPageShellProps) {
  return (
    <article className="bg-[color:var(--wariba-canvas-deep)]">
      {/* ── Hero ── */}
      <div className="border-b border-[color:var(--wariba-seam)]">
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-14 sm:py-16">
          <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-brand-300)]">
            Légal · WARIBA
          </p>
          <h1 className="mt-4 max-w-3xl text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] tracking-[-0.02em] text-[color:var(--wariba-on-dark)]">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
            {summary}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
            <span>
              Dernière mise à jour&nbsp;:{' '}
              <span className="text-[color:var(--wariba-on-dark-muted)]">{lastUpdated}</span>
            </span>
            <span>
              Version&nbsp;:{' '}
              <span className="text-[color:var(--wariba-on-dark-muted)]">{version}</span>
            </span>
            <span>
              Opéré par&nbsp;
              <span className="text-[color:var(--wariba-on-dark-muted)]">
                {LEGAL_OPERATOR.legalName} · {LEGAL_OPERATOR.registeredOffice}
              </span>
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {TARGET_MARKETS.map((market) => (
              <span
                key={market}
                className="rounded-full border border-[color:var(--wariba-seam-strong)] px-3 py-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]"
              >
                {market}
              </span>
            ))}
          </div>

          {/* En clair */}
          <div className="mt-10 max-w-3xl rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-brand-wash)] px-6 py-6">
            <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-brand-300)]">
              En clair
            </p>
            <ul className="mt-3 grid gap-2.5">
              {enClair.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark)]"
                >
                  <CheckIcon
                    size="sm"
                    className="mt-0.5 shrink-0 text-[color:var(--wariba-brand-300)]"
                  />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
              Ce résumé ne remplace pas le texte complet ci-dessous.
            </p>
          </div>
        </div>
      </div>

      {/* ── Mobile "Sur cette page" ── */}
      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] pt-8 lg:hidden">
        <details className="group rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-seam)]">
          <summary className="wariba-focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--wariba-radius-lg)] px-4 py-3 text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark)] marker:content-none">
            Sur cette page
            <ChevronDownIcon
              size="sm"
              className="shrink-0 text-[color:var(--wariba-on-dark-dim)] transition-transform duration-[var(--wariba-motion-state)] group-open:rotate-180"
            />
          </summary>
          <ul className="grid gap-1 px-4 pb-4">
            {toc.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="wariba-focus-ring block rounded-md py-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)] hover:text-[color:var(--wariba-on-dark)]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>

      {/* ── Layout: TOC / content / rail ── */}
      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-12 sm:py-16">
        <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)_260px] lg:items-start lg:gap-12">
          <nav aria-label="Sur cette page" className="hidden lg:sticky lg:top-24 lg:block">
            <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
              Sur cette page
            </p>
            <ul className="mt-4 grid gap-1 border-l border-[color:var(--wariba-seam)]">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="wariba-focus-ring -ml-px block border-l-2 border-transparent py-1.5 pl-4 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)] transition-colors hover:border-[color:var(--wariba-brand-400)] hover:text-[color:var(--wariba-on-dark)]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-10 grid gap-8 lg:mt-0">{children}</div>

          <aside className="mt-10 lg:mt-0">{rail ?? <DefaultLegalRail />}</aside>
        </div>
      </div>

      {/* ── Sources ── */}
      <div className="border-t border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-elevated)]">
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-10">
          <details className="group">
            <summary className="wariba-focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark)] marker:content-none">
              Voir les références juridiques
              <ChevronDownIcon
                size="sm"
                className="text-[color:var(--wariba-on-dark-dim)] transition-transform duration-[var(--wariba-motion-state)] group-open:rotate-180"
              />
            </summary>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-seam)] px-4 py-3"
                >
                  <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
                    {source.institution}
                    {source.country ? ` · ${source.country}` : ''}
                  </p>
                  <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                    {source.text}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
                      {source.date}
                    </span>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="wariba-focus-ring inline-flex items-center gap-1 rounded-md text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
                      >
                        Source officielle
                        <ExternalIcon size="sm" />
                      </a>
                    ) : null}
                  </div>
                  {source.unconfirmed ? (
                    <p className="mt-2 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-accent-amber)]">
                      Référence à confirmer avant affichage définitif.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* ── À lire aussi ── */}
      {related.length > 0 ? (
        <div className="border-t border-[color:var(--wariba-seam)]">
          <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-10">
            <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
              À lire aussi
            </p>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              {related.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="wariba-focus-ring inline-flex items-center gap-1.5 rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
                >
                  {link.label}
                  <ArrowRightIcon size="sm" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Historique ── */}
      <div className="border-t border-[color:var(--wariba-seam)]">
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-10">
          <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
            Historique
          </p>
          <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)]">
            <span className="font-semibold text-[color:var(--wariba-on-dark)]">v{version}</span> —
            Publication initiale · {lastUpdated}
          </p>
        </div>
      </div>

      {/* ── Contact band ── */}
      <div className="border-t border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-elevated)]">
        <div className="mx-auto flex max-w-[var(--wariba-shell-max)] flex-col gap-4 px-[var(--wariba-shell-gutter)] py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)]">
            Une question sur cette politique&nbsp;?
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <a
              href={`mailto:${LEGAL_OPERATOR.supportEmail}`}
              className="wariba-focus-ring inline-block rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
            >
              {LEGAL_OPERATOR.supportEmail}
            </a>
            <Link
              href="/aide"
              className="wariba-focus-ring inline-flex items-center gap-1.5 rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark-muted)] hover:text-[color:var(--wariba-on-dark)]"
            >
              Centre d’aide
              <ArrowRightIcon size="sm" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function DefaultLegalRail() {
  return (
    <div className="rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-elevated)] px-5 py-6">
      <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
        Opérateur
      </p>
      <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark)]">
        {LEGAL_OPERATOR.legalName}
      </p>
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)]">
        {LEGAL_OPERATOR.registeredOffice}
      </p>
      <Link
        href="/legal"
        className="wariba-focus-ring mt-4 inline-flex items-center gap-1.5 rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
      >
        Centre légal WARIBA
        <ArrowRightIcon size="sm" />
      </Link>
    </div>
  );
}
