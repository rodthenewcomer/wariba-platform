import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccountContext, buttonClassNames, EmptyState, Text } from '@wariba/ui';
import { listAccountsForUser } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending_activation: 'Activation en attente',
  active: 'Actif',
  soft_locked: 'Blocage temporaire',
  pass_pending: 'Passage en attente',
  inactive: 'Inactif',
  passed: 'Objectif validé',
  breached: 'Limite maximale dépassée',
  closed: 'Compte terminé',
};

const STATUS_VARIANT: Record<string, 'neutral' | 'information' | 'success' | 'warning' | 'danger'> =
  {
    pending_activation: 'neutral',
    active: 'success',
    soft_locked: 'warning',
    pass_pending: 'information',
    inactive: 'neutral',
    passed: 'success',
    breached: 'danger',
    closed: 'neutral',
  };

function formatNominal(amount: string, currency: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} ${currency}`;
}

/** UX Architecture §20.5 — une carte par compte, jamais de métriques fusionnées. */
export default async function AccountsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/comptes');

  const accounts = await listAccountsForUser(getDb(), { userId: user.id });

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Comptes
      </Text>
      {accounts.length === 0 ? (
        <EmptyState
          title="Aucun compte WARIBA ONE"
          description="Choisissez une évaluation pour activer votre premier compte simulé."
          action={
            <Link href="/offres" className={buttonClassNames()}>
              Voir les cinq offres
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/hub?account=${account.id}`} className="block">
              <AccountContext
                program={account.programType === 'WARIBA_ONE' ? 'WARIBA ONE' : 'WARIBA Performance'}
                nominalFormatted={formatNominal(account.nominalBalance, account.nominalCurrency)}
                publicId={account.publicId}
                statusLabel={STATUS_LABEL[account.status] ?? account.status}
                statusVariant={STATUS_VARIANT[account.status] ?? 'neutral'}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
