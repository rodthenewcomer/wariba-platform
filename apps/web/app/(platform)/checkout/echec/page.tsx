import Link from 'next/link';
import { Alert, buttonClassNames, Card, Text } from '@wariba/ui';

export default function CheckoutFailedPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Paiement échoué
          </Text>
          <Text variant="body-sm" color="secondary">
            Aucun compte n&apos;a été activé et aucun montant n&apos;a été débité.
          </Text>
        </div>
        <Alert level="danger" title="Le paiement n'a pas abouti">
          Vous pouvez réessayer sans créer une nouvelle commande.
        </Alert>
        <Link href="/offres" className={buttonClassNames({ size: 'lg' })}>
          Retour aux offres
        </Link>
      </Card>
    </div>
  );
}
