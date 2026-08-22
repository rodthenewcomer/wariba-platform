import type { ReactNode } from 'react';
import { productCopy } from '../../../lib/product-copy';
import type { AccountStatusVariant } from '../../../lib/account-display';
import { HubModule } from './HubModule';

const copy = productCopy.hub.dashboard;

const STATUS_TONE: Record<AccountStatusVariant, { dot: string; text: string; wash: string }> = {
  neutral: {
    dot: 'var(--wariba-text-tertiary)',
    text: 'var(--wariba-status-neutral-text)',
    wash: 'var(--wariba-status-neutral-background)',
  },
  information: {
    dot: 'var(--warix-accent-cobalt)',
    text: 'var(--wariba-status-information-text)',
    wash: 'var(--wariba-status-information-background)',
  },
  success: {
    dot: 'var(--wariba-component-workstation-trading-buy)',
    text: 'var(--wariba-status-success-text)',
    wash: 'var(--wariba-status-success-background)',
  },
  warning: {
    dot: 'var(--wariba-component-workstation-trading-warning)',
    text: 'var(--wariba-status-warning-text)',
    wash: 'var(--wariba-status-warning-background)',
  },
  danger: {
    dot: 'var(--wariba-component-workstation-trading-sell)',
    text: 'var(--wariba-status-danger-text)',
    wash: 'var(--wariba-status-danger-background)',
  },
};

export interface AccountHeroObjective {
  /** e.g. "Objectif de profit" */
  label: string;
  /** Already formatted by the read model, e.g. "420 USD / 1 000 USD". */
  detail: string;
  /** 0–100, computed server-side. */
  percent: number;
}

export interface AccountHeroDetail {
  label: string;
  value: string;
}

export interface AccountHeroProps {
  program: string;
  phase: string;
  nominalFormatted: string;
  balanceFormatted: string;
  pnlTodayFormatted: string;
  statusLabel: string;
  statusVariant: AccountStatusVariant;
  objective?: AccountHeroObjective | null;
  /** The next safe action, already derived server-side. */
  action?: ReactNode;
  /** Technical and policy references. Rendered as a footnote, never as content. */
  details?: AccountHeroDetail[];
}

/**
 * What a trader is looking at, and what to do about it.
 *
 * ## The hierarchy this reverses
 *
 * The first dashboard opened with a public account id, a policy-version chip
 * and a 220px chart of nothing, then put the mission below the fold. So the
 * screen led with `EVAL-10000-12FE3592` — a database key, rendered in the
 * position a person's eye lands first — and the actual question a trader has
 * on arriving ("where am I against the objective, and can I trade?") required
 * scrolling to answer.
 *
 * Here the order is program, phase, size, state, progress, action. The public
 * reference and the rule version still exist, at the bottom, at footnote
 * weight, because they matter to support conversations and not to the decision
 * being made on this screen.
 *
 * ## "Compte simulé"
 *
 * Stays visible — it is a legal requirement, not a design preference
 * (Rulebook §43.3). It does not stay in the phrase "nominal non détenu": the
 * compliance clause was competing for the same line as the account's own
 * identity, and "Compte simulé" already carries the fact a person needs. The
 * full wording belongs in the rules, where the rest of the clause lives.
 */
export function AccountHero({
  program,
  phase,
  nominalFormatted,
  balanceFormatted,
  pnlTodayFormatted,
  statusLabel,
  statusVariant,
  objective,
  action,
  details = [],
}: AccountHeroProps) {
  const tone = STATUS_TONE[statusVariant];

  return (
    <HubModule data-testid="account-hero" className="overflow-hidden">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-[length:var(--wariba-font-size-heading-sm)] font-bold tracking-[-0.01em] text-[color:var(--wariba-text-primary)]">
              {program}
            </span>
            <span
              data-testid="account-status"
              className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold"
              style={{ background: tone.wash, color: tone.text }}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: tone.dot }}
              />
              {statusLabel}
            </span>
          </div>

          <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
            {phase}
            <span aria-hidden="true"> · </span>
            {/* The simulated nature, stated once and plainly. */}
            <span className="text-[color:var(--wariba-text-tertiary)]">{copy.simulated}</span>
          </p>

          <p className="wariba-data mt-5 text-[32px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--wariba-text-primary)]">
            {nominalFormatted}
          </p>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1.5">
            <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              {copy.balance}{' '}
              <span className="wariba-data font-medium text-[color:var(--wariba-text-primary)]">
                {balanceFormatted}
              </span>
            </span>
            <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              {copy.pnlToday}{' '}
              <span className="wariba-data font-medium text-[color:var(--wariba-text-primary)]">
                {pnlTodayFormatted}
              </span>
            </span>
          </div>
        </div>

        {/* The decision column. On a phone it stacks under the identity; on a
            laptop it sits beside it so the objective and the action share the
            first viewport with the account they belong to. */}
        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[19rem]">
          {objective ? (
            <div
              data-testid="account-objective"
              className="rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
                  {copy.objective}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                  {objective.percent} %
                </span>
              </div>
              <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]">
                {objective.detail}
              </p>
              <div
                role="progressbar"
                aria-label={objective.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={objective.percent}
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--warix-shell)]"
              >
                <div
                  className="h-full rounded-full bg-[color:var(--warix-accent-cobalt)]"
                  style={{ width: `${Math.min(100, Math.max(0, objective.percent))}%` }}
                />
              </div>
            </div>
          ) : null}

          {action ? <div data-testid="account-primary-action">{action}</div> : null}
        </div>
      </div>

      {/*
       * Details, at footnote weight, behind a seam.
       *
       * The public reference and the published rule version belong to the
       * account and are worth being able to read off the screen when
       * contacting support. They are not what the dashboard is about, and the
       * previous build's mistake was giving one of them the largest type on
       * the page and the other a standalone control.
       */}
      {details.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[color:var(--warix-border-subtle)] bg-[color:color-mix(in_srgb,var(--warix-canvas)_45%,transparent)] px-5 py-3 sm:px-6">
          {details.map((detail) => (
            <span
              key={detail.label}
              className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]"
            >
              {detail.label}{' '}
              <span className="wariba-data text-[color:var(--wariba-text-secondary)]">
                {detail.value}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </HubModule>
  );
}
