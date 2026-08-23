'use client';

import type { ReactNode } from 'react';
import type { AccountLifecycleView } from '@wariba/application/presentation';
import { AnimatedNumber, ProgressBar } from '../../../components/motion/primitives';
import { Surface } from '../../../components/hub/Surface';
import { StatusPill } from '../../../components/hub/StatusPill';
import { HubIcon } from '../../../components/hub/icons';
import { productCopy } from '../../../lib/product-copy';

const copy = productCopy.hub.dashboard;

export interface HeroStat {
  label: string;
  value: string;
  /** Sign-driven colour, for P&L-shaped figures. */
  signed?: boolean;
  numericValue?: number | null;
}

export interface HeroObjective {
  label: string;
  detail: string;
  percent: number;
}

export interface HeroDetail {
  label: string;
  value: string;
}

export interface AccountHeroProps {
  program: string;
  phase: string;
  nominalFormatted: string;
  /** The live figure, as a number so it can animate between renders. */
  balance: number;
  balanceFormatted: string;
  lifecycle: AccountLifecycleView;
  stats: readonly HeroStat[];
  objective?: HeroObjective | null;
  action?: ReactNode;
  details?: readonly HeroDetail[];
}

/**
 * What a trader is looking at, and what to do about it.
 *
 * ## The hierarchy
 *
 * Program, phase, size, state, the live balance, the progress, the action, the
 * risk figures. Technical references sit at footnote weight behind a seam,
 * because `EVAL-10000-B9CC7415` is a support-conversation fact, not the subject
 * of the screen.
 *
 * ## Why the order changes with the width
 *
 * On a phone the DOM order is identity → decision → figures, so the objective
 * and "Ouvrir WariX" stay inside the first viewport at 320px. Rendering the
 * three risk figures first pushed the button to 666px on a 568px screen: the
 * one thing the page exists to offer, below the fold. On a laptop a grid puts
 * the figures back under the identity with the decision column beside both,
 * which is the reading order there.
 *
 * ## Why the balance animates and the nominal does not
 *
 * The nominal is a constant — 10 000 USD is what the account *is*, and
 * animating it would imply it moves. The balance changes while a trader is
 * looking at it, and a figure that jumps between renders gives the eye no way
 * to tell an update from a repaint. It animates from its previous value, never
 * from zero: counting up from 0 on every navigation would imply a loss and a
 * recovery that did not happen.
 */
export function AccountHero({
  program,
  phase,
  nominalFormatted,
  balance,
  balanceFormatted,
  lifecycle,
  stats,
  objective,
  action,
  details = [],
}: AccountHeroProps) {
  const currency = balanceFormatted.split(' ').at(-1) ?? 'USD';

  return (
    <Surface tone="accent" data-testid="account-hero" className="overflow-hidden">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-10 lg:gap-y-5">
        {/* 1 — identity and the live figure. */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-[length:var(--wariba-font-size-heading-sm)] font-bold tracking-[-0.01em] text-[color:var(--wariba-text-primary)]">
              {program}
            </span>
            <StatusPill tone={lifecycle.tone} data-testid="account-status">
              {lifecycle.label}
            </StatusPill>
          </div>

          <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
            {phase}
            <span aria-hidden="true"> · </span>
            <span className="wariba-data">{nominalFormatted}</span>
            <span aria-hidden="true"> · </span>
            {/* The legally required statement, kept concise (Rulebook §43.3). */}
            <span className="text-[color:var(--wariba-text-tertiary)]">{copy.simulated}</span>
          </p>

          <p
            className="wariba-data mt-5 text-[34px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--wariba-text-primary)]"
            data-testid="account-balance"
          >
            <AnimatedNumber
              value={balance}
              format={(value) => `${Math.round(value).toLocaleString('fr-FR')} ${currency}`}
            />
          </p>
          <p className="mt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            {copy.balance}
          </p>
        </div>

        {/* 2 — the decision. */}
        <div className="flex w-full min-w-0 flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {objective ? (
            <div
              data-testid="account-objective"
              className="rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
                  <HubIcon role="target" size={14} />
                  {copy.objective}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-label-lg)] font-semibold text-[color:var(--wariba-text-primary)]">
                  {objective.percent} %
                </span>
              </div>
              <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]">
                {objective.detail}
              </p>
              <ProgressBar
                percent={objective.percent}
                label={objective.label}
                tone={objective.percent >= 100 ? 'emerald' : 'indigo'}
                className="mt-3"
              />
            </div>
          ) : null}

          {action ? <div data-testid="account-primary-action">{action}</div> : null}
        </div>

        {/* 3 — the risk figures. Two columns on a phone so three of them never
            become three wrapped rows. */}
        {stats.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:col-start-1 lg:row-start-2 lg:flex lg:flex-wrap lg:gap-x-8">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                  {stat.label}
                </dt>
                <dd
                  className="wariba-data mt-1 text-[length:var(--wariba-font-size-body-md)] font-medium"
                  style={{
                    color:
                      stat.signed &&
                      typeof stat.numericValue === 'number' &&
                      stat.numericValue !== 0
                        ? stat.numericValue > 0
                          ? 'var(--wariba-accent-emerald)'
                          : 'var(--wariba-accent-red)'
                        : 'var(--wariba-text-primary)',
                  }}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
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
