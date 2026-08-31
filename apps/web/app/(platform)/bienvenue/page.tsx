import Link from 'next/link';
import { Alert, buttonClassNames, Card, Text } from '@wariba/ui';
import { getLatestAccountForUser } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';

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

function formatUsd(amount: string): string {
  return `${Number.parseFloat(amount).toLocaleString('fr-FR')} USD`;
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = getDb();
  const account = user
    ? await getLatestAccountForUser(db, {
        userId: user.id,
        ...(orderId !== undefined && { purchaseOrderId: orderId }),
      })
    : undefined;

  if (!account) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <Card padding="comfortable" className="flex flex-col gap-6">
          <Text as="h1" variant="heading-lg">
            Activation en cours
          </Text>
          <Alert level="information" title="Un instant">
            La confirmation de paiement est en cours de traitement. Actualisez cette page dans
            quelques secondes.
          </Alert>
        </Card>
      </div>
    );
  }

  const familyLabel = account.productFamily.replace('WARIBA_', '');
  const phaseLabel = account.programType === 'WARIBA_PERFORMANCE' ? 'Performance' : 'Evaluation';

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Bienvenue sur WARIBA
          </Text>
          <Text variant="body-sm" color="secondary">
            Compte {account.publicId} — WARIBA {familyLabel} {phaseLabel} —{' '}
            {formatUsd(account.nominalBalance)}
          </Text>
        </div>

        <Alert level="information" title="Compte simulé">
          Ce compte est un environnement de trading simulé. La taille nominale n&apos;est pas un
          dépôt vous appartenant.
        </Alert>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/hub" className={buttonClassNames({ size: 'lg', className: 'flex-1' })}>
            Voir mon compte
          </Link>
          <Link
            href="/trade"
            className={buttonClassNames({ size: 'lg', variant: 'secondary', className: 'flex-1' })}
          >
            Ouvrir WariX
          </Link>
        </div>
      </Card>
    </div>
  );
}
