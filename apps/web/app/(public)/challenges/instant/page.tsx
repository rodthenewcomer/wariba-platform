import type { Metadata } from 'next';
import { listCanonicalV2Offers } from '@wariba/application';
import { ProductJourneyPage } from '../../../../components/commerce/ProductJourneyPage';
import { getDb } from '../../../../lib/db';
import { isLocalSandboxCommerce, loadWebConfig } from '../../../../lib/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'WARIBA INSTANT — Accès direct à Performance',
  description: 'Le parcours WARIBA INSTANT V2 : pas d’évaluation et règles Performance directes.',
};

export default async function InstantPage() {
  return (
    <ProductJourneyPage
      family="WARIBA_INSTANT"
      offers={await listCanonicalV2Offers(getDb())}
      sandboxCheckoutAvailable={isLocalSandboxCommerce(loadWebConfig())}
    />
  );
}
