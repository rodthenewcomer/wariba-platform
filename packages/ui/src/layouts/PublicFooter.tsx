import type { LinkComponentType } from '../lib/link';
import { ArrowRightIcon } from '../icons/shell-icons';
import { FOOTER_COLUMNS } from './public-nav';

export interface PublicFooterProps {
  LinkComponent: LinkComponentType;
}

/**
 * The WARIBA public footer — Phase 3.4.5A §24–§26.
 *
 * ## Three bands, not five columns and a rule
 *
 * The brief's requirement is that the footer be a brand moment rather than
 * `5 columns + border-top`, and the shape that achieves it is: a closing
 * proposition, the navigation columns, then a wordmark scene large enough to
 * be the last thing the page says.
 *
 * The wordmark band is drawn with a `clamp()` type size and a cobalt horizon
 * gradient — no image, no canvas, nothing on the critical path. The footer
 * ships on every public route, so it is allowed to be striking and not allowed
 * to be expensive.
 *
 * ## What is deliberately absent
 *
 * Every reference in the benchmark carries an awards row, a review score, a
 * follower count or a wall of payment-provider logos, and WARIBA has none of
 * those things. Inventing them is the cheapest possible way to lose the trust
 * the rest of the shell is built to earn. What is here instead: real routes,
 * and the simulated-trading disclosure treated as content — its own band, its
 * own heading, body-size text — rather than 10px grey hidden at the bottom.
 */
export function PublicFooter({ LinkComponent: Link }: PublicFooterProps) {
  return (
    <footer className="border-t border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-base)]">
      {/* ── Bande 1 : la proposition de clôture ── */}
      <div className="border-b border-[color:var(--wariba-seam)]">
        <div className="mx-auto flex max-w-[var(--wariba-shell-max)] flex-col gap-6 px-[var(--wariba-shell-gutter)] py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--wariba-on-dark)] sm:text-3xl">
              Quinze offres. Trois parcours. Aucune règle cachée.
            </p>
            <p className="mt-2 max-w-xl text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
              Comparez les parcours et lisez les règles avant de choisir.
            </p>
          </div>
          <Link href="/offres" className="wariba-cta-primary shrink-0">
            Comparer les parcours
            <ArrowRightIcon size="sm" />
          </Link>
        </div>
      </div>

      {/* ── Bande 2 : navigation ── */}
      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-14">
        <nav aria-label="Pied de page">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
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
      </div>

      {/* ── Bande 3 : la scène de marque ──
          Le mot-symbole occupe la largeur, posé sur un horizon cobalt. C'est
          la dernière chose que la page dit ; elle doit dire WARIBA. */}
      <div className="wariba-footer-scene">
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)]">
          <p
            aria-hidden="true"
            className="select-none text-center font-bold leading-[0.82] tracking-[-0.06em] text-[color:var(--wariba-on-dark)] opacity-[0.14]"
            style={{ fontSize: 'clamp(4rem, 19vw, 15rem)' }}
          >
            WARIBA
          </p>
        </div>
      </div>

      {/* ── Bande 4 : divulgation légale, traitée comme du contenu ── */}
      <div className="border-t border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-deep)]">
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-10">
          <h2 className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
            Environnement simulé
          </h2>
          {/*
           * La mention légale, dite à un lecteur plutôt qu'à un auditeur.
           *
           * Chaque fait est conservé : environnement simulé, nominal qui n'est
           * pas un dépôt, absence de garantie sur les résultats, prix
           * contractuels en FCFA, et conditions à remplir avant un payout
           * (UX-016 `LOCKED` — la nature simulée est répétée aux moments
           * critiques).
           */}
          <p className="mt-4 max-w-5xl text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
            WARIBA est un environnement de trading entièrement simulé. Le montant affiché sur un
            compte est une unité de simulation : ce n’est ni un dépôt, ni un compte de courtage, ni
            de l’argent qui vous est confié. Des résultats passés, réels ou simulés, ne garantissent
            aucun résultat futur. Les prix sont contractuels en FCFA ; les équivalents en USD sont
            donnés à titre indicatif. Un payout n’est possible qu’après avoir rempli les conditions
            attachées à votre compte, et WARIBA ne promet aucun compte réel à l’issue du parcours.
          </p>
          <p className="mt-6 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
            © 2026 WARIBA. Bêta privée — documents juridiques en validation locale.
          </p>
        </div>
      </div>
    </footer>
  );
}
