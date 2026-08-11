import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buttonClassNames, EmptyState, Text } from '@wariba/ui';
import { listAccountsForUser, type AccountSummaryDTO } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { loadWebConfig } from '../../../lib/config';
import {
  accountStatusLabel,
  accountStatusVariant,
  formatNominal,
  programLabel,
  programPhaseLabel,
  programShortLabel,
} from '../../../lib/account-display';
import { resolveWorkstationAccount } from './account-selection';
import { TradeClient } from './TradeClient';
import type { WorkstationAccountOption } from './workstation/WorkstationAccountSwitcher';

// Live trading state (account, positions, WS URL) — never statically
// cached from build time. Also avoids requiring runtime secrets at build
// time (CI runs `pnpm build` with no env vars set, same as offres/page.tsx).
export const dynamic = 'force-dynamic';

/** UX-NAV-001 — a search param on this same route segment, resolved server-side. */
function tradeAccountHref(accountId: string): string {
  return `/trade?account=${accountId}`;
}

function toSwitcherOption(account: AccountSummaryDTO): WorkstationAccountOption {
  return {
    id: account.id,
    href: tradeAccountHref(account.id),
    programLabel: programLabel(account.programType),
    programShortLabel: programShortLabel(account.programType),
    phaseLabel: programPhaseLabel(account.programType),
    nominalFormatted: formatNominal(account.nominalBalance, account.nominalCurrency),
    publicId: account.publicId,
    statusLabel: accountStatusLabel(account.status),
    statusVariant: accountStatusVariant(account.status),
  };
}

/**
 * WariX's entry point, and the only place account identity is decided.
 *
 * W1 §5 — everything about the selection happens on the server:
 *
 * - the account list comes from `listAccountsForUser`, the same canonical
 *   read model the Hub selector and `/comptes` already use, so "latest",
 *   "active" and "tradable" cannot mean one thing in the Hub and another
 *   here;
 * - `?account=` is matched **against that list**, which is scoped to the
 *   authenticated user's id. An account belonging to someone else simply
 *   does not appear in it, so a foreign identifier can never resolve —
 *   there is no branch in which a non-owned account is loaded, and none in
 *   which its status, balance or program leaks. It falls through to the
 *   trader's own default exactly as an unknown id does;
 * - with no `?account=`, the default is `accounts[0]` — the first entry of
 *   the canonical attention-first ordering, identical to the Hub's default.
 *
 * The client is then handed one already-validated account plus the trader's
 * own switcher options; it never asks for an account and is never trusted to
 * pick one.
 */
export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/trade');
  }

  const db = getDb();
  const accounts = await listAccountsForUser(db, { userId: user.id });

  if (accounts.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState
          title="Aucun compte de trading"
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

  const { account: requestedAccountId } = await searchParams;
  const activeAccount = resolveWorkstationAccount(accounts, requestedAccountId);
  if (!activeAccount) redirect('/hub');

  if (activeAccount.status !== 'active') {
    // Program-accurate copy: the pre-W1 empty state asserted "compte WARIBA
    // ONE actif" for every account context, which is wrong for a
    // WARIBA_PERFORMANCE trader (W0 §3A.4).
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-16">
        <Text as="h1" variant="heading-lg">
          Trading indisponible
        </Text>
        <Text variant="body-sm" color="secondary">
          Votre compte {programLabel(activeAccount.programType)} {activeAccount.publicId} est «{' '}
          {accountStatusLabel(activeAccount.status)} ». Le terminal n&apos;accepte d&apos;ordres que
          sur un compte actif.
        </Text>
        <div className="flex flex-wrap gap-3">
          <Link href="/hub" className={buttonClassNames({ variant: 'secondary' })}>
            Retour au Hub
          </Link>
          <Link href="/offres" className={buttonClassNames()}>
            Voir les offres
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TradeClient
      accountId={activeAccount.id}
      accountPublicId={activeAccount.publicId}
      userId={user.id}
      wsUrl={loadWebConfig().NEXT_PUBLIC_REALTIME_WS_URL}
      accounts={accounts.map(toSwitcherOption)}
    />
  );
}
