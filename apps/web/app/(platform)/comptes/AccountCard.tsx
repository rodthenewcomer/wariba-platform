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
/**
 * A finished evaluation, told as a result and a successor.
 *
 * What is deliberately absent: the objective bar, the two remaining-loss
 * meters, the session figures and any way to trade this account. All four
 * still had rows behind them — the risk view answers happily for a passed
 * account — and rendering them put "Perte quotidienne restante 100 %" and a
 * progress bar beside "Évaluation réussie", which reads as an account the
 * trader can still lose. The read model no longer builds them for this state,
 * so there is nothing here to hide.
 *
 * Every figure below is canonical or omitted. A result the projection could
 * not produce is left out rather than shown as a zero, and no Performance
 * account is implied until one exists.
 */
function ArchiveBody({
  account,
  archive,
}: {
  account: AccountOverviewItem['account'];
  archive: NonNullable<AccountOverviewItem['archive']>;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid="account-card-archive">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[color:var(--warix-border-subtle)] pt-4">
        <div>
          <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Montant du compte
          </dt>
          <dd className="wariba-data mt-0.5 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
            {formatNominal(account.nominalBalance, account.nominalCurrency)}
          </dd>
        </div>
        {archive.completedAtLabel ? (
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Terminée le
            </dt>
            <dd className="wariba-data mt-0.5 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
              {archive.completedAtLabel}
            </dd>
          </div>
        ) : null}
      </div>

      {archive.finalResultFormatted ? (
        <div className="border-t border-[color:var(--warix-border-subtle)] pt-4">
          <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
            Résultat final
          </p>
          {/* Emerald means a gain. A flat or negative result is reported in
              the ordinary text colour rather than dressed as one. */}
          <p
            className="wariba-data mt-1 text-[length:var(--wariba-font-size-heading-sm)] font-bold"
            style={{
              color:
                archive.finalResultSign === 'positive'
                  ? 'var(--wariba-accent-emerald)'
                  : 'var(--wariba-text-primary)',
            }}
            data-testid="account-card-final-result"
            data-result-sign={archive.finalResultSign ?? 'unknown'}
          >
            {archive.finalResultFormatted}
          </p>
        </div>
      ) : null}

      <div className="border-t border-[color:var(--warix-border-subtle)] pt-4">
        {archive.performanceAccountPublicId ? (
          <div data-testid="account-card-successor">
            <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
              Votre compte Performance
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="wariba-data text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                {archive.performanceAccountPublicId}
              </span>
              {archive.performanceStatusLabel ? (
                <StatusPill tone={archive.performanceTradable ? 'success' : 'progress'} size="sm">
                  {archive.performanceStatusLabel}
                </StatusPill>
              ) : null}
            </div>
          </div>
        ) : (
          /*
           * No child yet. Say what is true — the evaluation is still passed and
           * nothing is expected of the trader — rather than implying an account
           * that does not exist.
           */
          <p
            className="text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]"
            data-testid="account-card-provisioning"
          >
            Votre compte Performance est en préparation. Vous n’avez rien à faire pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Phase 3.4.4 §26/§27/§46 — the FLEX activation step, said plainly.
 *
 * The whole point of the block is the two lines a trader would otherwise have
 * to take on trust: the amount, and where the amount came from. WARIBA quoted
 * a price at purchase and froze it on the obligation row; showing it without
 * saying so leaves a trader comparing it against today's offer page and
 * finding a number that does not match.
 *
 * The deadline is rendered from the server's stored `due_at`. There is no
 * "+30 days" anywhere on this side of the wire, because a deadline computed in
 * the browser drifts against the one the expiry job enforces.
 */
function FlexActivationNoticeBlock({
  notice,
  accountId,
}: {
  notice: NonNullable<AccountOverviewItem['flexActivation']>;
  accountId: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 border-t border-[color:var(--warix-border-subtle)] pt-4"
      data-testid="flex-activation-notice"
      data-activation-status={notice.status}
    >
      <p className="text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
        {notice.title}
      </p>
      <p className="text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
        {notice.body}
      </p>

      {notice.amountFormatted ? (
        <div>
          <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Montant d’activation
          </p>
          <p className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
            {notice.amountFormatted}
          </p>
          {notice.priceOriginNote ? (
            <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {notice.priceOriginNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {notice.deadlineLabel ? (
        <p
          className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]"
          data-testid="flex-activation-deadline"
        >
          {notice.deadlineLabel}
        </p>
      ) : null}

      {notice.actionLabel && notice.status === 'activation_due' ? (
        <div className="pt-1">
          <ActionLink href={`/hub?account=${accountId}`} size="sm">
            {notice.actionLabel}
          </ActionLink>
        </div>
      ) : null}
    </div>
  );
}

export function AccountCard({ item }: { item: AccountOverviewItem }) {
  const { account, lifecycle, detail, archive, flexActivation } = item;

  const actions: { label: string; href: string; variant: 'primary' | 'secondary' | 'danger' }[] =
    [];

  if (lifecycle.tradable) {
    actions.push({
      label: 'Ouvrir WariX',
      href: `/trade?account=${account.id}`,
      variant: 'primary',
    });
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
  /*
   * A finished evaluation points at its successor.
   *
   * The primary action on an archived card is the account the trader actually
   * works in now — not a rules page about it, and never WariX on the
   * evaluation, which is no longer tradable.
   */
  if (lifecycle.state === 'passed' && archive?.performanceAccountId) {
    actions.push({
      label: 'Voir mon compte Performance',
      href: `/hub?account=${archive.performanceAccountId}`,
      variant: 'primary',
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
              {programLabel(account)}
            </p>
            <p className="mt-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {programPhaseLabel(account)}
              <span aria-hidden="true"> · </span>
              <span className="wariba-data">
                {formatNominal(account.nominalBalance, account.nominalCurrency)}
              </span>
            </p>
          </div>
        </div>
        <StatusPill tone={lifecycle.tone}>{lifecycle.label}</StatusPill>
      </div>

      {flexActivation ? (
        <FlexActivationNoticeBlock notice={flexActivation} accountId={account.id} />
      ) : null}

      {archive ? (
        <ArchiveBody account={account} archive={archive} />
      ) : detail ? (
        <>
          {detail.progressPercent !== null && detail.progressLabel ? (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                  {detail.progressLabel}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                  {detail.progressDetail ?? `${detail.progressPercent} %`}
                </span>
              </div>
              <ProgressBar
                percent={detail.progressPercent}
                label={detail.progressLabel}
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
                ? [{ label: 'Meilleur Jour', value: detail.consistencyLabel }]
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
        <div className="min-w-0 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          <span className="wariba-data block truncate">{account.publicId}</span>
          {account.sourceEvaluationPublicId ? (
            <span className="mt-1 block">
              Issu de{' '}
              <a
                className="wariba-data underline-offset-4 hover:underline"
                href={`/hub?account=${account.sourceEvaluationAccountId ?? ''}`}
              >
                {account.sourceEvaluationPublicId}
              </a>
            </span>
          ) : account.performanceAccountPublicId && !archive ? (
            <span className="mt-1 block">
              Compte créé :{' '}
              <a
                className="wariba-data underline-offset-4 hover:underline"
                href={`/comptes/${account.performanceAccountPublicId}/bienvenue-performance`}
              >
                {account.performanceAccountPublicId}
              </a>
            </span>
          ) : null}
        </div>
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
