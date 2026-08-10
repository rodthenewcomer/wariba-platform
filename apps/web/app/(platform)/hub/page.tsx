import Link from 'next/link';
import { AccountSwitchLink } from './AccountSwitchLink';
import { redirect } from 'next/navigation';
import {
  AccountContext,
  AccountSelector,
  ActivityTimeline,
  Alert,
  buttonClassNames,
  Card,
  ConsistencyMeter,
  EmptyState,
  MissionProgress,
  OpenPositionsTable,
  PolicyVersionChip,
  RiskRibbon,
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
} from '../../../lib/account-display';
import { trackEvent } from '../../../lib/analytics';
import { TrackedClick } from './TrackedClick';
import { HubRiskDetail } from './HubRiskDetail';
import { HubBalanceChart } from './HubBalanceChart';

export const dynamic = 'force-dynamic';

function accountSelectorHref(accountId: string): string {
  return `/hub?account=${accountId}`;
}

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
      <div className="mx-auto max-w-3xl">
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

  const policyChip = (
    <TrackedClick event="policy_opened" context={{ accountId: activeAccount.id }}>
      <PolicyVersionChip
        version={activeAccount.policyVersion}
        status={activeAccount.policyStatus}
        href="/programme#regles"
      />
    </TrackedClick>
  );

  const supportLink = (
    <TrackedClick event="support_opened" context={{ accountId: activeAccount.id }}>
      <Link href="/support" className={buttonClassNames({ variant: 'secondary' })}>
        Contacter le support
      </Link>
    </TrackedClick>
  );

  if (activeAccount.status === 'pending_activation') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {selector}
        <AccountContext
          program={programLabel(activeAccount.programType)}
          nominalFormatted={formatNominal(
            activeAccount.nominalBalance,
            activeAccount.nominalCurrency,
          )}
          publicId={activeAccount.publicId}
          statusLabel="Activation en attente"
          statusVariant="neutral"
        />
        <Alert level="information" title="Activation en cours">
          Votre compte est en cours d’activation. Cette étape est automatique et se termine en
          quelques instants après confirmation du paiement.
        </Alert>
        <div className="flex flex-wrap gap-3">{supportLink}</div>
      </div>
    );
  }

  if (activeAccount.status === 'inactive' || activeAccount.status === 'closed') {
    const dormant = activeAccount.status === 'inactive';
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {selector}
        <AccountContext
          program={programLabel(activeAccount.programType)}
          nominalFormatted={formatNominal(
            activeAccount.nominalBalance,
            activeAccount.nominalCurrency,
          )}
          publicId={activeAccount.publicId}
          statusLabel={dormant ? 'Inactif' : 'Compte terminé'}
          statusVariant="neutral"
        />
        <Alert
          level={dormant ? 'warning' : 'information'}
          title={dormant ? 'Compte inactif' : 'Compte terminé'}
        >
          {dormant
            ? 'Aucune activité n’a été enregistrée depuis 30 jours. Contactez le support pour comprendre vos options.'
            : 'Ce compte est fermé. Il reste consultable en lecture seule.'}
        </Alert>
        <div className="flex flex-wrap gap-3">
          {policyChip}
          {supportLink}
        </div>
      </div>
    );
  }

  const now = new Date();
  const isPerformanceAccount = activeAccount.programType === 'WARIBA_PERFORMANCE';
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {selector}

      <AccountContext
        program={programLabel(activeAccount.programType)}
        nominalFormatted={formatNominal(
          activeAccount.nominalBalance,
          activeAccount.nominalCurrency,
        )}
        publicId={activeAccount.publicId}
        statusLabel={hubView.statusLabel}
        statusVariant={hubView.statusVariant}
      />

      {hubView.activatedAtLabel ? (
        <Text variant="body-sm" color="secondary">
          Activé le {hubView.activatedAtLabel}
          {isPerformanceAccount ? '' : ' · Répartition après passage : 85 % → 90 %'}
        </Text>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text as="h1" variant="heading-lg">
            {hubView.balanceFormatted}
          </Text>
          <Text variant="body-sm" color="secondary">
            PnL du jour : {hubView.pnlTodayFormatted}
          </Text>
        </div>
        {policyChip}
      </div>

      <Card padding="comfortable">
        <HubBalanceChart points={hubView.balanceHistory} />
      </Card>

      {hubView.readOnly ? (
        <Alert level="warning" title="Lecture seule">
          Ce compte reste consultable mais aucune nouvelle action n’est possible.
        </Alert>
      ) : null}

      {missionView.available ? (
        <MissionProgress
          variant={missionView.variant}
          state={missionView.state}
          title={missionView.title}
          progressPercent={missionView.progressPercent}
          conditions={missionView.conditions}
          nextAction={
            missionView.nextAction ? (
              <TrackedClick event="next_action_clicked" context={{ accountId: activeAccount.id }}>
                <Link href={missionView.nextAction.href} className={buttonClassNames()}>
                  {missionView.nextAction.label}
                </Link>
              </TrackedClick>
            ) : (
              <Text variant="body-sm" color="secondary">
                {missionView.variant === 'performance' && missionView.blockingSummary
                  ? missionView.blockingSummary
                  : 'Rien de plus à faire pour l’instant.'}
              </Text>
            )
          }
        />
      ) : (
        <Card padding="comfortable">
          <Text variant="body-sm" color="secondary">
            {missionView.reason}
          </Text>
        </Card>
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

      {missionView.available && missionView.variant === 'performance' ? (
        <Card padding="comfortable" className="flex flex-col gap-4">
          <Text as="h2" variant="heading-sm">
            Historique des payouts
          </Text>
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
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <RiskRibbon
          status={riskView.status}
          dailyLossRemaining={riskView.dailyLossRemainingFormatted}
          maximumLossRemaining={riskView.maximumLossRemainingFormatted}
          nextResetLabel={riskView.nextResetLabel}
          connectionOk
        />
        {primaryViolation ? (
          <HubRiskDetail
            triggerLabel="Voir le détail du risque"
            violation={primaryViolation}
            timestampLabel={activity[0]?.timestampLabel ?? riskView.nextResetLabel}
          />
        ) : null}
      </div>

      <Card padding="comfortable" className="flex flex-col gap-4">
        <Text as="h2" variant="heading-sm">
          Positions ouvertes
        </Text>
        <OpenPositionsTable positions={openPositions} />
      </Card>

      <Card padding="comfortable" className="flex flex-col gap-4">
        <Text as="h2" variant="heading-sm">
          Journées récentes
        </Text>
        <TradingDaysList days={hubView.tradingDays} />
      </Card>

      <Card id="activity" padding="comfortable" className="flex flex-col gap-4 scroll-mt-20">
        <Text as="h2" variant="heading-sm">
          Activité récente
        </Text>
        <ActivityTimeline items={activity} />
      </Card>

      <div className="flex flex-wrap gap-3">{supportLink}</div>
    </div>
  );
}
