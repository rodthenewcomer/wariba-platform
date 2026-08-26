import { redirect } from 'next/navigation';
import {
  CONTESTATION_REASON_CATEGORIES,
  CONTESTATION_REASON_LABELS,
  listAccountsForUser,
  listContestableDecisionOptions,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getDb } from '../../../../lib/db';
import { ActionLink } from '../../../../components/hub/Action';
import { HubEmptyState } from '../../../../components/hub/HubEmptyState';
import { PageHeader } from '../../../../components/hub/PageHeader';
import { ContestationForm } from './ContestationForm';

export const dynamic = 'force-dynamic';

/**
 * Ouvrir une contestation.
 *
 * ## Every gate is server-side, and there are five of them
 *
 * §8 names the checks and they run here and again in the command: the user is
 * authenticated; the account is theirs (membership in their own account list —
 * never a lookup that would confirm an id exists); a contestable decision is
 * actually recorded against it; the trader can only choose from those
 * decisions; and a second live contestation for the same one is refused.
 *
 * The page renders nothing to select when no decision qualifies. That is the
 * honest state: a contestation challenges something WARIBA decided, and an
 * account with no recorded restriction has nothing to challenge.
 */
export default async function NewContestationPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/support');

  const { account: requestedAccount } = await searchParams;
  const db = getDb();
  const accounts = await listAccountsForUser(db, { userId: user.id });

  const account =
    accounts.find((candidate) => candidate.id === requestedAccount) ??
    // Falling back to the account that actually has something to contest is
    // more useful than an error page for a trader who arrived without the
    // parameter — and it can only ever pick one of their own.
    accounts.find((candidate) => candidate.status === 'breached') ??
    accounts[0];

  if (!account) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="shield"
          title="Aucune décision à contester."
          description="Une contestation porte sur une décision enregistrée par WARIBA sur l’un de vos comptes."
          action={
            <ActionLink href="/support" variant="secondary">
              Retour au support
            </ActionLink>
          }
        />
      </div>
    );
  }

  const decisions = await listContestableDecisionOptions(db, {
    userId: user.id,
    accountId: account.id,
  });

  if (decisions.length === 0) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="shield"
          title="Aucune décision à contester sur ce compte."
          description={`Aucune décision de risque restreignant ${account.publicId} n’est enregistrée. Pour une question, ouvrez une demande de support.`}
          action={
            <ActionLink href="/support/nouveau?category=risk" variant="secondary">
              Ouvrir une demande
            </ActionLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader
        description={`Compte ${account.publicId}. Une contestation est examinée par un opérateur au regard des preuves enregistrées. Elle ne modifie jamais l’historique du compte.`}
      />
      <ContestationForm
        accountId={account.id}
        decisions={decisions}
        reasons={CONTESTATION_REASON_CATEGORIES.map((value) => ({
          value,
          label: CONTESTATION_REASON_LABELS[value],
        }))}
      />
    </div>
  );
}
