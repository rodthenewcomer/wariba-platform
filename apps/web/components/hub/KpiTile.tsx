import type { ReactNode } from 'react';
import { Surface } from './Surface';

/**
 * One number, said well.
 *
 * ## The rules a KPI tile has to obey in a trading product
 *
 * **A missing value is a dash, never a zero.** "0 %" is a claim that the
 * trader won nothing; "—" is the truth, which is that there is nothing to
 * compute from. Conflating the two is the difference between a product that
 * reports and one that guesses.
 *
 * **Signed figures carry their sign and their colour.** A P&L rendered in the
 * same grey as a trade count makes the eye do arithmetic it should not have
 * to. Colour is a second signal on top of the sign, never the only one.
 *
 * **Numerals are tabular.** A column of figures whose digits do not line up
 * cannot be scanned, and scanning is the entire reason the number is on a
 * dashboard rather than in a sentence.
 */

export type KpiSentiment = 'neutral' | 'positive' | 'negative' | 'auto';

export interface KpiTileProps {
  label: string;
  /** Already formatted. `null` renders the honest dash. */
  value: string | null;
  /** A short qualifier under the number — a count, a comparison, a period. */
  hint?: string | null;
  sentiment?: KpiSentiment;
  /** Used by `auto` to decide the colour from the value's own sign. */
  numericValue?: number | null;
  icon?: ReactNode;
  compact?: boolean;
  /**
   * Visual weight, not a different component (§27).
   *
   * Twelve identical dark rectangles is a wall, not a hierarchy — the eye has
   * no entry point and reads them in DOM order, which is rarely importance
   * order. `primary` gives the one figure the surface is *about* a larger
   * numeral and a wash tinted by its own sentiment, so a profitable record
   * leads green and a losing one leads red. Surfaces stay consistent; only the
   * weight varies.
   */
  emphasis?: 'primary' | 'default';
}

function resolveColor(sentiment: KpiSentiment, numericValue: number | null | undefined): string {
  if (sentiment === 'positive') return 'var(--wariba-accent-emerald)';
  if (sentiment === 'negative') return 'var(--wariba-accent-red)';
  if (sentiment === 'auto' && typeof numericValue === 'number' && numericValue !== 0) {
    return numericValue > 0 ? 'var(--wariba-accent-emerald)' : 'var(--wariba-accent-red)';
  }
  return 'var(--wariba-text-primary)';
}

export function KpiTile({
  label,
  value,
  hint,
  sentiment = 'neutral',
  numericValue,
  icon,
  compact = false,
  emphasis = 'default',
}: KpiTileProps) {
  const missing = value === null;
  const primary = emphasis === 'primary' && !missing;
  const color = missing ? 'var(--wariba-text-tertiary)' : resolveColor(sentiment, numericValue);

  return (
    <Surface
      tone="raised"
      className={compact ? 'p-3.5' : 'p-4'}
      /*
       * The wash is derived from the resolved figure colour rather than picked
       * separately, so it can never disagree with the number sitting on it.
       */
      {...(primary
        ? {
            style: {
              background: `color-mix(in srgb, ${color} 9%, var(--warix-surface-raised))`,
              borderColor: `color-mix(in srgb, ${color} 28%, transparent)`,
            },
          }
        : {})}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[length:var(--wariba-font-size-label-sm)] font-medium text-[color:var(--wariba-text-tertiary)]">
          {label}
        </p>
        {icon ? (
          <span className="shrink-0 text-[color:var(--wariba-text-tertiary)]">{icon}</span>
        ) : null}
      </div>

      <p
        className={`wariba-data mt-2 font-semibold leading-none tracking-[-0.01em] ${
          primary ? 'text-[26px]' : compact ? 'text-[18px]' : 'text-[22px]'
        }`}
        style={{ color }}
      >
        {/* An em dash, not "0". See the note above. */}
        {value ?? '—'}
      </p>

      {hint ? (
        <p className="mt-1.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          {hint}
        </p>
      ) : null}
    </Surface>
  );
}
