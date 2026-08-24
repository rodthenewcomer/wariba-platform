import { redirect } from 'next/navigation';
import { ConsistencyMeter, OpenPositionsTable, Text } from '@wariba/ui';
import {
  buildCommandCenterView,
  buildOfferCatalog,
  deriveAccountLifecycle,
  listAccountsForUser,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { formatNominal, programLabel, programPhaseLabel } from '../../../lib/account-display';
import { productCopy } from '../../../lib/product-copy';
import { trackEvent } from '../../../lib/analytics';
import { ActionLink } from '../../../components/hub/Action';
import { PerformanceSnapshot } from '../../../components/hub/PerformanceSnapshot';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';
import { Stagger, StaggerItem } from '../../../components/motion/primitives';
import { HubHeaderSlot } from '../HubHeaderSlot';
import { AccountEvolution } from './AccountEvolution';
import { AccountHero, type HeroDetail } from './AccountHero';
import { AccountSwitcher } from './AccountSwitcher';
import { toSwitcherAccounts } from './switcher-accounts';
import { DailyPnlStrip } from './DailyPnlStrip';
import { HealthPanel } from './HealthPanel';
import { HubRiskDetail } from './HubRiskDetail';
import { Launchpad } from './Launchpad';
import { LifecycleBanner, shouldShowLifecycleBanner } from './LifecycleBanner';
import { LiveTelemetry } from './LiveTelemetry';
import { MissionChecklist } from './MissionChecklist';
import { PayoutSummary } from './PayoutSummary';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import { quickActionsFor } from './dashboard-actions';

export const dynamic = 'force-dynamic';

const copy = productCopy.hub.dashboard;

const POLICY_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  retired: 'Retirée',
};

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

/**
 * The Trader Hub dashboard — the command centre.
 *
 * ## Composition follows product state, not a fixed template
 *
 * An evaluation account and a funded account are not the same product, so they
 * do not get the same page. The evaluation leads with a mission checklist and a
 * profit objective; the funded account leads with payout progress and a cycle.
 * A breached account leads with neither, because neither is true of it any
 * more. `deriveAccountLifecycle` decides which, once, and everything below
 * reads it.
 *
 * ## Truthful density, not filled space
 *
 * §5's principle governs every section here. A fresh account has no trades, so
 * it gets no KPI grid and no chart — but it does have a nominal, a balance, a
 * target, a target distance, two risk budgets, a session state, a reset
 * boundary and a next action, and all of those are real before the first
 * trade. The page is dense because that list is long, not because empty panels
 * were filled with zeros.
 *
 * Where a module has genuinely nothing to say, it says so *inside its own
 * frame* rather than vanishing and leaving the layout with a hole. There is a
 * difference between pretending there is a chart and preserving the shape of
 * the page while stating the chart has not started.
 *
 * ## Where the numbers come from
 *
 * One call. `buildCommandCenterView` composes the snapshot server-side and
 * every figure in it describes the same account at the same instant. Nothing
 * here computes a balance, a remaining loss, a percentage or a colour from a
 * formatted string — the last of which this page used to do, and got wrong.
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

  /*
   * No account yet — §22.
   *
   * This is the strongest acquisition surface inside the authenticated
   * product, and it used to be one card. The Launchpad reads the real offer
   * catalog and the real published policy.
   */
  if (accounts.length === 0) {
    const catalog = await buildOfferCatalog(db).catch(() => null);
    return catalog ? (
      <Launchpad catalog={catalog} />
    ) : (
      <div className="max-w-2xl">
        <Surface className="p-6">
          <Text variant="body-sm" color="secondary">
            Les offres ne sont pas consultables pour le moment. Réessayez dans un instant.
          </Text>
        </Surface>
      </div>
    );
  }

  const { account: requestedAccountId } = await searchParams;
  const activeAccount =
    accounts.find((candidate) => candidate.id === requestedAccountId) ??
    (accounts[0] as (typeof accounts)[number]);

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
          lifecycle={lifecycle}
          details={baseDetails}
        />
      </div>
    );
  }

  const command = await buildCommandCenterView(db, { account: activeAccount, now });
  const { hub, risk, mission, health, performance, positions, activity, lifecycle, payout } =
    command;
  const isPerformanceAccount = activeAccount.programType === 'WARIBA_PERFORMANCE';

  trackEvent('hub_viewed', { accountId: activeAccount.id, state: hub.state });
  if (mission.available) {
    trackEvent('mission_viewed', { accountId: activeAccount.id, state: mission.state });
  }

  const primaryViolation = risk.violations[0];

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
  const missionAction = mission.available ? mission.nextAction : null;
  const heroAction =
    missionAction ?? (lifecycle.tradable ? { label: copy.openWarix, href: '/trade' } : null);

  const details: HeroDetail[] = [
    ...(hub.activatedAtLabel ? [{ label: copy.activatedOn, value: hub.activatedAtLabel }] : []),
    ...baseDetails,
    ...(isPerformanceAccount ? [] : [{ label: 'Répartition après passage', value: '85 % → 90 %' }]),
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
                  ...(activity[0]?.timestampLabel
                    ? [{ label: 'Constaté', value: activity[0].timestampLabel }]
                    : []),
                ]
              : []
          }
          /*
           * Phase 3.2 — the breached account finally has a recourse.
           *
           * Until now a trader whose account was terminated could read the
           * evidence and buy another one. §8 adds the third path the Product OS
           * Master always required: contest the decision. It is the secondary
           * action rather than the primary because buying again is what most
           * traders do and contesting is what some need — but it is on the
           * banner itself, not buried in Support, because the banner is where
           * the trader is standing when they disagree.
           *
           * The link carries the account and nothing else. Which decisions are
           * contestable is resolved server-side from the account's own recorded
           * violations; the URL cannot nominate one.
           */
          {...(lifecycle.state === 'breached'
            ? {
                action: { label: 'Acheter un nouveau compte', href: '/comptes/nouveau' },
                secondaryAction: {
                  label: 'Ouvrir une contestation',
                  href: `/support/contestations/nouvelle?account=${activeAccount.id}`,
                },
                tertiaryAction: { label: 'Voir le détail', href: '#activity' },
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
            lifecycle={lifecycle}
            resetAt={risk.nextResetAt}
            telemetry={
              <LiveTelemetry
                accountId={activeAccount.id}
                tested={command.hasMeaningfulActivity}
                /*
                 * A finished account has nothing left that can move. Polling it
                 * would produce a "Actualisé il y a 2 s" label on figures that
                 * are frozen by definition — technically true, and a claim of
                 * activity where there is none.
                 */
                live={!lifecycle.terminal}
                terminal={lifecycle.terminal}
                initial={{
                  balance: Number.parseFloat(hub.amounts.balance),
                  balanceFormatted: hub.balanceFormatted,
                  balanceLabel: copy.balance,
                  pnlToday: Number.parseFloat(hub.amounts.pnlToday),
                  pnlTodayFormatted: hub.pnlTodayFormatted,
                  pnlTodayLabel: copy.pnlToday,
                  dailyRemainingFormatted: risk.dailyLossRemainingFormatted,
                  dailyBudgetFormatted: formatUsd(risk.amounts.dailyLossBudget),
                  dailyRemainingPercent: risk.room.dailyRemainingPercent,
                  maximumRemainingFormatted: risk.maximumLossRemainingFormatted,
                  maximumBudgetFormatted: formatUsd(risk.amounts.maximumLossBudget),
                  maximumRemainingPercent: risk.room.maximumRemainingPercent,
                  maximumLossFloorFormatted: formatUsd(risk.amounts.maximumLossFloor),
                  binding: risk.room.binding,
                  objectivePercent: mission.available ? mission.progressPercent : null,
                  capturedAt: command.capturedAt,
                }}
                /*
                 * The phone's copy of the decision, rendered above the risk
                 * meters (§25). A distinct test id rather than a second
                 * `hub-next-action`: only one of the two is ever visible, but
                 * both are in the DOM, and a locator matching both is a strict
                 * -mode failure waiting for whichever suite runs next.
                 */
                mobileAction={
                  heroAction ? (
                    <ActionLink
                      href={heroAction.href}
                      size="lg"
                      icon={heroAction.label === copy.openWarix ? 'warix' : 'chevron'}
                      className="w-full"
                      data-testid="hub-next-action-mobile"
                    >
                      {heroAction.label}
                    </ActionLink>
                  ) : null
                }
              />
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

        {/*
         * A funded account leads with its payout cycle — §10.3.
         *
         * Placed above the mission rather than below it because a Performance
         * account's question is no longer "will I pass" but "how much can I
         * take out and when". Rendering the same order as an evaluation would
         * make the funded dashboard the evaluation card with a different badge.
         */}
        {payout ? (
          <StaggerItem>
            <PayoutSummary payout={payout} accountId={activeAccount.id} />
          </StaggerItem>
        ) : null}

        <StaggerItem>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              {/*
               * A finished account gets the record, not the checklist — §10.4.
               *
               * The conditions are evaluated live, and on a terminal account
               * that produces green ticks for rules the trader is no longer
               * being measured against. The breached capture showed the exact
               * failure: a banner reading "la perte maximale a été atteinte"
               * above a checklist reading "Perte maximale non atteinte ✓". Both
               * come from the engine and both are defensible in isolation; the
               * pair is incoherent, and the trader has to decide which of their
               * platform's two statements to believe.
               *
               * The lifecycle banner already carries the reason, the threshold,
               * the observed value and when it happened. That is the truthful
               * account of a finished evaluation.
               */}
              {lifecycle.terminal ? (
                <Surface className="flex flex-col gap-3 p-5 sm:p-6">
                  <Text variant="body-md" color="primary">
                    {lifecycle.label}
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    {lifecycle.description}
                  </Text>
                  <div className="pt-1">
                    <ActionLink href="/comptes/nouveau" icon="addAccount" size="sm">
                      Choisir une nouvelle évaluation
                    </ActionLink>
                  </div>
                </Surface>
              ) : mission.available ? (
                <MissionChecklist
                  eyebrow={
                    mission.variant === 'performance'
                      ? `Cycle n°${mission.cycleNumber}`
                      : 'Mission évaluation'
                  }
                  title={mission.title}
                  progressPercent={mission.progressPercent}
                  conditions={mission.conditions}
                  footer={
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {mission.variant === 'performance' && mission.blockingSummary ? (
                        <Text variant="body-sm" color="secondary">
                          {mission.blockingSummary}
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
                /*
                 * §26 — the module states its own absence rather than
                 * collapsing to a sentence and leaving the column short. A
                 * Performance account between cycles legitimately has no
                 * mission to show, and a thin strip of text beside a full
                 * -height health panel reads as a page that failed to load.
                 */
                <Surface className="flex flex-col gap-3 p-5 sm:p-6">
                  <SurfaceTitle>Progression</SurfaceTitle>
                  <Text variant="body-sm" color="secondary">
                    {mission.reason}
                  </Text>
                  <Text variant="body-sm" color="tertiary">
                    Votre progression réapparaîtra ici dès qu’un cycle sera ouvert sur ce compte.
                  </Text>
                  <div className="pt-1">
                    <ActionLink href="/programme#regles" variant="secondary" size="sm">
                      Voir les règles du programme
                    </ActionLink>
                  </div>
                </Surface>
              )}

              {mission.available && mission.consistency ? (
                <ConsistencyMeter
                  ratioPercent={mission.consistency.ratioPercent}
                  limitPercent={mission.consistency.limitPercent}
                  bestDayFormatted={mission.consistency.bestDayFormatted}
                  totalProfitFormatted={mission.consistency.totalProfitFormatted}
                  {...(mission.consistency.requiredProfitFormatted
                    ? { requiredProfitFormatted: mission.consistency.requiredProfitFormatted }
                    : {})}
                />
              ) : null}
            </div>

            <HealthPanel
              health={health}
              rows={[
                { label: 'Équité actuelle', value: risk.currentEquityFormatted },
                { label: 'Prochain reset', value: risk.nextResetLabel },
                { label: 'Journées clôturées', value: String(hub.finalizedSessionCount) },
                { label: 'Positions ouvertes', value: String(positions.length) },
              ]}
              {...(primaryViolation
                ? {
                    detail: (
                      <HubRiskDetail
                        triggerLabel="Voir le détail du risque"
                        violation={primaryViolation}
                        timestampLabel={activity[0]?.timestampLabel ?? risk.nextResetLabel}
                        accountId={activeAccount.id}
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
              kpis: performance.kpis,
            })}
          />
        </StaggerItem>

        {/*
         * The curve and the sessions beside it.
         *
         * Two thirds / one third rather than full width: the daily bars answer
         * "which days did this" and the curve answers "where has it gone", and
         * they are read together. A trader who sees a dip in the curve looks
         * immediately for the day that caused it.
         */}
        <StaggerItem>
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <AccountEvolution
                points={hub.balanceHistory}
                finalizedSessionCount={hub.finalizedSessionCount}
                meaningful={hub.balanceHistoryMeaningful}
                thresholds={command.thresholds}
                performanceHref={`/performance?account=${activeAccount.id}`}
              />
            </div>
            <DailyPnlStrip points={hub.dailyPnl} />
          </div>
        </StaggerItem>

        {/* Only when there is a record to report. */}
        {performance.kpis.tradeCount > 0 ? (
          <StaggerItem>
            <Surface className="flex flex-col gap-4 p-5 sm:p-6">
              <SurfaceTitle
                action={
                  <ActionLink
                    href={`/performance?account=${activeAccount.id}`}
                    variant="ghost"
                    size="sm"
                  >
                    Tout voir
                  </ActionLink>
                }
              >
                Performance
              </SurfaceTitle>
              <PerformanceSnapshot kpis={performance.kpis} variant="compact" />
            </Surface>
          </StaggerItem>
        ) : null}

        <StaggerItem>
          {/*
           * `items-start`, so an empty positions panel does not stretch to the
           * height of a twelve-row activity feed beside it. A 600px card
           * containing one sentence reads as a loading failure.
           */}
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <Surface className="flex flex-col gap-4 p-5 sm:p-6">
              <SurfaceTitle>Positions ouvertes</SurfaceTitle>
              <OpenPositionsTable positions={positions} />
            </Surface>

            <Surface id="activity" className="flex scroll-mt-20 flex-col gap-4 p-5 sm:p-6">
              <SurfaceTitle>Activité récente</SurfaceTitle>
              <RecentActivity items={activity} />
            </Surface>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
