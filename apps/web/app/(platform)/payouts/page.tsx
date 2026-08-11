import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccountContext, AccountSelector, buttonClassNames, EmptyState, Text } from '@wariba/ui';
import { listAccountsForUser, type AccountSummaryDTO } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { loadWebConfig } from '../../../lib/config';
import {
  accountStatusLabel,
  accountStatusVariant,
  formatNominal,
  programLabel,
} from '../../../lib/account-display';
import { AccountSwitchLink } from '../hub/AccountSwitchLink';
import { PayoutCenterClient } from './PayoutCenterClient';

// Live cycle/payout state comes from the account snapshot — never statically
// cached, same reasoning as /hub and /trade.
export const dynamic = 'force-dynamic';

/** UX-NAV-001 — a search param on this same route segment, resolved server-side. */
function payoutAccountHref(accountId: string): string {
  return `/payouts?account=${accountId}`;
}

/**
 * The canonical Payout surface.
 *
 * Before W2 this route was a placeholder announcing that the Payout Center
 * "arrive avec Prompt 08" — while the working Payout Center had shipped inside
 * the WariX execution dock. W2 §15/§16 removes payout from the execution dock,
 * so this route had to become the real thing rather than the dock capability
 * simply disappearing.
 *
 * Nothing about payout was rebuilt: the panel, the command, the result
 * handling and the eligibility rules are the certified Prompt 08 ones. What
 * changed is where they are mounted.
 *
 * Account resolution follows exactly the rule WariX uses (W1 §5 / UX-NAV-002):
 * the candidate list is `listAccountsForUser` for the authenticated user, so an
 * account belonging to someone else is absent from it and cannot be selected —
 * a foreign `?account=` falls through to this trader's own default. Switching
 * is an ordinary anchor, never a client transition.
 */
export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/payouts');

  const db = getDb();
  const accounts = await listAccountsForUser(db, { userId: user.id });
  const performanceAccounts = accounts.filter(
    (account) => account.programType === 'WARIBA_PERFORMANCE',
  );

  const heading = (
    <Text as="h1" variant="heading-lg">
      Payouts
    </Text>
  );

  if (accounts.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {heading}
        <EmptyState
          title="Aucun compte WARIBA"
          description="Choisissez une évaluation pour activer votre premier compte simulé."
          action={
            <Link href="/offres" className={buttonClassNames()}>
              Voir les offres
            </Link>
          }
        />
      </div>
    );
  }

  // Honest state for an Evaluation-only trader — never a payout form that
  // cannot be submitted.
  if (performanceAccounts.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {heading}
        <EmptyState
          title="Compte Performance requis"
          description="Le Payout Center s'ouvre sur un compte WARIBA Performance. Réussissez d'abord votre évaluation WARIBA ONE — votre progression est suivie dans le Hub."
          action={
            <Link href="/hub" className={buttonClassNames()}>
              Voir ma progression
            </Link>
          }
        />
      </div>
    );
  }

  const { account: requestedAccountId } = await searchParams;
  const activeAccount =
    performanceAccounts.find((candidate) => candidate.id === requestedAccountId) ??
    (performanceAccounts[0] as AccountSummaryDTO);

  const selectorAccounts = performanceAccounts.map((account) => ({
    id: account.id,
    href: payoutAccountHref(account.id),
    program: programLabel(account.programType),
    nominalFormatted: formatNominal(account.nominalBalance, account.nominalCurrency),
    publicId: account.publicId,
    statusLabel: accountStatusLabel(account.status),
    statusVariant: accountStatusVariant(account.status),
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {heading}

      <AccountSelector
        LinkComponent={AccountSwitchLink}
        accounts={selectorAccounts}
        activeAccountId={activeAccount.id}
      />

      <AccountContext
        program={programLabel(activeAccount.programType)}
        nominalFormatted={formatNominal(
          activeAccount.nominalBalance,
          activeAccount.nominalCurrency,
        )}
        publicId={activeAccount.publicId}
        statusLabel={accountStatusLabel(activeAccount.status)}
        statusVariant={accountStatusVariant(activeAccount.status)}
      />

      <PayoutCenterClient
        accountId={activeAccount.id}
        wsUrl={loadWebConfig().NEXT_PUBLIC_REALTIME_WS_URL}
      />
    </div>
  );
}
