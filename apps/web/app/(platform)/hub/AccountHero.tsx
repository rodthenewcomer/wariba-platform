import type { ReactNode } from 'react';
import type { AccountLifecycleView } from '@wariba/application/presentation';
import { Surface } from '../../../components/hub/Surface';
import { StatusPill } from '../../../components/hub/StatusPill';
import { productCopy } from '../../../lib/product-copy';
import { ResetCountdown } from './ResetCountdown';

const copy = productCopy.hub.dashboard;

export interface HeroDetail {
  label: string;
  value: string;
}

export interface AccountHeroProps {
  program: string;
  phase: string;
  nominalFormatted: string;
  lifecycle: AccountLifecycleView;
  /**
   * The live figures and the risk meters.
   *
   * Passed in rather than built here because they refresh on a timer and the
   * rest of this card does not: keeping the client boundary around exactly the
   * part that moves means a telemetry tick re-renders four numbers and two
   * bars, not the whole hero.
   */
  telemetry?: ReactNode;
  /** ISO instant of the next daily reset, when the account has one. */
  resetAt?: string | null;
  action?: ReactNode;
  details?: readonly HeroDetail[];
}

/**
 * What a trader is looking at, and what to do about it.
 *
 * ## The hierarchy
 *
 * Identity and state, then the figures, then the risk they sit inside, then
 * the decision. Technical references sit at footnote weight behind a seam,
 * because `EVAL-10000-B9CC7415` is a support-conversation fact, not the
 * subject of the screen.
 *
 * ## What changed in Phase 2.5
 *
 * The card used to hold the balance and three text figures, and the risk was a
 * row of words in a panel further down. §10.1 asks the hero to answer five of
 * §4's ten questions on its own — what the account is worth, what today did,
 * how much daily room is left, how much total room is left, how far the
 * objective is — so the figures became a strip and the two budgets became
 * bars. A trader should not have to scroll to find out whether they can take
 * another position.
 *
 * The reset countdown sits beside the status because "how long do I have" is a
 * question about *today*, and today is what the status pill describes.
 *
 * ## Why the order still changes with the width
 *
 * On a laptop the decision sits in its own column beside the figures. On a
 * phone there is no beside, and the reading order has to be identity → the
 * headline figures → the decision → the risk detail. §25 is explicit that the
 * action must not follow three secondary metrics, and the risk meters are two
 * full-width blocks: rendering them first pushed "Ouvrir WariX" past the fold
 * at 390px, which is the one thing the screen exists to offer.
 *
 * So the phone's copy of the action is passed into the telemetry block and
 * placed between the figures and the meters, and this column is `lg`-only.
 */
export function AccountHero({
  program,
  phase,
  nominalFormatted,
  lifecycle,
  telemetry,
  resetAt,
  action,
  details = [],
}: AccountHeroProps) {
  return (
    <Surface tone="accent" data-testid="account-hero" className="overflow-hidden">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-x-10">
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1">
          {/* 1 — identity, state, and how long today has left. */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[length:var(--wariba-font-size-heading-sm)] font-bold tracking-[-0.01em] text-[color:var(--wariba-text-primary)]">
                {program}
              </span>
              <StatusPill tone={lifecycle.tone} data-testid="account-status">
                {lifecycle.label}
              </StatusPill>
              {/* Only while the account still has a today worth counting. */}
              {resetAt && !lifecycle.terminal ? (
                <ResetCountdown resetAt={resetAt} className="ml-auto" />
              ) : null}
            </div>

            <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              {phase}
              <span aria-hidden="true"> · </span>
              <span className="wariba-data">{nominalFormatted}</span>
              <span aria-hidden="true"> · </span>
              {/* The legally required statement, kept concise (Rulebook §43.3). */}
              <span className="text-[color:var(--wariba-text-tertiary)]">{copy.simulated}</span>
            </p>
          </div>

          {/* 2 — the figures and the room they sit inside. */}
          {telemetry}
        </div>

        {/* 3 — the decision. */}
        {action ? (
          <div
            /* Desktop only — the phone gets its copy inside the telemetry
               block, above the risk meters (§25). */
            className="hidden w-full min-w-0 flex-col gap-4 lg:flex lg:col-start-2 lg:row-start-1 lg:justify-center"
            data-testid="account-primary-action"
          >
            {action}
          </div>
        ) : null}
      </div>

      {/*
       * Details, at footnote weight, behind a seam.
       *
       * The public reference and the published rule version belong to the
       * account and are worth reading off the screen when contacting support.
       * They are not what the dashboard is about.
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
    </Surface>
  );
}
