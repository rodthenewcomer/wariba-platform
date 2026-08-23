'use client';

import type { ReactNode } from 'react';
import { ProgressBar } from '../../../components/motion/primitives';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';
import { HubIcon } from '../../../components/hub/icons';

/**
 * The mission, as a set of conditions rather than a single bar.
 *
 * One progress bar standing in for a whole evaluation is the classic mistake:
 * a trader at 100 % of the profit target can still fail on consistency, on an
 * open position, or on the maximum loss. So the bar reports the objective and
 * the list reports everything else, each with the figure it was judged on.
 *
 * A met condition draws a filled check; an unmet one draws an empty ring. That
 * distinction is a shape, not a colour, so it survives greyscale.
 */

export interface ChecklistCondition {
  label: string;
  detail: string;
  met: boolean;
}

export function MissionChecklist({
  title,
  eyebrow,
  progressPercent,
  conditions,
  footer,
}: {
  title: string;
  eyebrow: string;
  progressPercent: number;
  conditions: readonly ChecklistCondition[];
  footer?: ReactNode;
}) {
  const complete = progressPercent >= 100;

  return (
    <Surface data-testid="mission-checklist" className="flex flex-col gap-4 p-5 sm:p-6">
      <SurfaceTitle>{eyebrow}</SurfaceTitle>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold tracking-[-0.01em] text-[color:var(--wariba-text-primary)]">
          {title}
        </h3>
        <span
          className="wariba-data text-[length:var(--wariba-font-size-heading-sm)] font-semibold"
          style={{
            color: complete ? 'var(--wariba-accent-emerald)' : 'var(--wariba-text-primary)',
          }}
        >
          {progressPercent} %
        </span>
      </div>

      <ProgressBar
        percent={progressPercent}
        label={title}
        tone={complete ? 'emerald' : 'indigo'}
        height={8}
      />

      <ul className="flex flex-col divide-y divide-[color:var(--warix-border-subtle)]">
        {conditions.map((condition) => (
          <li
            key={condition.label}
            /*
             * Wraps rather than clipping. A condition's detail can be a whole
             * clause — "Aucune journée positive pour l'instant" is 319px — and
             * pinning it to one line pushed the page 32px past a 320px screen.
             * The label and the detail each keep their meaning; the row becomes
             * two lines when it has to.
             */
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5 text-[length:var(--wariba-font-size-body-sm)]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center"
                style={{
                  color: condition.met
                    ? 'var(--wariba-accent-emerald)'
                    : 'var(--wariba-text-tertiary)',
                }}
              >
                {condition.met ? (
                  <HubIcon role="success" size={18} active />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border-[1.75px] border-current" />
                )}
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
            <span className="wariba-data min-w-0 text-[color:var(--wariba-text-secondary)] sm:text-right">
              {condition.detail}
            </span>
          </li>
        ))}
      </ul>

      {footer ? (
        <div className="border-t border-[color:var(--warix-border-subtle)] pt-4">{footer}</div>
      ) : null}
    </Surface>
  );
}
