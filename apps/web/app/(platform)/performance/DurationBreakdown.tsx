'use client';

import type { DurationBucket } from '@wariba/application';
import { BarSeries } from '../../../components/hub/charts/BarSeries';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';

/**
 * How long the winners were held, against how long the losers were.
 *
 * The shape traders look for is losers held longer than winners — the signature
 * of cutting profits early and letting losses run. It is also the reading that
 * makes WARIBA's 60-second eligibility rule concrete: a wall of wins in the
 * shortest bucket is profit the objective will not count.
 *
 * Wins and losses are drawn on opposite sides of the axis so the comparison is
 * a shape rather than a colour.
 */
export function DurationBreakdown({ buckets }: { buckets: readonly DurationBucket[] }) {
  if (buckets.length === 0) return null;

  return (
    <Surface className="flex flex-col gap-4 p-5 sm:p-6">
      <SurfaceTitle>Par durée de détention</SurfaceTitle>
      <BarSeries
        height={170}
        data={buckets.flatMap((bucket) => [
          { label: `${bucket.label} · gagnants`, value: bucket.wins, tone: 'emerald' as const },
          { label: `${bucket.label} · perdants`, value: -bucket.losses, tone: 'red' as const },
        ])}
        format={(value) => `${Math.abs(value)} trade${Math.abs(value) > 1 ? 's' : ''}`}
        ariaSummary={buckets
          .map(
            (bucket) =>
              `${bucket.label} : ${bucket.wins} gagnant${bucket.wins > 1 ? 's' : ''}, ${bucket.losses} perdant${bucket.losses > 1 ? 's' : ''}`,
          )
          .join('. ')}
      />
      <ul className="flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        {buckets.map((bucket) => (
          <li
            key={bucket.label}
            className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]"
          >
            {bucket.label}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
