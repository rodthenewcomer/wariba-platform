import { redirect } from 'next/navigation';
import {
  buildAccountHubView,
  buildPerformanceAnalytics,
  listAccountsForUser,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { ActionLink } from '../../../components/hub/Action';
import { HubEmptyState } from '../../../components/hub/HubEmptyState';
import { PageHeader } from '../../../components/hub/PageHeader';
import { PerformanceSnapshot } from '../../../components/hub/PerformanceSnapshot';
import { SegmentedFilter } from '../../../components/hub/SegmentedFilter';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';
import { Stagger, StaggerItem } from '../../../components/motion/primitives';
import { AccountSwitcher } from '../hub/AccountSwitcher';
import { toSwitcherAccounts } from '../hub/switcher-accounts';
import { HubHeaderSlot } from '../HubHeaderSlot';
import { DailyPnl } from './DailyPnl';
import { DurationBreakdown } from './DurationBreakdown';
import { SymbolBreakdown } from './SymbolBreakdown';

export const dynamic = 'force-dynamic';

/**
 * The trader's record, aggregated.
 *
 * Distinct from `/journal`: this answers "how am I doing", the journal answers
 * "what did I do". Both read the same fills; neither invents a figure. An
 * account with no closed trade gets an empty state, not a grid of zeros.
 *
 * The date range is a URL parameter, so a period is shareable and the
 * filtering happens where the data is.
 */

const RANGES = [
  { value: '7', label: '7 jours', days: 7 },
  { value: '30', label: '30 jours', days: 30 },
  { value: '90', label: '90 jours', days: 90 },
  { value: 'all', label: 'Tout', days: null },
] as const;

function resolveRange(value: string | undefined) {
  return RANGES.find((range) => range.value === value) ?? RANGES[1];
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; periode?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/performance');

  const db = getDb();
  const accounts = await listAccountsForUser(db, { userId: user.id });

  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="performance"
          title="Aucune performance à afficher."
          description="Activez un compte pour commencer à construire votre historique."
          action={
            <ActionLink href="/comptes/nouveau" icon="addAccount">
              Choisir une évaluation
            </ActionLink>
          }
        />
      </div>
    );
  }

  const { account: requestedAccountId, periode } = await searchParams;
  const activeAccount =
    accounts.find((candidate) => candidate.id === requestedAccountId) ??
    (accounts[0] as (typeof accounts)[number]);
  const range = resolveRange(periode);

  const from = range.days ? new Date(Date.now() - range.days * 24 * 60 * 60 * 1000) : undefined;

  const activated =
    activeAccount.status !== 'pending_activation' && activeAccount.status !== 'closed';

  const [analytics, hubView] = await Promise.all([
    buildPerformanceAnalytics(db, {
      accountId: activeAccount.id,
      ...(from ? { from } : {}),
    }),
    activated
      ? buildAccountHubView(db, { accountId: activeAccount.id, now: new Date() }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const rangeHref = (value: string) => `/performance?account=${activeAccount.id}&periode=${value}`;

  const filters = (
    <SegmentedFilter
      label="Période"
      active={range.value}
      options={RANGES.map((option) => ({
        value: option.value,
        label: option.label,
        href: rangeHref(option.value),
      }))}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <HubHeaderSlot>
        <div className="hidden sm:block">{filters}</div>
      </HubHeaderSlot>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AccountSwitcher
          accounts={toSwitcherAccounts(accounts)}
          activeAccountId={activeAccount.id}
          basePath="/performance"
        />
        <div className="sm:hidden">{filters}</div>
      </div>

      {analytics.empty ? (
        <HubEmptyState
          icon="performance"
          title="Aucun trade sur cette période."
          description="Vos statistiques apparaîtront dès votre premier trade clôturé. Rien n’est estimé ni simulé en attendant."
          action={
            <ActionLink href="/trade" icon="warix">
              Ouvrir WariX
            </ActionLink>
          }
        />
      ) : (
        <Stagger className="flex flex-col gap-5">
          <StaggerItem>
            <PageHeader
              description={`${analytics.kpis.tradeCount} trade${analytics.kpis.tradeCount > 1 ? 's' : ''} clôturé${analytics.kpis.tradeCount > 1 ? 's' : ''} sur ${analytics.kpis.tradingDays} journée${analytics.kpis.tradingDays > 1 ? 's' : ''}.`}
            />
          </StaggerItem>

          <StaggerItem>
            <PerformanceSnapshot kpis={analytics.kpis} />
          </StaggerItem>

          {hubView && hubView.balanceHistoryMeaningful ? (
            <StaggerItem>
              <Surface className="p-5 sm:p-6">
                <SurfaceTitle>Évolution du solde</SurfaceTitle>
                <div className="mt-4">
                  <DailyPnl
                    daily={analytics.daily}
                    variant="balance"
                    balance={hubView.balanceHistory}
                  />
                </div>
              </Surface>
            </StaggerItem>
          ) : null}

          <StaggerItem>
            <Surface className="p-5 sm:p-6">
              <SurfaceTitle>P&L par journée</SurfaceTitle>
              <div className="mt-4">
                <DailyPnl daily={analytics.daily} variant="bars" />
              </div>
            </Surface>
          </StaggerItem>

          <StaggerItem>
            <div className="grid gap-5 xl:grid-cols-2">
              <SymbolBreakdown symbols={analytics.bySymbol} />
              <DurationBreakdown buckets={analytics.byDuration} />
            </div>
          </StaggerItem>
        </Stagger>
      )}
    </div>
  );
}
