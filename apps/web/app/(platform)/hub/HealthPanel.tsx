'use client';

import type { AccountHealthView } from '@wariba/application/presentation';
import { ProgressRing } from '../../../components/motion/primitives';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';

/**
 * Today, in the width of a column.
 *
 * The ring shows the binding constraint — whichever of the daily loss limit
 * and the maximum-loss budget has less room left. That is deliberately not a
 * score out of 100: it is a percentage of a published threshold, so the trader
 * can reconstruct it, and the sentence underneath names which of the two
 * produced it so they know which lever to pull.
 *
 * Every figure below is pre-formatted by the risk read model. No arithmetic
 * happens on this side of the wire — a risk number a browser computed is a
 * risk number the platform cannot stand behind.
 */

/*
 * `neutral` is indigo rather than emerald on purpose (§11).
 *
 * An untested account has a full ring, and painting that ring green reads as
 * "you are doing well" to someone who has not yet done anything. Indigo is the
 * Hub's informational accent: it says "here is the state" without grading it.
 */
const TONE_RING = {
  neutral: 'indigo',
  success: 'emerald',
  attention: 'amber',
  danger: 'red',
} as const;

export interface HealthRow {
  label: string;
  value: string;
}

export function HealthPanel({
  health,
  rows,
  detail,
}: {
  health: AccountHealthView;
  rows: readonly HealthRow[];
  detail?: React.ReactNode;
}) {
  return (
    <Surface data-testid="health-panel" className="flex h-full flex-col gap-5 p-5 sm:p-6">
      <SurfaceTitle>Aujourd’hui</SurfaceTitle>

      <div className="flex items-center gap-4">
        <ProgressRing
          percent={health.roomPercent}
          label={`Marge restante : ${health.roomPercent} %`}
          tone={TONE_RING[health.tone]}
          size={84}
          thickness={7}
        >
          <span className="wariba-data text-[length:var(--wariba-font-size-label-lg)] font-semibold text-[color:var(--wariba-text-primary)]">
            {health.roomPercent}%
          </span>
        </ProgressRing>

        <div className="min-w-0">
          <p
            className="text-[length:var(--wariba-font-size-body-md)] font-semibold"
            /*
             * Exhaustive over the four tones. The `neutral` case has to be
             * named: a chain that fell through to red painted "Risque intact"
             * — a healthy, untested account — in the breach colour.
             */
            style={{
              color:
                health.tone === 'success'
                  ? 'var(--wariba-accent-emerald)'
                  : health.tone === 'attention'
                    ? 'var(--wariba-accent-amber)'
                    : health.tone === 'danger'
                      ? 'var(--wariba-accent-red)'
                      : 'var(--wariba-text-primary)',
            }}
            data-testid="health-state"
          >
            {health.label}
          </p>
          <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
            {health.description}
          </p>
        </div>
      </div>

      <dl className="flex flex-col gap-3 border-t border-[color:var(--warix-border-subtle)] pt-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              {row.label}
            </dt>
            <dd className="wariba-data text-right text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {detail ? <div className="mt-auto pt-1">{detail}</div> : null}
    </Surface>
  );
}
