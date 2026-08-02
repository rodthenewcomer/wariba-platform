import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export type MissionState =
  'active' | 'attention' | 'reached' | 'waiting' | 'passed' | 'breached' | 'frozen';

export interface MissionCondition {
  label: string;
  /** e.g. "612 / 800 USD" — already formatted. */
  detail: string;
  met: boolean;
}

export interface MissionProgressProps {
  variant: 'evaluation' | 'performance' | 'review';
  state: MissionState;
  title: string;
  /** 0–100, already computed. */
  progressPercent: number;
  conditions: MissionCondition[];
  nextAction: ReactNode;
}

const STATE_ACCENT: Record<MissionState, string> = {
  active: '--wariba-component-mission-progress-active-accent',
  attention: '--wariba-component-mission-progress-waiting-accent',
  reached: '--wariba-component-mission-progress-waiting-accent',
  waiting: '--wariba-component-mission-progress-waiting-accent',
  passed: '--wariba-component-mission-progress-complete-accent',
  breached: '--wariba-component-mission-progress-breach-accent',
  frozen: '--wariba-component-mission-progress-active-accent',
};

const VARIANT_LABEL = {
  evaluation: 'Évaluation',
  performance: 'Performance',
  review: 'Review',
} as const;

/**
 * Design System §25.2 — the Hub's centerpiece (UX Architecture §13): distinguishes
 * "atteint" from "validé", never a single progress bar standing in for the whole
 * mission. State drives the accent; the conditions list is the actual explanation.
 */
export function MissionProgress({
  variant,
  state,
  title,
  progressPercent,
  conditions,
  nextAction,
}: MissionProgressProps) {
  const accentVar = STATE_ACCENT[state];
  const clamped = Math.min(100, Math.max(0, progressPercent));

  return (
    <div className="flex flex-col gap-[var(--wariba-component-mission-progress-gap)] rounded-[var(--wariba-component-mission-progress-radius)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] p-[var(--wariba-component-mission-progress-padding)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-secondary)]">
          Mission {VARIANT_LABEL[variant]}
        </span>
      </div>

      <h3 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-text-primary)]">
        {title}
      </h3>

      <div
        role="progressbar"
        aria-label={`Progression de la mission : ${title}`}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[var(--wariba-component-mission-progress-progress-track-height)] w-full overflow-hidden rounded-[var(--wariba-component-mission-progress-progress-track-radius)] bg-[color:var(--wariba-background-subtle)]"
      >
        <div
          className="h-full rounded-[var(--wariba-component-mission-progress-progress-track-radius)] transition-[width] duration-[var(--wariba-motion-duration-default)]"
          style={{ width: `${clamped}%`, backgroundColor: `var(${accentVar})` }}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {conditions.map((condition) => (
          <li
            key={condition.label}
            className="flex items-center justify-between gap-3 text-[length:var(--wariba-font-size-body-sm)]"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cx(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none',
                  condition.met
                    ? 'bg-[color:var(--wariba-status-success-strong)] text-white'
                    : 'border border-[color:var(--wariba-border-strong)] text-transparent',
                )}
              >
                ✓
              </span>
              <span
                className={
                  condition.met
                    ? 'text-[color:var(--wariba-text-primary)]'
                    : 'text-[color:var(--wariba-text-secondary)]'
                }
              >
                {condition.label}
              </span>
            </span>
            <span className="wariba-data text-[color:var(--wariba-text-secondary)]">
              {condition.detail}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-1 border-t border-[color:var(--wariba-border-subtle)] pt-3">
        {nextAction}
      </div>
    </div>
  );
}
