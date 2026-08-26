import { redirect } from 'next/navigation';
import {
  deriveAccountLifecycle,
  buildEvaluationToPerformanceHandoff,
  listAccountsForUser,
  type AccountSummaryDTO,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { loadWebConfig } from '../../../lib/config';
import {
  accountSizeShortLabel,
  accountStatusLabel,
  accountStatusVariant,
  formatNominal,
  programLabel,
  programPhaseLabel,
  programShortLabel,
} from '../../../lib/account-display';
import { resolveWorkstationAccount } from './account-selection';
import { TradeClient } from './TradeClient';
import { WariXGate } from './WariXGate';
import type { WorkstationAccountOption } from './workstation/WorkstationAccountSwitcher';
import { trackEvent } from '../../../lib/analytics';

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
    // VX1 §7 — the selector's own size chip, rendered from the same
    // authoritative nominal the full figure above comes from.
    sizeShortLabel: accountSizeShortLabel(account.nominalBalance),
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

  /*
   * Phase 2 §19 — the workstation never opens empty.
   *
   * Every control would be inert and the chart would have nothing to price
   * against, leaving the trader to work out whether the platform is broken.
   * The gate says what is missing instead.
   */
  if (accounts.length === 0) {
    return (
      <WariXGate
        title="Commencez avec un compte WARIBA"
        description="Vous avez besoin d’un compte actif pour trader dans WariX."
        primary={{ label: 'Acheter un compte', href: '/comptes/nouveau' }}
        secondary={{ label: 'Voir les programmes', href: '/programme' }}
      />
    );
  }

  const { account: requestedAccountId } = await searchParams;
  const activeAccount = resolveWorkstationAccount(accounts, requestedAccountId);
  if (!activeAccount) redirect('/hub');

  if (activeAccount.status === 'passed' && activeAccount.performanceAccountId) {
    return (
      <WariXGate
        title="Votre évaluation est réussie"
        description={`Le trading continue désormais sur ${activeAccount.performanceAccountPublicId ?? 'votre compte Performance'}. Consultez ses règles avant votre premier trade.`}
        meta={`WARIBA ONE · ${activeAccount.publicId} · Évaluation réussie`}
        primary={{
          label: 'Découvrir mes nouvelles règles',
          href: `/comptes/${activeAccount.performanceAccountPublicId ?? activeAccount.publicId}/bienvenue-performance`,
        }}
        secondary={{ label: 'Retour au tableau de bord', href: `/hub?account=${activeAccount.id}` }}
      />
    );
  }

  if (activeAccount.status !== 'active' && activeAccount.status !== 'pass_pending') {
    /*
     * Program-accurate copy: the pre-W1 empty state asserted "compte WARIBA
     * ONE actif" for every account context, which is wrong for a
     * WARIBA_PERFORMANCE trader (W0 §3A.4). Phase 2 keeps that accuracy and
     * routes the trader by *why* the account cannot trade — a breach is a
     * reason to buy a new account, a review is a reason to wait.
     */
    const lifecycle = deriveAccountLifecycle({
      accountStatus: activeAccount.status,
      programType: activeAccount.programType,
    });

    return (
      <WariXGate
        title="Trading indisponible"
        description={lifecycle.description}
        meta={`${programLabel(activeAccount.programType)} · ${activeAccount.publicId} · ${lifecycle.label}`}
        primary={
          lifecycle.state === 'breached'
            ? { label: 'Acheter un nouveau compte', href: '/comptes/nouveau' }
            : { label: 'Retour au tableau de bord', href: '/hub' }
        }
        secondary={
          lifecycle.state === 'breached'
            ? { label: 'Retour au tableau de bord', href: '/hub' }
            : { label: 'Voir les programmes', href: '/programme' }
        }
      />
    );
  }

  if (activeAccount.programType === 'WARIBA_PERFORMANCE') {
    const handoff = await buildEvaluationToPerformanceHandoff(db, {
      userId: user.id,
      accountId: activeAccount.id,
    }).catch(() => null);
    if (!handoff?.rulesAcknowledged) {
      return (
        <WariXGate
          title="Prenez connaissance de vos règles Performance"
          description="Votre compte est actif. Cette lecture est requise avant votre premier trade et ne modifie ni le compte ni ses règles."
          meta={`WARIBA Performance · ${activeAccount.publicId}`}
          primary={{
            label: 'Voir mes règles',
            href: `/comptes/${activeAccount.publicId}/bienvenue-performance`,
          }}
          secondary={{
            label: 'Retour au tableau de bord',
            href: `/hub?account=${activeAccount.id}`,
          }}
        />
      );
    }
    trackEvent('performance_account_opened', { accountId: activeAccount.id });
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
