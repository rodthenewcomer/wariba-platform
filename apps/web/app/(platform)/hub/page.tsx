import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AccountSelector,
  ActivityTimeline,
  Alert,
  buttonClassNames,
  ConsistencyMeter,
  EmptyState,
  MissionProgress,
  OpenPositionsTable,
  Text,
  TradingDaysList,
} from '@wariba/ui';
import {
  buildAccountHubView,
  buildAccountMissionView,
  buildAccountPerformanceMissionView,
  buildAccountRiskView,
  buildOpenPositionsView,
  buildRecentActivityView,
  listAccountsForUser,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
// Shared with WariX since W1 — one definition of the program name and the
// account-status vocabulary, so the Hub selector and the workstation status
// bar cannot label the same account differently.
import {
  accountStatusLabel,
  accountStatusVariant,
  formatNominal,
  programLabel,
  programPhaseLabel,
} from '../../../lib/account-display';
import { productCopy } from '../../../lib/product-copy';
import { trackEvent } from '../../../lib/analytics';
import { AccountSwitchLink } from './AccountSwitchLink';
import { AccountEvolution } from './AccountEvolution';
import { AccountHero, type AccountHeroDetail } from './AccountHero';
import { HubModule, HubModuleTitle } from './HubModule';
import { HubRiskDetail } from './HubRiskDetail';
import { RiskPanel } from './RiskPanel';
import { TrackedClick } from './TrackedClick';

export const dynamic = 'force-dynamic';

const copy = productCopy.hub.dashboard;

const POLICY_STATUS_LABEL = {
  draft: 'Brouillon',
  published: 'Publiée',
  retired: 'Retirée',
} as const;

function accountSelectorHref(accountId: string): string {
  return `/hub?account=${accountId}`;
}

/**
 * The Trader Hub dashboard.
 *
 * ## The hierarchy
 *
 * Account context, then state and the next safe action, then the mission, then
 * risk, then the account's evolution if there is one worth drawing, then what
 * happened recently, then help. That order is the whole redesign: the previous
 * build opened on a public account id and an empty chart and put the mission
 * — the only reason a trader is on this screen — below the fold.
 *
 * ## Composition
 *
 * Deliberately not an equal grid of cards. A dashboard of identical tiles
 * makes every fact look equally important, which is the same as making none of
 * them important. A full-width hero carries the account and the decision; a
 * 2/1 split gives the mission the room its four conditions need while risk
 * stays permanently in view beside it; everything after that is a full-width
 * band because it is reference material, not a decision.
 *
 * Every figure on this page is formatted by a read model. Nothing here
 * computes a balance, a remaining loss or a percentage — a risk number a
 * browser derived is a risk number the platform cannot stand behind.
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
      <div className="max-w-3xl">
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

  const { account: requestedAccountId } = await searchParams;
  const activeAccount =
    accounts.find((candidate) => candidate.id === requestedAccountId) ??
    (accounts[0] as (typeof accounts)[number]);

  const selectorAccounts = accounts.map((account) => ({
    id: account.id,
    href: accountSelectorHref(account.id),
    program:
      account.programType === 'WARIBA_ONE'
        ? ('WARIBA ONE' as const)
        : ('WARIBA Performance' as const),
    nominalFormatted: formatNominal(account.nominalBalance, account.nominalCurrency),
    publicId: account.publicId,
    statusLabel: accountStatusLabel(account.status),
    statusVariant: accountStatusVariant(account.status),
  }));

  const selector = (
    <AccountSelector
      LinkComponent={AccountSwitchLink}
      accounts={selectorAccounts}
      activeAccountId={activeAccount.id}
    />
  );

  const supportLink = (
    <TrackedClick event="support_opened" context={{ accountId: activeAccount.id }}>
      <Link href="/support" className={buttonClassNames({ variant: 'secondary' })}>
        Contacter le support
      </Link>
    </TrackedClick>
  );

  const isPerformanceAccount = activeAccount.programType === 'WARIBA_PERFORMANCE';

  /**
   * The account's references, at footnote weight.
   *
   * `publicId` is a database key. It belongs on the screen because support
   * asks for it, and it belongs *here* rather than in the largest type on the
   * page, which is where it used to be.
   */
  const baseDetails: AccountHeroDetail[] = [
    { label: copy.reference, value: activeAccount.publicId },
    {
      label: copy.rules,
      value: `${activeAccount.policyVersion} · ${
        POLICY_STATUS_LABEL[activeAccount.policyStatus as keyof typeof POLICY_STATUS_LABEL] ??
        activeAccount.policyStatus
      }`,
    },
  ];

  if (activeAccount.status === 'pending_activation') {
    return (
      <div className="flex flex-col gap-5">
        {selector}
        <AccountHero
          program={programLabel(activeAccount.programType)}
          phase={programPhaseLabel(activeAccount.programType)}
          nominalFormatted={formatNominal(
            activeAccount.nominalBalance,
            activeAccount.nominalCurrency,
          )}
          balanceFormatted={formatNominal(
            activeAccount.nominalBalance,
            activeAccount.nominalCurrency,
          )}
          pnlTodayFormatted="—"
          statusLabel="Activation en attente"
          statusVariant="neutral"
          details={baseDetails}
        />
        <div className="max-w-3xl">
          <Alert level="information" title="Activation en cours">
            Votre compte est en cours d’activation. Cette étape est automatique et se termine en
            quelques instants après confirmation du paiement.
          </Alert>
        </div>
        <div className="flex flex-wrap gap-3">{supportLink}</div>
      </div>
    );
  }

  if (activeAccount.status === 'inactive' || activeAccount.status === 'closed') {
    const dormant = activeAccount.status === 'inactive';
    return (
      <div className="flex flex-col gap-5">
        {selector}
        <AccountHero
          program={programLabel(activeAccount.programType)}
          phase={programPhaseLabel(activeAccount.programType)}
          nominalFormatted={formatNominal(
            activeAccount.nominalBalance,
            activeAccount.nominalCurrency,
          )}
          balanceFormatted={formatNominal(
            activeAccount.nominalBalance,
            activeAccount.nominalCurrency,
          )}
          pnlTodayFormatted="—"
          statusLabel={dormant ? 'Inactif' : 'Compte terminé'}
          statusVariant="neutral"
          details={baseDetails}
        />
        <div className="max-w-3xl">
          <Alert
            level={dormant ? 'warning' : 'information'}
            title={dormant ? 'Compte inactif' : 'Compte terminé'}
          >
            {dormant
              ? 'Aucune activité n’a été enregistrée depuis 30 jours. Contactez le support pour comprendre vos options.'
              : 'Ce compte est fermé. Il reste consultable en lecture seule.'}
          </Alert>
        </div>
        <div className="flex flex-wrap gap-3">{supportLink}</div>
      </div>
    );
  }

  const now = new Date();
  const [hubView, missionView, riskView, activity, openPositions] = await Promise.all([
    buildAccountHubView(db, { accountId: activeAccount.id, now }),
    isPerformanceAccount
      ? buildAccountPerformanceMissionView(db, { accountId: activeAccount.id })
      : buildAccountMissionView(db, { accountId: activeAccount.id, now }),
    buildAccountRiskView(db, { accountId: activeAccount.id, now }),
    buildRecentActivityView(db, { accountId: activeAccount.id, limit: 15 }),
    buildOpenPositionsView(db, { accountId: activeAccount.id }),
  ]);

  trackEvent('hub_viewed', { accountId: activeAccount.id, state: hubView.state });
  if (missionView.available) {
    trackEvent('mission_viewed', { accountId: activeAccount.id, state: missionView.state });
  }

  const primaryViolation = riskView.violations[0];

  /*
   * The hero's objective is the mission's own first condition, not a second
   * calculation of it. One number, one origin — the alternative is two places
   * on the same screen that can disagree about how far along a trader is.
   */
  const objectiveCondition = missionView.available ? missionView.conditions[0] : undefined;

  /*
   * The next safe action, decided server-side from the account's state. For an
   * active account that is "Ouvrir WariX" — which is exactly why WariX left
   * the sidebar: opening the terminal belongs to an account that can be
   * traded, not to a navigation list that is always there.
   */
  const nextAction = missionView.available ? missionView.nextAction : null;

  /*
   * What the mission says under its conditions when it is not repeating the
   * hero's button. Empty while there is an action to take — the conditions
   * above have already said what is outstanding.
   */
  const missionSummary =
    missionView.available && missionView.variant === 'performance' && missionView.blockingSummary
      ? missionView.blockingSummary
      : nextAction
        ? null
        : 'Rien de plus à faire pour l’instant.';

  const details: AccountHeroDetail[] = [
    ...(hubView.activatedAtLabel
      ? [{ label: copy.activatedOn, value: hubView.activatedAtLabel }]
      : []),
    ...baseDetails,
    ...(isPerformanceAccount ? [] : [{ label: 'Répartition après passage', value: '85 % → 90 %' }]),
  ];

  return (
    <div className="flex flex-col gap-5">
      {selector}

      <AccountHero
        program={programLabel(activeAccount.programType)}
        phase={programPhaseLabel(activeAccount.programType)}
        nominalFormatted={formatNominal(
          activeAccount.nominalBalance,
          activeAccount.nominalCurrency,
        )}
        balanceFormatted={hubView.balanceFormatted}
        pnlTodayFormatted={hubView.pnlTodayFormatted}
        statusLabel={hubView.statusLabel}
        statusVariant={hubView.statusVariant}
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
          nextAction ? (
            <TrackedClick event="next_action_clicked" context={{ accountId: activeAccount.id }}>
              <Link
                href={nextAction.href}
                data-testid="hub-next-action"
                className={buttonClassNames({ size: 'lg', className: 'w-full' })}
              >
                {nextAction.label}
              </Link>
            </TrackedClick>
          ) : null
        }
        details={details}
      />

      {hubView.readOnly ? (
        <div className="max-w-3xl">
          <Alert level="warning" title="Lecture seule">
            Ce compte reste consultable mais aucune nouvelle action n’est possible.
          </Alert>
        </div>
      ) : null}

      {/* The mission gets two thirds because its four conditions each need a
          label and a figure on one line; risk gets one third and stays in
          view, which is the point of a permanent risk read. */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {missionView.available ? (
            <MissionProgress
              variant={missionView.variant}
              state={missionView.state}
              title={missionView.title}
              progressPercent={missionView.progressPercent}
              conditions={missionView.conditions}
              /*
               * Not a second "Ouvrir WariX".
               *
               * The hero already carries the next action at full width, and
               * two identical primary buttons on one screen is a hierarchy
               * that has stopped choosing. What belongs under a list of
               * conditions is the text those conditions come from — which is
               * also where the rule version went when it stopped being a
               * standalone control on the dashboard.
               */
              nextAction={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {missionSummary ? (
                    <Text variant="body-sm" color="secondary">
                      {missionSummary}
                    </Text>
                  ) : (
                    <span />
                  )}
                  <TrackedClick event="policy_opened" context={{ accountId: activeAccount.id }}>
                    <Link
                      href="/programme#regles"
                      className={buttonClassNames({ variant: 'secondary', size: 'sm' })}
                    >
                      Voir les règles du programme
                    </Link>
                  </TrackedClick>
                </div>
              }
            />
          ) : (
            <HubModule className="p-5 sm:p-6">
              <Text variant="body-sm" color="secondary">
                {missionView.reason}
              </Text>
            </HubModule>
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

        <RiskPanel
          status={riskView.status}
          dailyLossRemaining={riskView.dailyLossRemainingFormatted}
          maximumLossRemaining={riskView.maximumLossRemainingFormatted}
          nextResetLabel={riskView.nextResetLabel}
          pnlTodayFormatted={hubView.pnlTodayFormatted}
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

      <AccountEvolution
        points={hubView.balanceHistory}
        finalizedSessionCount={hubView.finalizedSessionCount}
        meaningful={hubView.balanceHistoryMeaningful}
      />

      {missionView.available && missionView.variant === 'performance' ? (
        <HubModule className="flex flex-col gap-4 p-5 sm:p-6">
          <HubModuleTitle>Historique des payouts</HubModuleTitle>
          {missionView.recentPayouts.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              Aucune demande de payout pour l’instant.
            </Text>
          ) : (
            <ul className="flex flex-col gap-2">
              {missionView.recentPayouts.map((payout, index) => (
                <li
                  key={`${payout.cycleNumber}-${payout.dateLabel}-${index}`}
                  className="flex items-center justify-between gap-3 text-[length:var(--wariba-font-size-body-sm)]"
                >
                  <span className="text-[color:var(--wariba-text-primary)]">
                    Cycle n°{payout.cycleNumber} · {payout.statusLabel}
                  </span>
                  <span className="wariba-data text-[color:var(--wariba-text-secondary)]">
                    {payout.amountFormatted ?? '—'} · {payout.dateLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </HubModule>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <HubModule className="flex flex-col gap-4 p-5 sm:p-6">
          <HubModuleTitle>Positions ouvertes</HubModuleTitle>
          <OpenPositionsTable positions={openPositions} />
        </HubModule>

        <HubModule className="flex flex-col gap-4 p-5 sm:p-6">
          <HubModuleTitle>Journées récentes</HubModuleTitle>
          <TradingDaysList days={hubView.tradingDays} />
        </HubModule>
      </div>

      <HubModule id="activity" className="flex scroll-mt-20 flex-col gap-4 p-5 sm:p-6">
        <HubModuleTitle>Activité récente</HubModuleTitle>
        <ActivityTimeline items={activity} />
      </HubModule>

      <div className="flex flex-wrap gap-3">{supportLink}</div>
    </div>
  );
}
