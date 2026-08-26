import { redirect } from 'next/navigation';
import {
  buildPayoutLifecycle,
  listAccountsForUser,
  type AccountSummaryDTO,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { loadWebConfig } from '../../../lib/config';
import { ActionLink } from '../../../components/hub/Action';
import { HubEmptyState } from '../../../components/hub/HubEmptyState';
import { PageHeader } from '../../../components/hub/PageHeader';
import { Stagger, StaggerItem } from '../../../components/motion/primitives';
import { AccountSwitcher } from '../hub/AccountSwitcher';
import { toSwitcherAccounts } from '../hub/switcher-accounts';
import { PayoutCenterClient } from './PayoutCenterClient';
import { PayoutStatus } from './PayoutStatus';

// Live cycle/payout state comes from the account snapshot — never statically
// cached, same reasoning as /hub and /trade.
export const dynamic = 'force-dynamic';

/**
 * The canonical Payout surface.
 *
 * The payout command, its eligibility rules and its result handling are the
 * certified Prompt 08 ones and are unchanged — `PayoutCenterClient` still owns
 * them. What Phase 2 adds above it is the answer to the question a trader
 * actually arrives with: can I be paid, and if not, why.
 *
 * Account resolution follows UX-NAV-002: candidates come from
 * `listAccountsForUser` for the authenticated user, so an account belonging to
 * someone else is absent from the list and cannot be selected.
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

  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="payouts"
          title="Aucun payout pour le moment."
          description="Les payouts s’ouvrent sur un compte Performance. Réussissez d’abord une évaluation WARIBA ONE."
          action={
            <ActionLink href="/comptes/nouveau" icon="addAccount">
              Choisir une évaluation
            </ActionLink>
          }
        />
      </div>
    );
  }

  // Honest state for an Evaluation-only trader — never a payout form that
  // cannot be submitted.
  if (performanceAccounts.length === 0) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="payouts"
          title="Aucun payout pour le moment."
          description="Le Payout Center s’ouvre sur un compte WARIBA Performance. Votre progression vers celui-ci est suivie dans le tableau de bord."
          action={
            <ActionLink href="/hub" variant="secondary">
              Voir ma progression
            </ActionLink>
          }
        />
      </div>
    );
  }

  const { account: requestedAccountId } = await searchParams;
  const activeAccount =
    performanceAccounts.find((candidate) => candidate.id === requestedAccountId) ??
    (performanceAccounts[0] as AccountSummaryDTO);

  const payout = await buildPayoutLifecycle(db, {
    accountId: activeAccount.id,
    kycVerified: activeAccount.kycSandboxVerified,
  });

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <AccountSwitcher
        accounts={toSwitcherAccounts(performanceAccounts)}
        activeAccountId={activeAccount.id}
        basePath="/payouts"
      />

      <PageHeader description="Seul l’excédent au-dessus du buffer permanent est disponible. Le buffer, lui, ne se retire jamais.">
        {/*
         * The account's public reference, at footnote weight.
         *
         * A payout page has to say which account it is paying out — it is the
         * value support asks for, and on a trader with several Performance
         * accounts it is the only thing that tells two of them apart. It is a
         * footnote rather than a headline for the same reason it is one on the
         * dashboard: it identifies, it does not inform.
         */}
        <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          {activeAccount.publicId}
        </span>
      </PageHeader>

      <Stagger className="flex flex-col gap-5">
        <StaggerItem>
          <PayoutStatus payout={payout} />
        </StaggerItem>

        <StaggerItem>
          <PayoutCenterClient
            accountId={activeAccount.id}
            wsUrl={loadWebConfig().NEXT_PUBLIC_REALTIME_WS_URL}
          />
        </StaggerItem>
      </Stagger>
    </div>
  );
}
