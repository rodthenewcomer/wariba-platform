import type { Metadata } from 'next';
import { listCanonicalV2Offers } from '@wariba/application';
import { ProductJourneyPage } from '../../../../components/commerce/ProductJourneyPage';
import { getDb } from '../../../../lib/db';
import { isLocalSandboxCommerce, loadWebConfig } from '../../../../lib/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'WARIBA ONE — Evaluation puis Performance',
  description: 'Le parcours WARIBA ONE V2 : règles exactes, cinq tailles et paiement unique.',
};

export default async function OnePage() {
  return (
    <ProductJourneyPage
      family="WARIBA_ONE"
      offers={await listCanonicalV2Offers(getDb())}
      sandboxCheckoutAvailable={isLocalSandboxCommerce(loadWebConfig())}
    />
  );
}
