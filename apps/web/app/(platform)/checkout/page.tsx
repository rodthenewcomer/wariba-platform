import { Alert } from '@wariba/ui';
import { getCheckoutContext } from '@wariba/application';
import { productCodeSchema } from '@wariba/validation';
import { getDb } from '../../../lib/db';
import { CheckoutClient } from './CheckoutClient';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const parsed = productCodeSchema.safeParse(product);
  const context = parsed.success ? await getCheckoutContext(getDb(), parsed.data) : undefined;

  if (!context) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <Alert level="danger" title="Offre introuvable">
          Retournez à la page des offres pour choisir une évaluation active.
        </Alert>
      </div>
    );
  }

  return <CheckoutClient context={context} />;
}
