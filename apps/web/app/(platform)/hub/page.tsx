import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AccountContext,
  Alert,
  buttonClassNames,
  Card,
  EmptyState,
  PolicyVersionChip,
  Text,
} from '@wariba/ui';
import { getLatestAccountForUser } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

function formatUsd(amount: string): string {
  return `${Number.parseInt(amount, 10).toLocaleString('fr-FR')} USD`;
}

const STATUS = {
  active: { label: 'Actif', variant: 'success' },
  soft_locked: { label: 'Verrou souple', variant: 'warning' },
  pass_pending: { label: 'Passage en revue', variant: 'information' },
  inactive: { label: 'Inactif', variant: 'neutral' },
  passed: { label: 'Réussi', variant: 'success' },
  breached: { label: 'Violation', variant: 'danger' },
  closed: { label: 'Fermé', variant: 'neutral' },
} as const;

export default async function HubPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/hub');

  const account = await getLatestAccountForUser(getDb(), { userId: user.id });
  if (!account) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="Aucun compte WARIBA ONE"
          description="Choisissez une évaluation pour activer votre premier compte simulé."
          action={
            <Link href="/offres" className={buttonClassNames()}>
              Voir les cinq offres
            </Link>
          }
        />
      </div>
    );
  }

  const status = STATUS[account.status as keyof typeof STATUS] ?? {
    label: account.status,
    variant: 'neutral' as const,
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <AccountContext
        program="WARIBA ONE"
        nominalFormatted={formatUsd(account.nominalBalance)}
        publicId={account.publicId}
        statusLabel={status.label}
        statusVariant={status.variant}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          Votre compte
        </Text>
        <PolicyVersionChip version={account.policyVersion} status={account.policyStatus} />
      </div>

      <Alert level="information" title="Suivi de progression à venir">
        Le compte et sa policy sont bien réels ; seul l&apos;environnement de trading est simulé.
        Les calculs de target, DLL, perte maximale, consistance et journées qualifiées ne
        s&apos;affichent qu&apos;une fois produits par le moteur serveur — aucune donnée de
        progression n&apos;est inventée entre-temps.
      </Alert>

      <Card padding="comfortable" className="flex flex-col gap-4">
        <Text as="h2" variant="heading-sm">
          Prochaine action disponible
        </Text>
        <Text variant="body-sm" color="secondary">
          Le Trading Core déterministe est actif pour cinq instruments. Toute exécution reste
          simulée, tarifée et enregistrée côté serveur.
        </Text>
        <Link href="/trade" className={buttonClassNames({ className: 'self-start' })}>
          Ouvrir WariX
        </Link>
      </Card>
    </div>
  );
}
