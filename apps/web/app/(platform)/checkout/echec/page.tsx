import Link from 'next/link';
import { Alert, buttonClassNames, Card, Text } from '@wariba/ui';

/*
 * Never prerendered — see the platform layout.
 *
 * Any page under `(platform)` renders `HubShell`, which builds a Supabase
 * server client and validates the full server config. A page without this
 * directive is therefore rendered at *build* time and drags DATABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY and the webhook secret into the build inputs —
 * which, in a container build, means passing secrets as build arguments that
 * stay readable in image history forever.
 *
 * Every one of these pages is per-user or per-order and has nothing static to
 * emit, so the directive costs nothing and removes the trap.
 */
export const dynamic = 'force-dynamic';

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
