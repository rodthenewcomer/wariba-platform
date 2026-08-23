import type { OfferCatalog } from '@wariba/application';
import { ActionLink } from '../../../components/hub/Action';
import { HubIcon } from '../../../components/hub/icons';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';
import { Stagger, StaggerItem } from '../../../components/motion/primitives';

/**
 * The Hub with no account yet.
 *
 * ## Why the old version was the wrong shape
 *
 * It was one card in a `max-w-2xl`: a title, a sentence and a button, on the
 * single most valuable surface inside the authenticated product. Someone who
 * has created an account, confirmed an email and signed in has already done
 * the hard part of converting — and arrived at a page that tells them less
 * about WARIBA than the public marketing site they came from.
 *
 * ## What replaces it, and where every word comes from
 *
 * The sizes and prices are `buildOfferCatalog`, the same authoritative source
 * the configurator reads. The rules are the published policy, read from the
 * same catalog, so a trader comparing this against `/comptes/nouveau` sees
 * identical figures rather than two hand-maintained copies. The lifecycle is
 * the real programme structure.
 *
 * ## What is deliberately absent
 *
 * No community, no leaderboard, no achievements, no testimonials, no
 * countdown, no "1 247 traders funded this month" — §36's list, all of which
 * would need a backend that does not exist. What is here is real, and it is
 * enough: a trader deciding whether to spend money wants the sizes, the
 * prices, the rules and the shape of the journey.
 */
export function Launchpad({ catalog }: { catalog: OfferCatalog }) {
  /*
   * Four sizes at most on the hero row. The catalog can hold more, and a
   * seven-across grid of price chips at 1440 is a pricing table, not a
   * decision — the rest stay one click away behind the configurator, which is
   * the surface built to compare them.
   */
  const featured = catalog.offers.slice(0, 4);
  const hasMore = catalog.offers.length > featured.length;

  // Read off the first offer rather than restated: whatever the published
  // policy says, this says. An empty catalog renders no rules at all instead
  // of a plausible-looking default.
  const rules = catalog.offers[0]?.rules ?? [];

  return (
    <Stagger className="flex flex-col gap-5">
      <StaggerItem>
        <Surface tone="accent" className="overflow-hidden">
          <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0 max-w-xl">
              <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
                Bienvenue dans WARIBA
              </p>
              <h2 className="mt-2 text-[length:var(--wariba-font-size-heading-md)] font-bold leading-tight tracking-[-0.015em] text-[color:var(--wariba-text-primary)]">
                Commencez votre première évaluation
              </h2>
              <p className="mt-3 text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                Tradez un capital simulé dans WariX et progressez selon les règles publiées.
                Atteignez l’objectif sans dépasser vos limites, et passez en compte WARIBA
                Performance.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ActionLink href="/comptes/nouveau" size="lg" icon="addAccount" data-testid="launchpad-primary">
                  Choisir une évaluation
                </ActionLink>
                <ActionLink href="/programme#regles" variant="ghost" size="lg">
                  Voir les règles
                </ActionLink>
              </div>
            </div>

            {featured.length > 0 ? (
              <div className="w-full shrink-0 lg:w-auto">
                <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                  Tailles disponibles
                </p>
                <ul className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2">
                  {featured.map((offer) => (
                    <li key={offer.product.code}>
                      <a
                        href={`/comptes/nouveau?taille=${encodeURIComponent(offer.product.code)}`}
                        className="flex min-h-[76px] flex-col justify-center rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] px-3.5 py-3 transition-colors hover:border-[color:var(--wariba-accent-indigo-edge)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-accent-indigo)]"
                      >
                        <span className="wariba-data text-[length:var(--wariba-font-size-label-lg)] font-semibold text-[color:var(--wariba-text-primary)]">
                          {offer.nominalFormatted}
                        </span>
                        <span className="wariba-data mt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                          {offer.priceFormatted}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                {hasMore ? (
                  <p className="mt-2.5">
                    <a
                      href="/comptes/nouveau"
                      className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-accent-indigo)] underline-offset-4 hover:underline"
                    >
                      Voir toutes les tailles
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Surface>
      </StaggerItem>

      <StaggerItem>
        <Surface className="p-5 sm:p-6">
          <SurfaceTitle>Comment WARIBA fonctionne</SurfaceTitle>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Évaluation',
                body: 'Vous tradez un compte simulé et visez l’objectif de profit, sans dépasser la perte quotidienne ni la perte maximale.',
              },
              {
                step: '2',
                title: 'Validation',
                body: 'Objectif atteint et règles respectées, WARIBA vérifie la conformité de votre historique.',
              },
              {
                step: '3',
                title: 'WARIBA Performance',
                body: 'Votre compte devient un compte Performance. Vos payouts deviennent possibles une fois les conditions du cycle remplies.',
              },
            ].map((phase) => (
              <li
                key={phase.step}
                className="rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] p-4"
              >
                <span
                  className="wariba-data inline-flex h-6 w-6 items-center justify-center rounded-full text-[length:var(--wariba-font-size-label-sm)] font-semibold"
                  style={{
                    background: 'var(--wariba-accent-indigo-wash)',
                    color: 'var(--wariba-accent-indigo)',
                  }}
                >
                  {phase.step}
                </span>
                <p className="mt-2.5 text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                  {phase.title}
                </p>
                <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                  {phase.body}
                </p>
              </li>
            ))}
          </ol>
        </Surface>
      </StaggerItem>

      <div className="grid gap-5 xl:grid-cols-2">
        <StaggerItem>
          <Surface className="h-full p-5 sm:p-6">
            <SurfaceTitle>Les règles publiées</SurfaceTitle>
            {rules.length > 0 ? (
              <>
                <dl className="mt-4 flex flex-col gap-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.label}
                      className="flex items-baseline justify-between gap-4 border-b border-[color:var(--warix-border-subtle)] pb-3 last:border-0 last:pb-0"
                    >
                      <dt className="min-w-0 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                        {rule.label}
                      </dt>
                      <dd className="wariba-data shrink-0 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                        {rule.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {catalog.policyVersion ? (
                  <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    Version des règles{' '}
                    <span className="wariba-data">{catalog.policyVersion}</span>
                    {' · '}
                    exemple pour {catalog.offers[0]?.nominalFormatted}
                  </p>
                ) : null}
              </>
            ) : (
              /* No published policy readable — say so rather than show a
                 plausible default nobody will be held to. */
              <p className="mt-4 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                Les règles publiées ne sont pas consultables pour le moment.
              </p>
            )}
          </Surface>
        </StaggerItem>

        <StaggerItem>
          <Surface className="flex h-full flex-col p-5 sm:p-6">
            <SurfaceTitle>WariX est inclus</SurfaceTitle>
            <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              Chaque compte WARIBA donne accès à WariX, la station de trading intégrée : graphiques,
              carnet d’ordres, positions, protections et historique. Aucune plateforme externe à
              installer.
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {[
                'Exécution simulée sur données de marché réelles',
                'Stop loss et take profit sur chaque position',
                'Suivi du risque en direct pendant la séance',
                'Historique complet de vos exécutions',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]"
                >
                  <span
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--wariba-accent-emerald)' }}
                    aria-hidden="true"
                  >
                    <HubIcon role="success" size={16} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Une question avant de commencer ?{' '}
              <a
                href="/support"
                className="text-[color:var(--wariba-accent-indigo)] underline-offset-4 hover:underline"
              >
                Contacter le support
              </a>
            </p>
          </Surface>
        </StaggerItem>
      </div>
    </Stagger>
  );
}
