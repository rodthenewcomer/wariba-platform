import { Suspense } from 'react';
import { listCanonicalV2Offers } from '@wariba/application';
import { Skeleton } from '@wariba/ui';
import { OfferConfigurator } from '../../../components/commerce/OfferConfigurator';
import { getDb } from '../../../lib/db';
import { isLocalSandboxCommerce, loadWebConfig } from '../../../lib/config';
import { OffresHeroV2 } from '../../../components/offers-v2/OffresHeroV2';
import { OffresProofStrip } from '../../../components/offers-v2/OffresProofStrip';
import { OffresFaqSection } from '../../../components/offers-v2/OffresFaqSection';
import { FinalDecisionSection } from '../../../components/offers-v2/FinalDecisionSection';
import { StickyConversionDock } from '../../../components/offers-v2/StickyConversionDock';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const offers = await listCanonicalV2Offers(getDb());
  const sandboxCheckoutAvailable = isLocalSandboxCommerce(loadWebConfig());

  const fallback =
    offers.find((offer) => offer.productFamily === 'WARIBA_ONE' && offer.sizeCode === '10K') ??
    offers[0]!;

  return (
    <>
      <OffresHeroV2 />
      <OffresProofStrip />

      <Suspense fallback={<ConfiguratorSkeleton />}>
        <OfferConfigurator offers={offers} sandboxCheckoutAvailable={sandboxCheckoutAvailable} />
      </Suspense>

      <OffresFaqSection />
      <FinalDecisionSection
        offers={offers}
        fallback={fallback}
        sandboxCheckoutAvailable={sandboxCheckoutAvailable}
      />
      <StickyConversionDock
        offers={offers}
        fallback={fallback}
        sandboxCheckoutAvailable={sandboxCheckoutAvailable}
      />
    </>
  );
}

/**
 * The configurator's placeholder, shaped like the configurator.
 *
 * Three choice cards, five size pills, a two-column summary with ten
 * specification rows and a price panel — the same geometry the real thing
 * occupies, so nothing shifts when it arrives.
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

        <div className="commerce-summary mt-8">
          <div className="commerce-summary-main">
            <div className="grid grid-cols-6 gap-2">
              <Skeleton height="0.7rem" width="3rem" />
              {[0, 1, 2, 3, 4].map((col) => (
                <Skeleton key={col} index={col} height="4.5rem" rounded="md" />
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, row) => (
                <div key={row} className="grid grid-cols-6 items-center gap-2">
                  <Skeleton index={row} height="0.75rem" width="6rem" />
                  {[0, 1, 2, 3, 4].map((col) => (
                    <Skeleton key={col} index={row + col} height="1rem" rounded="full" />
                  ))}
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
