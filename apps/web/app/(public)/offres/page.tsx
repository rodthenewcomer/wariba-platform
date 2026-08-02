import Link from 'next/link';
import { Badge, buttonClassNames, Card, Text } from '@wariba/ui';
import { listActiveProducts } from '@wariba/application';
import { getDb } from '../../../lib/db';

// Live pricing/catalog — never statically cached from build time.
export const dynamic = 'force-dynamic';

function formatFcfa(amount: string): string {
  return `${Number.parseInt(amount, 10).toLocaleString('fr-FR')} FCFA`;
}

function formatUsd(amount: string): string {
  return `${Number.parseInt(amount, 10).toLocaleString('fr-FR')} USD`;
}

export default async function OffersPage() {
  const db = getDb();
  const offers = await listActiveProducts(db);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <Text as="h1" variant="display-md">
          Choisissez votre évaluation
        </Text>
        <Text variant="body-lg" color="secondary">
          Compte 100 % simulé. La taille nominale n&apos;est pas un dépôt vous appartenant.
        </Text>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {offers.map((offer) => (
          <Card key={offer.code} padding="comfortable" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Text as="h2" variant="heading-md">
                WARIBA ONE — {offer.code}
              </Text>
              {offer.code === '10K' && <Badge variant="information">Offre principale</Badge>}
            </div>
            <Text variant="data-lg">{formatUsd(offer.nominalBalance)}</Text>
            <Text variant="body-sm" color="secondary">
              Objectif 8 % · Perte quotidienne 4 % · Perte maximale 8 % statique
            </Text>
            <div className="mt-2 flex items-center justify-between">
              <Text variant="heading-sm">{formatFcfa(offer.priceAmount)}</Text>
              <Link href={`/checkout?product=${offer.code}`} className={buttonClassNames()}>
                Commencer
              </Link>
            </div>
            <Text variant="body-sm" color="tertiary">
              Aucun frais d&apos;activation.
            </Text>
          </Card>
        ))}
      </div>

      <Text variant="body-sm" color="tertiary">
        Règles complètes disponibles avant tout paiement. Nature simulée — aucun capital réel en V1.
      </Text>
    </div>
  );
}
