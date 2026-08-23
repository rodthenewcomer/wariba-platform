import type { DailyPnlPoint } from '@wariba/application';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';

/**
 * Which days made the money, and which lost it.
 *
 * ## Why bars and not a second line chart
 *
 * The evolution curve beside this answers "where has the account gone". This
 * answers a different question — "what did each day do" — and a cumulative
 * line genuinely cannot: three flat days and one large loss produce the same
 * end point as four mediocre days, and only the bars distinguish them. That
 * distinction is the whole of the consistency rule.
 *
 * ## Why hand-drawn and not a charting library
 *
 * §16: a heavyweight chart framework earns its place on a time series with a
 * crosshair, tooltips and an axis. This is a dozen rectangles with a zero line.
 * `lightweight-charts` is already loaded for the curve and adding a second
 * framework for bars this simple would be a dependency bought for nothing.
 *
 * ## Why it scales to the largest absolute day
 *
 * Not to the largest gain. A record with a +1 078 day and a −287 day drawn on
 * separate positive and negative scales makes the loss look proportionally
 * worse than it was, and the two halves of the axis stop being comparable.
 * One scale, symmetric, so a bar twice as tall really is twice the money.
 */

function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${Math.round(value).toLocaleString('fr-FR')} USD`;
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

export function DailyPnlStrip({ points }: { points: readonly DailyPnlPoint[] }) {
  /*
   * The empty state keeps the module rather than removing it — §26. A missing
   * panel leaves a hole in the grid and tells the trader nothing; a panel that
   * says the record has not started tells them what will appear here.
   */
  if (points.length === 0) {
    return (
      <Surface data-testid="daily-pnl" className="flex h-full flex-col gap-4 p-5 sm:p-6">
        <SurfaceTitle>Résultat par journée</SurfaceTitle>
        <div className="flex flex-1 flex-col justify-center gap-2 py-6">
          <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
            Aucune journée clôturée.
          </p>
          <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Chaque journée terminée apparaîtra ici, en gain ou en perte.
          </p>
        </div>
      </Surface>
    );
  }

  // Twelve at most: beyond that the bars are thinner than the gaps between them.
  const recent = points.slice(-12);
  const scale = Math.max(...recent.map((point) => Math.abs(point.netPnl)), 1);

  const best = recent.reduce((a, b) => (b.netPnl > a.netPnl ? b : a));
  const worst = recent.reduce((a, b) => (b.netPnl < a.netPnl ? b : a));

  return (
    <Surface data-testid="daily-pnl" className="flex h-full flex-col gap-4 p-5 sm:p-6">
      <SurfaceTitle>Résultat par journée</SurfaceTitle>

      {/*
       * A list, not a bag of divs. A screen reader gets "12 items" and each
       * item reads as a date and an amount — which is the same information the
       * bars carry, in the form that medium can convey.
       */}
      <ul className="flex flex-1 items-end gap-1.5" style={{ minHeight: 132 }}>
        {recent.map((point) => {
          const positive = point.netPnl >= 0;
          const magnitude = Math.abs(point.netPnl) / scale;
          // A floor of 3% so a near-flat day is still a visible mark rather
          // than an invisible one the eye reads as a missing session.
          const height = Math.max(3, magnitude * 50);

          return (
            <li
              key={point.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`${dayLabel(point.date)} · ${formatSigned(point.netPnl)}`}
            >
              <span className="sr-only">
                {dayLabel(point.date)} : {formatSigned(point.netPnl)}
              </span>

              {/* Upper half — gains grow up from the zero line. */}
              <span aria-hidden="true" className="flex w-full flex-1 items-end justify-center">
                {positive ? (
                  <span
                    className="w-full rounded-t-[3px]"
                    style={{
                      height: `${height}%`,
                      background: 'var(--wariba-accent-emerald)',
                    }}
                  />
                ) : null}
              </span>

              <span
                aria-hidden="true"
                className="h-px w-full"
                style={{ background: 'var(--warix-border-subtle)' }}
              />

              {/* Lower half — losses grow down from it. */}
              <span aria-hidden="true" className="flex w-full flex-1 items-start justify-center">
                {!positive ? (
                  <span
                    className="w-full rounded-b-[3px]"
                    style={{
                      height: `${height}%`,
                      background: 'var(--wariba-accent-red)',
                    }}
                  />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      <dl className="flex flex-col gap-2 border-t border-[color:var(--warix-border-subtle)] pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Meilleure journée
          </dt>
          <dd
            className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-medium"
            style={{ color: 'var(--wariba-accent-emerald)' }}
          >
            {formatSigned(best.netPnl)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Pire journée
          </dt>
          <dd
            className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-medium"
            style={{
              color:
                worst.netPnl < 0 ? 'var(--wariba-accent-red)' : 'var(--wariba-text-primary)',
            }}
          >
            {formatSigned(worst.netPnl)}
          </dd>
        </div>
      </dl>
    </Surface>
  );
}
