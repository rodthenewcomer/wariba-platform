import { redirect } from 'next/navigation';
import { ActivityTimeline, ConsistencyMeter, OpenPositionsTable, Text } from '@wariba/ui';
import {
  buildAccountHubView,
  buildAccountMissionView,
  buildAccountPerformanceMissionView,
  buildAccountRiskView,
  buildOpenPositionsView,
  buildPayoutLifecycle,
  buildPerformanceAnalytics,
  buildRecentActivityView,
  deriveAccountHealth,
  deriveAccountLifecycle,
  listAccountsForUser,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { formatNominal, programLabel, programPhaseLabel } from '../../../lib/account-display';
import { productCopy } from '../../../lib/product-copy';
import { trackEvent } from '../../../lib/analytics';
import { ActionLink } from '../../../components/hub/Action';
import { HubEmptyState } from '../../../components/hub/HubEmptyState';
import { PerformanceSnapshot } from '../../../components/hub/PerformanceSnapshot';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';
import { Stagger, StaggerItem } from '../../../components/motion/primitives';
import { HubHeaderSlot } from '../HubHeaderSlot';
import { AccountEvolution } from './AccountEvolution';
import { AccountHero, type HeroDetail, type HeroStat } from './AccountHero';
import { AccountSwitcher } from './AccountSwitcher';
import { toSwitcherAccounts } from './switcher-accounts';
import { HealthPanel } from './HealthPanel';
import { HubRiskDetail } from './HubRiskDetail';
import { LifecycleBanner, shouldShowLifecycleBanner } from './LifecycleBanner';
import { MissionChecklist } from './MissionChecklist';
import { QuickActions } from './QuickActions';
import { quickActionsFor } from './dashboard-actions';

export const dynamic = 'force-dynamic';

const copy = productCopy.hub.dashboard;

const POLICY_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  retired: 'Retirée',
};

/**
 * The Trader Hub dashboard — the command centre.
 *
 * ## Composition follows product state, not a fixed template
 *
 * An evaluation account and a funded account are not the same product, so they
 * do not get the same page. The evaluation shows a mission checklist and a
 * profit objective; the funded account shows payout progress and a cycle. A
 * breached account shows neither, because neither is true of it any more.
 * `deriveAccountLifecycle` decides which, once, and everything below reads it.
 *
 * ## Progressive richness
 *
 * Sections appear when the data behind them exists. An account with no closed
 * session gets a sentence instead of an equity curve; an account with no
 * trades gets no KPI grid at all. The alternative — rendering every panel
 * always and filling the empty ones with zeros — is how a product ends up
 * claiming a 0 % win rate for someone who has never traded.
 *
 * Every figure is formatted by a read model. Nothing here computes a balance,
 * a remaining loss or a percentage.
 */
export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/hub');

  const db = getDb();
  const accounts = await listAccountsForUser(db, { userId: user.id });

  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="accounts"
          title="Vous n’avez pas encore de compte WARIBA."
          description="Choisissez une évaluation pour activer votre premier compte simulé et commencer à trader dans WariX."
          action={
            <ActionLink href="/comptes/nouveau" icon="addAccount" data-testid="empty-add-account">
              Choisir une évaluation
            </ActionLink>
          }
        />
      </div>
    );
  }

  const { account: requestedAccountId } = await searchParams;
  const activeAccount =
    accounts.find((candidate) => candidate.id === requestedAccountId) ??
    (accounts[0] as (typeof accounts)[number]);

  const isPerformanceAccount = activeAccount.programType === 'WARIBA_PERFORMANCE';
  const now = new Date();

  /*
   * The switcher earns its place only when there is something to switch
   * between. With one account it repeats the hero's first line and costs a
   * phone 60px of its first viewport.
   */
  const switcher =
    accounts.length > 1 ? (
      <AccountSwitcher
        accounts={toSwitcherAccounts(accounts)}
        activeAccountId={activeAccount.id}
        basePath="/hub"
      />
    ) : null;

  const baseDetails: HeroDetail[] = [
    { label: copy.reference, value: activeAccount.publicId },
    {
      label: copy.rules,
      value: `${activeAccount.policyVersion} · ${
        POLICY_STATUS_LABEL[activeAccount.policyStatus] ?? activeAccount.policyStatus
      }`,
    },
  ];

  /*
   * A pending or dormant account has no risk engine state to read — calling
   * the read models would throw. It gets the lifecycle banner and nothing
   * else, which is also all there is to say about it.
   */
  if (
    activeAccount.status === 'pending_activation' ||
    activeAccount.status === 'inactive' ||
    activeAccount.status === 'closed'
  ) {
    const lifecycle = deriveAccountLifecycle({
      accountStatus: activeAccount.status,
      programType: activeAccount.programType,
    });

    return (
      <div className="flex flex-col gap-5">
        {switcher}
        <LifecycleBanner
          lifecycle={lifecycle}
          {...(activeAccount.status === 'closed' || activeAccount.status === 'inactive'
            ? { action: { label: 'Contacter le support', href: '/support' } }
            : {})}
        />
        <AccountHero
          program={programLabel(activeAccount.programType)}
          phase={programPhaseLabel(activeAccount.programType)}
          nominalFormatted={formatNominal(
            activeAccount.nominalBalance,
            activeAccount.nominalCurrency,
          )}
          balance={Number.parseFloat(activeAccount.nominalBalance)}
          balanceFormatted={formatNominal(
            activeAccount.nominalBalance,
            activeAccount.nominalCurrency,
          )}
          lifecycle={lifecycle}
          stats={[]}
          details={baseDetails}
        />
      </div>
    );
  }

  /*
   * The mission is the only read model here that can legitimately have nothing
   * to say. A Performance account whose cycle has not been opened yet has no
   * cycle progress to report, and `evaluateCycleProgress` throws rather than
   * inventing one — correct of it, and no reason to blank the whole dashboard.
   * The account, its risk and its balance are all still true.
   */
  const [hubView, missionView, riskView, activity, openPositions, analytics] = await Promise.all([
    buildAccountHubView(db, { accountId: activeAccount.id, now }),
    (isPerformanceAccount
      ? buildAccountPerformanceMissionView(db, { accountId: activeAccount.id })
      : buildAccountMissionView(db, { accountId: activeAccount.id, now })
    ).catch(
      () =>
        ({
          available: false,
          reason: 'La progression de ce compte n’est pas encore disponible.',
        }) as const,
    ),
    buildAccountRiskView(db, { accountId: activeAccount.id, now }),
    buildRecentActivityView(db, { accountId: activeAccount.id, limit: 12 }),
    buildOpenPositionsView(db, { accountId: activeAccount.id }),
    buildPerformanceAnalytics(db, { accountId: activeAccount.id }),
  ]);

  /*
   * Payout state is only meaningful on a Performance account —
   * `evaluatePayoutEligibility` is scoped to `WARIBA_PERFORMANCE` and throws
   * for anything else.
   */
  const payout = isPerformanceAccount
    ? await buildPayoutLifecycle(db, {
        accountId: activeAccount.id,
        kycVerified: activeAccount.kycSandboxVerified ?? false,
      }).catch(() => null)
    : null;

  const lifecycle = deriveAccountLifecycle({
    accountStatus: activeAccount.status,
    programType: activeAccount.programType,
    inAttentionZone: riskView.status === 'attention',
    // The session is closed once today's snapshot has been finalised — which
    // is what separates "objective reached, still trading" from "under review".
    currentSessionFinalized: hubView.tradingDays[0]?.finalized ?? false,
  });

  const health = deriveAccountHealth({
    dailyLossRemaining: riskView.amounts.dailyLossRemaining,
    dailyLossBudget: riskView.amounts.dailyLossBudget,
    maximumLossRemaining: riskView.amounts.maximumLossRemaining,
    maximumLossBudget: riskView.amounts.maximumLossBudget,
    hasViolation: riskView.violations.length > 0,
    terminal: lifecycle.terminal,
  });

  trackEvent('hub_viewed', { accountId: activeAccount.id, state: hubView.state });
  if (missionView.available) {
    trackEvent('mission_viewed', { accountId: activeAccount.id, state: missionView.state });
  }

  const primaryViolation = riskView.violations[0];

  /*
   * A tradable account always offers the terminal.
   *
   * The mission's own `nextAction` is null in states where the *mission* needs
   * nothing — `objective_reached` with no open position is the clearest case:
   * there is no further condition to satisfy, so the mission has nothing to
   * ask for. But the account is still live and the trader may still trade it,
   * and a live account with no way into the workstation is a dead end on the
   * one screen that exists to route them.
   */
  const missionAction = missionView.available ? missionView.nextAction : null;
  const heroAction =
    missionAction ?? (lifecycle.tradable ? { label: copy.openWarix, href: '/trade' } : null);
  const objectiveCondition = missionView.available ? missionView.conditions[0] : undefined;

  const heroStats: HeroStat[] = [
    {
      label: copy.pnlToday,
      value: hubView.pnlTodayFormatted,
      signed: true,
      numericValue: Number.parseFloat(hubView.pnlTodayFormatted.replace(/[^\d.-]/g, '')),
    },
    { label: 'Perte quotidienne restante', value: riskView.dailyLossRemainingFormatted },
    { label: copy.maxLossRemaining, value: riskView.maximumLossRemainingFormatted },
  ];

  const details: HeroDetail[] = [
    ...(hubView.activatedAtLabel
      ? [{ label: copy.activatedOn, value: hubView.activatedAtLabel }]
      : []),
    ...baseDetails,
    ...(isPerformanceAccount ? [] : [{ label: 'Répartition après passage', value: '85 % → 90 %' }]),
  ];

  const thresholds = [
    {
      value: Number.parseFloat(riskView.amounts.maximumLossFloor),
      label: 'Perte max.',
      tone: 'red' as const,
    },
    ...(missionView.available && missionView.variant === 'evaluation'
      ? [
          {
            value: Number.parseFloat(missionView.amounts.targetBalance),
            label: 'Objectif',
            tone: 'emerald' as const,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <HubHeaderSlot>
        {/*
         * The header's copy of the action is wrapped rather than
         * class-toggled: `actionClassName` already sets `inline-flex`, and
         * pairing that with `hidden` leaves which display wins to Tailwind's
         * own class ordering — which is how this button survived at 320px and
         * collided with the avatar beside it.
         */}
        {lifecycle.tradable ? (
          <div className="hidden sm:block">
            <ActionLink
              href="/trade"
              size="sm"
              variant="secondary"
              icon="warix"
              data-testid="header-open-warix"
            >
              {copy.openWarix}
            </ActionLink>
          </div>
        ) : null}
      </HubHeaderSlot>

      {switcher}

      {shouldShowLifecycleBanner(lifecycle) ? (
        <LifecycleBanner
          lifecycle={lifecycle}
          evidence={
            lifecycle.state === 'breached' && primaryViolation
              ? [
                  { label: 'Règle', value: primaryViolation.ruleLabel },
                  { label: 'Seuil', value: primaryViolation.thresholdFormatted },
                  { label: 'Observé', value: primaryViolation.observedFormatted },
                ]
              : []
          }
          {...(lifecycle.state === 'breached'
            ? {
                action: { label: 'Acheter un nouveau compte', href: '/comptes/nouveau' },
                secondaryAction: { label: 'Voir le détail', href: '#activity' },
              }
            : {})}
        />
      ) : null}

      <Stagger className="flex flex-col gap-5">
        <StaggerItem>
          <AccountHero
            program={programLabel(activeAccount.programType)}
            phase={programPhaseLabel(activeAccount.programType)}
            nominalFormatted={formatNominal(
              activeAccount.nominalBalance,
              activeAccount.nominalCurrency,
            )}
            balance={Number.parseFloat(riskView.amounts.currentEquity)}
            balanceFormatted={hubView.balanceFormatted}
            lifecycle={lifecycle}
            stats={heroStats}
            objective={
              objectiveCondition && missionView.available
                ? {
                    label: objectiveCondition.label,
                    detail: objectiveCondition.detail,
                    percent: missionView.progressPercent,
                  }
                : null
            }
            action={
              heroAction ? (
                <ActionLink
                  href={heroAction.href}
                  size="lg"
                  icon={heroAction.label === copy.openWarix ? 'warix' : 'chevron'}
                  className="w-full"
                  data-testid="hub-next-action"
                >
                  {heroAction.label}
                </ActionLink>
              ) : null
            }
            details={details}
          />
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              {missionView.available ? (
                <MissionChecklist
                  eyebrow={
                    missionView.variant === 'performance'
                      ? `Cycle n°${missionView.cycleNumber}`
                      : 'Mission évaluation'
                  }
                  title={missionView.title}
                  progressPercent={missionView.progressPercent}
                  conditions={missionView.conditions}
                  footer={
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {missionView.variant === 'performance' && missionView.blockingSummary ? (
                        <Text variant="body-sm" color="secondary">
                          {missionView.blockingSummary}
                        </Text>
                      ) : (
                        <span />
                      )}
                      <ActionLink href="/programme#regles" variant="secondary" size="sm">
                        Voir les règles du programme
                      </ActionLink>
                    </div>
                  }
                />
              ) : (
                <Surface className="p-5 sm:p-6">
                  <Text variant="body-sm" color="secondary">
                    {missionView.reason}
                  </Text>
                </Surface>
              )}

              {missionView.available && missionView.consistency ? (
                <ConsistencyMeter
                  ratioPercent={missionView.consistency.ratioPercent}
                  limitPercent={missionView.consistency.limitPercent}
                  bestDayFormatted={missionView.consistency.bestDayFormatted}
                  totalProfitFormatted={missionView.consistency.totalProfitFormatted}
                  {...(missionView.consistency.requiredProfitFormatted
                    ? { requiredProfitFormatted: missionView.consistency.requiredProfitFormatted }
                    : {})}
                />
              ) : null}
            </div>

            <HealthPanel
              health={health}
              rows={[
                { label: 'Équité actuelle', value: riskView.currentEquityFormatted },
                { label: 'Prochain reset', value: riskView.nextResetLabel },
                {
                  label: 'Journées clôturées',
                  value: String(hubView.finalizedSessionCount),
                },
              ]}
              {...(primaryViolation
                ? {
                    detail: (
                      <HubRiskDetail
                        triggerLabel="Voir le détail du risque"
                        violation={primaryViolation}
                        timestampLabel={activity[0]?.timestampLabel ?? riskView.nextResetLabel}
                      />
                    ),
                  }
                : {})}
            />
          </div>
        </StaggerItem>

        <StaggerItem>
          <QuickActions
            actions={quickActionsFor({
              lifecycle,
              accountId: activeAccount.id,
              payout,
              kpis: analytics.kpis,
            })}
          />
        </StaggerItem>

        <StaggerItem>
          <AccountEvolution
            points={hubView.balanceHistory}
            finalizedSessionCount={hubView.finalizedSessionCount}
            meaningful={hubView.balanceHistoryMeaningful}
            thresholds={thresholds}
          />
        </StaggerItem>

        {/* Only when there is a record to report. */}
        {analytics.kpis.tradeCount > 0 ? (
          <StaggerItem>
            <Surface className="flex flex-col gap-4 p-5 sm:p-6">
              <SurfaceTitle
                action={
                  <ActionLink href="/performance" variant="ghost" size="sm">
                    Tout voir
                  </ActionLink>
                }
              >
                Performance
              </SurfaceTitle>
              <PerformanceSnapshot kpis={analytics.kpis} variant="compact" />
            </Surface>
          </StaggerItem>
        ) : null}

        <StaggerItem>
          <div className="grid gap-5 xl:grid-cols-2">
            <Surface className="flex flex-col gap-4 p-5 sm:p-6">
              <SurfaceTitle>Positions ouvertes</SurfaceTitle>
              <OpenPositionsTable positions={openPositions} />
            </Surface>

            <Surface id="activity" className="flex scroll-mt-20 flex-col gap-4 p-5 sm:p-6">
              <SurfaceTitle>Activité récente</SurfaceTitle>
              <ActivityTimeline items={activity} />
            </Surface>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
