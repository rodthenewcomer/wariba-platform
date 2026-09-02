import type { LinkComponentType } from '../lib/link';
import { ArrowRightIcon } from '../icons/shell-icons';
import { FOOTER_COLUMNS } from './public-nav';
import { LEGAL_DISCLOSURES, LEGAL_OPERATOR, TARGET_MARKETS } from './legal-disclosure';

export interface PublicFooterProps {
  LinkComponent: LinkComponentType;
  /**
   * Band 1 — "Quel parcours vous convient ? / Comparer les parcours" — is a
   * footer-level nudge back to `/offres` for a visitor reading, say, a
   * legal page. On `/offres` itself the whole page already is that
   * comparison, several times over (the configurator's compare mode, the
   * FAQ's own final buying moment), so the same band there is a redundant
   * dead end pointing at the page it's already on. Defaults to shown —
   * every other public route keeps it; only `/offres` passes `false`.
   */
  showParcoursCta?: boolean;
}

/**
 * The WARIBA public footer — Phase 3.4.5A §24–§26, extended for the
 * regulatory-disclosure rebuild.
 *
 * ## Three bands
 *
 * Closing proposition, navigation + operator identity, then a dedicated
 * disclosure band — a real content surface with headings and body-size
 * text, not ten-point grey at the very bottom.
 *
 * A fourth band used to sit between navigation and disclosure: a giant
 * low-opacity "WARIBA" wordmark filling the width of the footer. Every
 * reference footer that actually reads as premium (ForTraders, FundedNext)
 * treats brand identity as a small mark next to the nav columns, not a
 * background scene — the giant version read as filler rather than
 * confidence. The wordmark in band 2 now carries that job at header scale.
 *
 * ## What the disclosure band is not
 *
 * It is a summary, not a legal opinion, and it does not assert a
 * regulatory conclusion in either direction — it doesn't claim WARIBA is
 * licensed by anyone, and it doesn't claim WARIBA is exempt from
 * regulation either. Both would be claims this codebase has no basis to
 * make. See `docs/07-assurance/WARIBA_UEMOA_PUBLIC_FOOTER_COMPLIANCE_2026.md`
 * for what's still open before a real commercial launch across the six
 * target markets, and `legal-disclosure.ts` for why each block is worded
 * the way it is.
 */
export function PublicFooter({ LinkComponent: Link, showParcoursCta = true }: PublicFooterProps) {
  return (
    <footer className="border-t border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-base)]">
      {/* ── Bande 1 : la proposition de clôture ── */}
      {showParcoursCta ? (
        <div className="border-b border-[color:var(--wariba-seam)]">
          <div className="mx-auto flex max-w-[var(--wariba-shell-max)] flex-col gap-6 px-[var(--wariba-shell-gutter)] py-12 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--wariba-on-dark)] sm:text-3xl">
                Quel parcours vous convient ?
              </p>
              <p className="mt-2 max-w-xl text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                Comparez ONE, FLEX et INSTANT avant de commencer.
              </p>
            </div>
            <Link href="/offres" className="wariba-cta-primary shrink-0">
              Comparer les parcours
              <ArrowRightIcon size="sm" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* ── Bande 2 : identité + navigation + opérateur ── */}
      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-14">
        <Link
          href="/"
          className="wariba-focus-ring inline-block rounded-md text-[length:var(--wariba-font-size-heading-md)] font-bold tracking-[-0.03em] text-[color:var(--wariba-on-dark)]"
        >
          WARIBA
        </Link>

        <nav aria-label="Pied de page" className="mt-10">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
                  {column.title}
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.href}`}>
                      <Link
                        href={link.href}
                        className="wariba-focus-ring inline-block rounded-md text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)] transition-colors hover:text-[color:var(--wariba-on-dark)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/*
         * The operator identity — kept to verified facts only. RCCM, tax
         * identifier, exact legal form and full registered office are not
         * here because they aren't confirmed anywhere in this codebase yet;
         * see the compliance memo rather than guessing at them.
         */}
        <div className="mt-12 flex flex-col gap-8 border-t border-[color:var(--wariba-seam)] pt-8 sm:flex-row sm:justify-between">
          <div>
            <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
              Un service exploité par
            </p>
            <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark)]">
              {LEGAL_OPERATOR.legalName}
            </p>
            <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)]">
              {LEGAL_OPERATOR.registeredOffice}
            </p>
            <a
              href={`mailto:${LEGAL_OPERATOR.supportEmail}`}
              className="wariba-focus-ring mt-2 inline-block rounded-md text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-brand-300)] transition-colors hover:text-[color:var(--wariba-brand-200)]"
            >
              {LEGAL_OPERATOR.supportEmail}
            </a>
          </div>

          <div>
            <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
              Marchés visés
            </p>
            <p className="mt-2 max-w-xs text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)]">
              {TARGET_MARKETS.join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bande 3 : divulgation réglementaire ──
          Capped at `max-w-3xl`, narrower than bands 1–2's full shell width:
          this is the one band whose job is to be read carefully, not
          scanned, so it reads as a contained, calmer block rather than a
          wall of legal text spanning the same width as the nav grid above. */}
      <div className="border-t border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-deep)]">
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-12">
          <div className="max-w-3xl">
            <h2 className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
              Informations réglementaires
            </h2>
            <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
              Ce résumé ne remplace pas les Conditions d’utilisation, la Politique de
              confidentialité et le disclosure risques complets, accessibles ci-dessous.
            </p>

            {/* Desktop — always-expanded single column, real content, real size:
                a narrower column reads calmer than two columns racing sideways. */}
            <div className="mt-8 hidden flex-col gap-6 lg:flex">
              {LEGAL_DISCLOSURES.map((disclosure) => (
                <div key={disclosure.id}>
                  <h3 className="text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark)]">
                    {disclosure.title}
                  </h3>
                  <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                    {disclosure.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Mobile — accordion, native <details> so no client JS ships for this. */}
            <div className="mt-8 divide-y divide-[color:var(--wariba-seam)] border-y border-[color:var(--wariba-seam)] lg:hidden">
              {LEGAL_DISCLOSURES.map((disclosure, index) => (
                <details key={disclosure.id} className="group py-4" open={index === 0}>
                  <summary className="wariba-focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-on-dark)] marker:content-none">
                    {disclosure.title}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[color:var(--wariba-brand-300)] transition-transform duration-[var(--wariba-motion-state)] group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                    {disclosure.body}
                  </p>
                </details>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <Link
                href="/legal/risques"
                className="wariba-focus-ring inline-flex items-center gap-1.5 rounded-md text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
              >
                Lire le disclosure complet
                <ArrowRightIcon size="sm" />
              </Link>
              <Link
                href="/legal/conditions-utilisation"
                className="wariba-focus-ring inline-block rounded-md text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)] hover:text-[color:var(--wariba-on-dark)]"
              >
                Conditions d’utilisation
              </Link>
              <Link
                href="/legal/confidentialite"
                className="wariba-focus-ring inline-block rounded-md text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)] hover:text-[color:var(--wariba-on-dark)]"
              >
                Confidentialité
              </Link>
              <Link
                href="/legal"
                className="wariba-focus-ring inline-block rounded-md text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-on-dark-muted)] hover:text-[color:var(--wariba-on-dark)]"
              >
                Centre légal
              </Link>
            </div>

            <p className="mt-8 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
              © 2026 {LEGAL_OPERATOR.legalName}. WARIBA. Tous droits réservés.{' '}
              {LEGAL_OPERATOR.registeredOffice}. Bêta privée — documents juridiques en validation
              locale.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
