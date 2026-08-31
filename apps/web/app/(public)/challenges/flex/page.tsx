import type { Metadata } from 'next';
import { listCanonicalV2Offers } from '@wariba/application';
import { ProductJourneyPage } from '../../../../components/commerce/ProductJourneyPage';
import { getDb } from '../../../../lib/db';
import { isLocalSandboxCommerce, loadWebConfig } from '../../../../lib/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'WARIBA FLEX — Commencer léger, activer après réussite',
  description: 'Le parcours WARIBA FLEX V2 et son prix d’activation figé dès l’achat.',
};

export default async function FlexPage() {
  return (
    <ProductJourneyPage
      family="WARIBA_FLEX"
      offers={await listCanonicalV2Offers(getDb())}
      sandboxCheckoutAvailable={isLocalSandboxCommerce(loadWebConfig())}
    />
  );
}
