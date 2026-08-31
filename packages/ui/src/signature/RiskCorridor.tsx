import { cx } from '../lib/cx';

export interface RiskCorridorProps {
  /** Floor of the corridor — the Maximum Loss level, as a display string. */
  floorLabel: string;
  /** Ceiling of the corridor — the profit target, as a display string. */
  targetLabel: string;
  /** Where the account currently sits, 0 = floor, 100 = target. */
  positionPercent: number;
  /** Soft daily boundary, expressed as a share of the corridor. */
  dailyBandPercent?: number;
  currentLabel?: string;
  floorCaption?: string;
  targetCaption?: string;
  className?: string;
}

/**
 * A risk corridor with two edges.
 *
 * ## Why not a progress bar
 *
 * Every prop firm dashboard in the benchmark except one draws progress toward
 * the target as a bar. A bar has a single meaningful end, so it answers "how
 * far to the goal" and says nothing about the thing that actually ends
 * accounts — how close the floor is. Traders blow up against the floor, not
 * against the target.
 *
 * Reference 15 (Lucid) is the exception: it draws a track with a red edge at
 * one end, an amber edge at the other, and a marker between them. That is the
 * right shape for this data and it is what this component implements.
 *
 * The soft daily boundary is drawn as a band inside the corridor rather than
 * as a third edge — it is a rule that warns, not a rule that terminates, and
 * giving it its own hard line would imply otherwise.
 *
 * All values arrive pre-computed. This component performs no risk maths.
 */
export function RiskCorridor({
  floorLabel,
  targetLabel,
  positionPercent,
  dailyBandPercent,
  currentLabel,
  floorCaption = 'Perte maximale',
  targetCaption = 'Objectif',
  className,
}: RiskCorridorProps) {
  const position = clamp(positionPercent);
  const band = dailyBandPercent === undefined ? undefined : clamp(dailyBandPercent);

  /*
   * The marker's tone is the account's own state, not a gradient position.
   * Below a fifth of the corridor the floor is the story and the marker says
   * so; the rest of the time it stays the neutral accent, because a marker
   * that turns amber at 40% trains people to ignore amber.
   */
  const tone = position <= 20 ? 'red' : position >= 92 ? 'emerald' : 'accent';

  return (
    <div className={cx('w-full', className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[0.12em] text-[color:var(--wariba-accent-red)]">
            {floorCaption}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[color:var(--wariba-color-ink-100)]">
            {floorLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[0.12em] text-[color:var(--wariba-accent-emerald)]">
            {targetCaption}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[color:var(--wariba-color-ink-100)]">
            {targetLabel}
          </p>
        </div>
      </div>

      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={
          currentLabel
            ? `${currentLabel} — entre ${floorLabel} et ${targetLabel}`
            : `${Math.round(position)} % du corridor, entre ${floorLabel} et ${targetLabel}`
        }
        aria-label="Corridor de risque"
        className="relative mt-3 h-11"
      >
        {/* The track. */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-[color:var(--wariba-track)]">
          {/* The soft daily band, sitting inside the corridor rather than
              bounding it. */}
          {band === undefined ? null : (
            <div
              className="absolute inset-y-0 bg-[color:var(--wariba-accent-amber-wash)]"
              style={{ left: 0, width: `${band}%` }}
            />
          )}
          {/* Travelled distance from the floor. */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${position}%`,
              background:
                'linear-gradient(90deg, var(--wariba-accent-red-edge), var(--wariba-color-cobalt-500))',
            }}
          />
        </div>

        {/* The two hard edges. Full-height ticks so they read as walls, not as
            points on the track. */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[color:var(--wariba-accent-red)]"
        />
        <span
          aria-hidden="true"
          className="absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[color:var(--wariba-accent-emerald)]"
        />

        {/* The marker. */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--wariba-canvas-deep)]"
          style={{
            left: `${position}%`,
            background: MARKER_TONE[tone],
            boxShadow: `0 0 0 3px ${MARKER_HALO[tone]}`,
          }}
        />
      </div>

      {currentLabel ? (
        <p className="mt-2 font-mono text-xs tabular-nums text-[color:var(--wariba-color-ink-300)]">
          Position actuelle · {currentLabel}
        </p>
      ) : null}
    </div>
  );
}

const MARKER_TONE = {
  red: 'var(--wariba-accent-red)',
  accent: 'var(--wariba-color-cobalt-400)',
  emerald: 'var(--wariba-accent-emerald)',
} as const;

const MARKER_HALO = {
  red: 'var(--wariba-accent-red-wash)',
  accent: 'var(--wariba-accent-indigo-wash)',
  emerald: 'var(--wariba-accent-emerald-wash)',
} as const;

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
