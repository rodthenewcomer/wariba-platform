import type { PerformanceKpis } from '@wariba/application';
import { Surface, SurfaceTitle } from './Surface';

/**
 * How often the trader is right, and what that is worth.
 *
 * ## Why the ring and the ratio sit together
 *
 * A win rate alone is one of the most misleading figures in trading. 30 % with
 * a 4:1 average is a good system; 80 % with a 1:6 average is an account about
 * to be closed. Showing the proportion without the magnitude beside it invites
 * exactly the wrong conclusion, so the ring answers "how often" and the two
 * averages underneath answer "for how much" — on the same card, at the same
 * moment.
 *
 * ## Why it is an SVG and not a chart library
 *
 * §16: two arcs. `lightweight-charts` is already loaded for the time series
 * and it does not draw donuts; adding a second framework to render one circle
 * would be a dependency bought for a shape that is nine lines of markup.
 *
 * ## Why it is not rendered at all with no trades
 *
 * A 0/0 ring is a grey circle asserting a 0 % win rate, which is a claim that
 * the trader lost every trade. The caller renders the empty state instead.
 */

const SIZE = 132;
const THICKNESS = 12;
const RADIUS = (SIZE - THICKNESS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatUsd(amount: string | null): string | null {
  if (amount === null) return null;
  const value = Number.parseFloat(amount);
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

export function WinLossRing({ kpis }: { kpis: PerformanceKpis }) {
  if (kpis.tradeCount === 0 || kpis.winRatePercent === null) return null;

  const winFraction = kpis.wins / kpis.tradeCount;
  const winArc = CIRCUMFERENCE * winFraction;

  return (
    <Surface className="flex h-full flex-col gap-4 p-5 sm:p-6" data-testid="win-loss-ring">
      <SurfaceTitle>Gagnants / perdants</SurfaceTitle>

      <div className="flex flex-1 flex-wrap items-center gap-6">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          {/*
           * The ring is decorative — every figure it encodes is written beside
           * it in text, so assistive technology gets the numbers rather than a
           * description of a circle.
           */}
          <svg width={SIZE} height={SIZE} aria-hidden="true" className="-rotate-90">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--wariba-accent-red)"
              strokeWidth={THICKNESS}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--wariba-accent-emerald)"
              strokeWidth={THICKNESS}
              strokeDasharray={`${winArc} ${CIRCUMFERENCE - winArc}`}
              strokeLinecap="butt"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="wariba-data text-[24px] font-semibold leading-none text-[color:var(--wariba-text-primary)]">
              {kpis.winRatePercent} %
            </span>
            <span className="mt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              réussite
            </span>
          </div>
        </div>

        {/*
         * Every child of the <dl> is one <div> holding a <dt>/<dd> pair, and
         * nothing deeper. Wrapping a row in a second <div> to hang a separator
         * on it put the <dt> two levels down, which is a malformed definition
         * list — axe reports it as `definition-list` and `dlitem`, and a screen
         * reader loses the term/description pairing that is the entire reason
         * this is a <dl>. The separator is a class on the row instead.
         */}
        {/*
         * A real minimum, not `min-w-0`.
         *
         * The ring is a fixed 132px and does not shrink. With `min-w-0` the
         * list happily compressed to the ~84px left beside it at 320px, and
         * "+289,14 USD" simply overflowed the page — a `justify-between` row
         * has nowhere to put a figure that no longer fits. Given a floor wide
         * enough to hold the longest label-and-amount pair, flex-wrap does the
         * right thing instead and drops the list under the ring.
         */}
        <dl className="flex min-w-[190px] flex-1 flex-col gap-3">
          <Row
            label="Trades gagnants"
            value={String(kpis.wins)}
            color="var(--wariba-accent-emerald)"
          />
          <Row
            label="Trades perdants"
            value={String(kpis.losses)}
            color="var(--wariba-accent-red)"
          />
          <Row
            label="Gain moyen"
            value={formatUsd(kpis.averageWin) ?? '—'}
            color="var(--wariba-accent-emerald)"
            className="border-t border-[color:var(--warix-border-subtle)] pt-3"
          />
          <Row
            label="Perte moyenne"
            value={formatUsd(kpis.averageLoss) ?? '—'}
            color="var(--wariba-accent-red)"
          />
        </dl>
      </div>

      {/*
       * The sentence a win rate needs beside it. Stated only when both averages
       * exist, because the comparison is meaningless with one of them missing.
       */}
      {kpis.winLossRatio !== null ? (
        <p className="text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-tertiary)]">
          Vos gains moyens valent{' '}
          <span className="wariba-data text-[color:var(--wariba-text-secondary)]">
            {kpis.winLossRatio.toFixed(2)}×
          </span>{' '}
          vos pertes moyennes.
        </p>
      ) : null}
    </Surface>
  );
}

function Row({
  label,
  value,
  color,
  className,
}: {
  label: string;
  value: string;
  color: string;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className ?? ''}`}>
      <dt className="flex items-center gap-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        {label}
      </dt>
      <dd className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
        {value}
      </dd>
    </div>
  );
}
