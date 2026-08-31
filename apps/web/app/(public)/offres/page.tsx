import { Suspense } from 'react';
import Link from 'next/link';
import { listCanonicalV2Offers } from '@wariba/application';
import { AccountToken, Skeleton } from '@wariba/ui';
import { OfferConfigurator } from '../../../components/commerce/OfferConfigurator';
import { Reveal } from '../../../components/motion/Reveal';
import { FAMILY_META, FAMILY_ORDER, formatRate } from '../../../components/commerce/offer-ui';
import { getDb } from '../../../lib/db';
import { isLocalSandboxCommerce, loadWebConfig } from '../../../lib/config';

export const dynamic = 'force-dynamic';

const FAMILY_TOKEN = {
  WARIBA_ONE: 'one',
  WARIBA_FLEX: 'flex',
  WARIBA_INSTANT: 'instant',
} as const;

export default async function OffersPage() {
  const offers = await listCanonicalV2Offers(getDb());
  const sandboxCheckoutAvailable = isLocalSandboxCommerce(loadWebConfig());
  const references = FAMILY_ORDER.map((family) =>
    offers.find((offer) => offer.productFamily === family && offer.sizeCode === '10K'),
  ).filter((offer) => offer !== undefined);

  return (
    <>
      <section className="commerce-hero commerce-ambient">
        <div className="commerce-shell pb-16 pt-16 lg:pb-20 lg:pt-24">
          <p className="commerce-kicker">Trois parcours · cinq tailles de compte</p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
            <h1 className="commerce-display">Choisissez comment vous voulez commencer.</h1>
            <div>
              <p className="commerce-lead">
                Regardez ONE, FLEX et INSTANT avant le prix. Chaque choix vous dit ce que vous payez
                aujourd’hui, ce qui vient ensuite, et où sont les limites.
              </p>
              <p className="mt-5 text-sm font-medium text-[color:var(--wariba-color-ink-300)]">
                Prix en FCFA · environnement entièrement simulé
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="commerce-band">
        <div className="commerce-shell grid gap-5 py-14 lg:grid-cols-3">
          {references.map((offer, index) => {
            const meta = FAMILY_META[offer.productFamily];
            const target = offer.evaluationRules?.profitTargetRate;
            return (
              <Reveal key={offer.offerId} delay={index * 0.07}>
                <article className="commerce-panel flex h-full items-start gap-5 p-5">
                  <AccountToken
                    sizeCode={offer.sizeCode}
                    family={FAMILY_TOKEN[offer.productFamily]}
                    width={104}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="commerce-choice-index">{meta.short}</p>
                    <h2 className="mt-2 text-lg font-semibold text-[color:var(--wariba-color-ink-50)]">
                      {meta.eyebrow}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                      {target
                        ? `Objectif ${formatRate(target)} · Perte maximale ${formatRate(offer.evaluationRules!.maximumLossRate)}`
                        : `Sans évaluation · Perte maximale ${formatRate(offer.performanceRules.maximumLossRate)}`}
                    </p>
                    <Link
                      href={meta.path}
                      className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[color:var(--wariba-color-cobalt-300)] transition-colors hover:text-[color:var(--wariba-color-cobalt-400)]"
                    >
                      Voir {meta.short} →
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <Suspense fallback={<ConfiguratorSkeleton />}>
        <OfferConfigurator offers={offers} sandboxCheckoutAvailable={sandboxCheckoutAvailable} />
      </Suspense>

      <section className="commerce-performance-island">
        <div className="commerce-shell grid gap-10 py-20 lg:grid-cols-2 lg:items-start lg:py-24">
          <Reveal>
            <p className="commerce-kicker">Ce que vous achetez</p>
            <h2 className="commerce-section-title mt-5">
              Un cadre pour progresser. Pas une promesse de gain.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                'Le trading, les soldes et les résultats sont simulés. Le nominal n’est jamais un dépôt.',
                'Les règles acceptées sont versionnées, horodatées et attachées à chaque compte.',
                'Le serveur décide des prix d’exécution, du risque, du passage et du versement.',
                'Aucun compte réel, aucun résultat futur, aucune disponibilité de paiement n’est garantie.',
              ].map((claim) => (
                <li
                  key={claim}
                  className="commerce-well p-4 text-sm leading-relaxed text-[color:var(--wariba-color-ink-200)]"
                >
                  {claim}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/**
 * The configurator's placeholder, shaped like the configurator.
 *
 * Three choice cards, five size pills, a two-column summary with ten
 * specification rows and a price panel — the same geometry the real thing
 * occupies, so nothing shifts when it arrives. The old fallback was a single
 * pulsing 44rem block, which reserved roughly the right height and told the
 * reader nothing about what was coming.
 */
function ConfiguratorSkeleton() {
  return (
    <section className="py-20 lg:py-28" aria-hidden="true">
      <div className="commerce-shell">
        <Skeleton height="0.75rem" width="14rem" />
        <Skeleton className="mt-5" height="2.75rem" width="min(38rem, 100%)" rounded="md" />

        <div className="mt-10 grid gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div key={card} className="commerce-panel p-5">
              <Skeleton index={card} height="0.7rem" width="3.5rem" />
              <Skeleton index={card} className="mt-4" height="1.1rem" width="70%" />
              <Skeleton index={card} className="mt-3" height="0.7rem" />
              <Skeleton index={card} className="mt-2" height="0.7rem" width="80%" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((pill) => (
            <Skeleton key={pill} index={pill} height="48px" rounded="full" />
          ))}
        </div>

        <div className="commerce-summary mt-8">
          <div className="commerce-summary-main">
            <Skeleton height="0.7rem" width="9rem" />
            <Skeleton className="mt-3" height="2rem" width="80%" />
            <div className="mt-8 flex flex-col gap-4">
              {Array.from({ length: 8 }, (_, row) => (
                <div key={row} className="flex items-center justify-between gap-6">
                  <Skeleton index={row} height="0.75rem" width="9rem" />
                  <Skeleton index={row} height="1.6rem" width="4.5rem" rounded="full" />
                </div>
              ))}
            </div>
          </div>
          <div className="commerce-price-panel">
            <Skeleton height="0.7rem" width="7rem" />
            <Skeleton className="mt-3" height="2.4rem" width="11rem" />
            <Skeleton className="mt-8" height="50px" rounded="full" />
          </div>
        </div>
      </div>
    </section>
  );
}
