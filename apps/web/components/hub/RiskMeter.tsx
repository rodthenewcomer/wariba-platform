import { ProgressBar } from '../motion/primitives';

/**
 * How much room is left, said in a way the eye can read before the mind does.
 *
 * ## Why a bar and not a sentence
 *
 * "Il vous reste 764 USD sur 1 000 USD" is accurate and takes about a second
 * to parse into a proportion. A trader checking whether they can take one more
 * position is asking a spatial question — *how much of the tank is left* — and
 * a filled track answers it in a glance. The sentence stays underneath,
 * because the exact figure is what they will act on once the bar has told them
 * whether to look.
 *
 * ## Why the colour is not a gradient
 *
 * Continuous colour implies continuous consequence, and the consequence here
 * is a cliff: at zero the account soft-locks or breaches. Four bands, each
 * naming a different decision — trade normally, size down, stop adding, you
 * are at the wall — are more honest than a hue that slides imperceptibly from
 * safe to fatal.
 *
 * Emerald is deliberately not the default band. §11's reasoning applies here
 * too: a full budget on an account that has never traded is not an achievement,
 * so an untested account gets the neutral track rather than a green one that
 * congratulates it. `tested` is what switches that on.
 *
 * ## Colour is never the only signal
 *
 * The percentage is written, the amounts are written, and `ProgressBar` carries
 * `role="progressbar"` with real `aria-valuenow`. Someone who cannot
 * distinguish the bands loses nothing but the glance.
 */

export type RiskMeterBand = 'neutral' | 'healthy' | 'attention' | 'critical';

export interface RiskMeterProps {
  label: string;
  /** Already formatted — "764 USD". */
  remainingFormatted: string;
  /** Already formatted — "1 000 USD". */
  budgetFormatted: string;
  /** 0-100, from the read model. Never recomputed here. */
  percent: number;
  /**
   * Whether this account has been exposed to a decision yet (§11).
   * `false` keeps a full bar neutral instead of praising it green.
   */
  tested?: boolean;
  /** A second line under the figures — the floor, the reset, the rule. */
  footnote?: string | null;
  /** Marks the constraint that will stop the trader first. */
  binding?: boolean;
}

/**
 * The bands.
 *
 * 50 / 25 / 10 rather than evenly spaced, because the consequences are not
 * evenly spaced: the last tenth of a daily budget is one bad trade, and the
 * first half is a normal day.
 */
function bandFor(percent: number, tested: boolean): RiskMeterBand {
  if (percent <= 10) return 'critical';
  if (percent <= 25) return 'attention';
  if (percent <= 50) return 'attention';
  return tested ? 'healthy' : 'neutral';
}

const BAND_TONE: Record<RiskMeterBand, 'emerald' | 'amber' | 'red' | 'indigo'> = {
  neutral: 'indigo',
  healthy: 'emerald',
  attention: 'amber',
  critical: 'red',
};

const BAND_TEXT: Record<RiskMeterBand, string> = {
  neutral: 'var(--wariba-text-primary)',
  healthy: 'var(--wariba-accent-emerald)',
  attention: 'var(--wariba-accent-amber)',
  critical: 'var(--wariba-accent-red)',
};

export function RiskMeter({
  label,
  remainingFormatted,
  budgetFormatted,
  percent,
  tested = true,
  footnote,
  binding = false,
}: RiskMeterProps) {
  const band = bandFor(percent, tested);

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          {label}
          {/*
           * The binding constraint is named, not merely coloured — two bars at
           * similar heights do not tell a trader which one will stop them, and
           * that is the entire question they are asking.
           *
           * But only once something actually binds. On an untouched account
           * both budgets are full, the "constraint" is whichever won an
           * arbitrary tie-break, and labelling one of them warns about a
           * limit nobody is near. The badge appears when the account has spent
           * something.
           */}
          {binding && percent < 100 ? (
            <span
              className="rounded-[4px] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)]"
              style={{
                background: 'var(--wariba-accent-amber-wash)',
                color: 'var(--wariba-accent-amber)',
              }}
            >
              Contrainte
            </span>
          ) : null}
        </span>
        <span
          className="wariba-data text-[length:var(--wariba-font-size-label-lg)] font-semibold"
          style={{ color: BAND_TEXT[band] }}
        >
          {percent} %
        </span>
      </div>

      <p className="wariba-data mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
        {remainingFormatted}
        <span className="text-[color:var(--wariba-text-tertiary)]"> / {budgetFormatted}</span>
      </p>

      <ProgressBar
        percent={percent}
        label={`${label} — ${remainingFormatted} sur ${budgetFormatted}`}
        tone={BAND_TONE[band]}
        className="mt-2"
      />

      {footnote ? (
        <p className="mt-1.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
