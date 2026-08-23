import type { AccountOverviewItem } from '@wariba/application';
import { ActionLink } from '../../../components/hub/Action';
import { StatusPill } from '../../../components/hub/StatusPill';
import { RiskMeter } from '../../../components/hub/RiskMeter';
import { Surface } from '../../../components/hub/Surface';
import { ProgressBar } from '../../../components/motion/primitives';
import {
  accountSizeShortLabel,
  formatNominal,
  programLabel,
  programPhaseLabel,
} from '../../../lib/account-display';

/**
 * One account, as a card.
 *
 * ## Actions are chosen by state, never listed exhaustively
 *
 * A card that shows every possible action on every account teaches the trader
 * that most buttons do not apply to them. So an active evaluation offers WariX;
 * a funded account offers WariX and its payout; a breached one offers the
 * evidence and a way to start again; an account under review offers nothing,
 * because nothing is required of the trader while WARIBA is checking.
 *
 * ## The figures that earn their place
 *
 * Balance, objective progress, and the two remaining-loss numbers. Those are
 * the four a trader compares across accounts. Consistency and trading days
 * belong on the account's own dashboard, where there is room to explain them.
 */
export function AccountCard({ item }: { item: AccountOverviewItem }) {
  const { account, lifecycle, detail } = item;

  const actions: { label: string; href: string; variant: 'primary' | 'secondary' | 'danger' }[] =
    [];

  if (lifecycle.tradable) {
    actions.push({ label: 'Ouvrir WariX', href: '/trade', variant: 'primary' });
  }
  if (lifecycle.state === 'funded_active') {
    actions.push({
      label: 'Voir le payout',
      href: `/payouts?account=${account.id}`,
      variant: 'secondary',
    });
  }
  if (lifecycle.state === 'breached') {
    actions.push({
      label: 'Voir le détail',
      href: `/hub?account=${account.id}`,
      variant: 'secondary',
    });
    actions.push({ label: 'Nouveau compte', href: '/comptes/nouveau', variant: 'primary' });
  }
  if (!lifecycle.terminal && !lifecycle.tradable && lifecycle.state !== 'funded_preparing') {
    actions.push({
      label: 'Voir le détail',
      href: `/hub?account=${account.id}`,
      variant: 'secondary',
    });
  }

  return (
    <Surface
      tone={lifecycle.state === 'breached' ? 'red' : 'default'}
      data-testid="account-card"
      data-lifecycle={lifecycle.state}
      className="flex h-full flex-col gap-4 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="wariba-data flex h-9 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[color:var(--warix-surface-raised)] text-[length:var(--wariba-font-size-label-md)] font-bold text-[color:var(--wariba-text-secondary)]"
          >
            {accountSizeShortLabel(account.nominalBalance)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {programLabel(account.programType)}
            </p>
            <p className="mt-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {programPhaseLabel(account.programType)}
              <span aria-hidden="true"> · </span>
              <span className="wariba-data">
                {formatNominal(account.nominalBalance, account.nominalCurrency)}
              </span>
            </p>
          </div>
        </div>
        <StatusPill tone={lifecycle.tone}>{lifecycle.label}</StatusPill>
      </div>

      {detail ? (
        <>
          {detail.progressPercent !== null ? (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                  Objectif
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                  {detail.objectiveDetail ?? `${detail.progressPercent} %`}
                </span>
              </div>
              <ProgressBar
                percent={detail.progressPercent}
                label="Progression vers l’objectif"
                tone={detail.progressPercent >= 100 ? 'emerald' : 'indigo'}
                className="mt-2"
              />
            </div>
          ) : null}

          {/*
           * The figures a trader compares across accounts.
           *
           * Consistency, sessions and last activity are here rather than only
           * on the dashboard because comparing two accounts is exactly what
           * this page is for — and "which of my three has stalled" cannot be
           * answered without the last date.
           *
           * Rows with nothing behind them are dropped, never rendered as a
           * zero: an account that has not closed a session has no consistency
           * ratio, and "0 %" would be a claim it does.
           */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[color:var(--warix-border-subtle)] pt-4 sm:grid-cols-3">
            {[
              { label: 'Solde', value: detail.balanceFormatted },
              ...(detail.consistencyLabel
                ? [{ label: 'Consistance', value: detail.consistencyLabel }]
                : []),
              ...(detail.tradingDays === null
                ? []
                : [{ label: 'Journées clôturées', value: String(detail.tradingDays) }]),
              ...(detail.lastActivityLabel
                ? [{ label: 'Dernière activité', value: detail.lastActivityLabel }]
                : []),
            ].map((row) => (
              <div key={row.label}>
                <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                  {row.label}
                </dt>
                <dd className="wariba-data mt-0.5 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {/*
           * The two budgets, as strips (§18/§28).
           *
           * The portfolio's job is comparison, and comparison across accounts
           * is exactly where text figures fail: "300 USD" and "764 USD" on two
           * different account sizes are not comparable without dividing each
           * by its own budget first. The bars have already done that division,
           * so a trader scanning five accounts sees which one is short of room
           * without reading a single number.
           *
           * The same words as the dashboard, from the same projection — two
           * screens naming one authoritative figure differently is worse than
           * either name.
           */}
          <div className="grid gap-x-6 gap-y-3 border-t border-[color:var(--warix-border-subtle)] pt-4 sm:grid-cols-2">
            <RiskMeter
              label="Perte quotidienne restante"
              remainingFormatted={detail.dailyLossRemainingFormatted}
              budgetFormatted={`${detail.room.dailyRemainingPercent} % du budget`}
              percent={detail.room.dailyRemainingPercent}
              tested={detail.tradingDays !== null}
              binding={detail.room.binding === 'daily'}
            />
            <RiskMeter
              label="Perte maximale restante"
              remainingFormatted={detail.maximumLossRemainingFormatted}
              budgetFormatted={`${detail.room.maximumRemainingPercent} % du budget`}
              percent={detail.room.maximumRemainingPercent}
              tested={detail.tradingDays !== null}
              binding={detail.room.binding === 'maximum'}
            />
          </div>
        </>
      ) : (
        <p className="text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
          {lifecycle.description}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--warix-border-subtle)] pt-4">
        <span className="wariba-data truncate text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          {account.publicId}
        </span>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <ActionLink
              key={action.label}
              href={action.href}
              variant={action.variant}
              size="sm"
              data-testid="account-card-action"
            >
              {action.label}
            </ActionLink>
          ))}
        </div>
      </div>
    </Surface>
  );
}
