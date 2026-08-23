'use client';

import { AnimatedNumber } from '../../../components/motion/primitives';

/**
 * The five figures a trader opens the dashboard to read.
 *
 * §4 lists ten questions the surface must answer without a paragraph. Five of
 * them are numbers, and these are those five: what the account is worth, what
 * today did, how much daily risk is left, how much total risk is left, and how
 * far the objective is. Everything else on the page elaborates on one of them.
 *
 * ## Why this is one strip and not five cards
 *
 * They are read together. "Balance 11 308, today +0, daily room 300" is one
 * sentence about one account, and putting each clause in its own bordered
 * panel makes the eye stop three times to assemble what should arrive at once.
 * Seams between them, not boxes around them.
 *
 * ## Hierarchy inside the strip
 *
 * The balance is the largest and leads, because it is the figure people come
 * for. Today's P&L is second and carries sign colour. The two risk figures are
 * supporting weight — they matter enormously, but they are read *after* the
 * trader knows where they stand, and inflating them to the same size as the
 * balance makes the strip a wall of equal numbers with no entry point.
 *
 * ## Why only some of these animate
 *
 * The balance and today's P&L change while someone is watching. The budgets
 * change with them, so they animate too. The objective percentage is a derived
 * integer that moves in visible steps, and interpolating it produces a smear
 * of meaningless intermediate percentages — it snaps.
 */

export interface TelemetryFigure {
  label: string;
  /** The formatted string. Always what is shown when the figure cannot animate. */
  value: string;
  /** The raw number behind it, for interpolation and for sign colour. */
  numericValue?: number | null;
  /** Colour by sign — for P&L-shaped figures only. */
  signed?: boolean;
  /** The unit suffix used while animating, e.g. "USD". */
  unit?: string;
  hint?: string | null;
}

export interface TelemetryStripProps {
  balance: { value: number; formatted: string; label: string };
  figures: readonly TelemetryFigure[];
}

function signColor(value: number | null | undefined): string {
  if (typeof value !== 'number' || value === 0) return 'var(--wariba-text-primary)';
  return value > 0 ? 'var(--wariba-accent-emerald)' : 'var(--wariba-accent-red)';
}

export function TelemetryStrip({ balance, figures }: TelemetryStripProps) {
  const currency = balance.formatted.split(' ').at(-1) ?? 'USD';

  /*
   * The balance column is `auto`, the rest share what is left.
   *
   * An equal five-column split gave the headline figure a fixed fraction of the
   * row, which is fine for "0 USD" and wrong for "11 308 USD" — at 34px the
   * latter overflowed its cell and printed on top of the figure beside it.
   * Sizing the first column to its content and letting the four supporting
   * figures divide the remainder means the strip adapts to the account's
   * actual magnitude instead of assuming one.
   */
  return (
    <dl
      className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-[auto_repeat(4,minmax(0,1fr))]"
      data-testid="telemetry-strip"
    >
      {/*
       * The balance keeps its own row on anything narrower than a laptop.
       * Sharing a five-column grid with four smaller figures gave "10 000 USD"
       * about 150px and broke it across two lines — the headline number on the
       * page, hyphenated by a layout constraint that costs nothing to remove.
       */}
      <div className="col-span-2 min-w-0 sm:col-span-3 lg:col-span-1 lg:pr-4">
        <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          {balance.label}
        </dt>
        <dd
          className="wariba-data mt-1 whitespace-nowrap text-[30px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--wariba-text-primary)] sm:text-[34px]"
          data-testid="account-balance"
        >
          <AnimatedNumber
            value={balance.value}
            format={(value) => `${Math.round(value).toLocaleString('fr-FR')} ${currency}`}
          />
        </dd>
      </div>

      {figures.map((figure) => (
        <div key={figure.label} className="min-w-0">
          <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            {figure.label}
          </dt>
          <dd
            className="wariba-data mt-1 text-[length:var(--wariba-font-size-heading-xs)] font-semibold leading-none tracking-[-0.01em]"
            style={{
              color: figure.signed
                ? signColor(figure.numericValue)
                : 'var(--wariba-text-primary)',
            }}
          >
            {typeof figure.numericValue === 'number' && figure.unit ? (
              <AnimatedNumber
                value={figure.numericValue}
                format={(value) => {
                  const rounded = Math.round(value);
                  const sign = figure.signed && rounded > 0 ? '+' : '';
                  return `${sign}${rounded.toLocaleString('fr-FR')} ${figure.unit}`;
                }}
              />
            ) : (
              figure.value
            )}
          </dd>
          {figure.hint ? (
            <p className="mt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {figure.hint}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
