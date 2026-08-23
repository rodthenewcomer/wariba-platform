import type { JournalSummaryView } from '@wariba/application';
import { Surface } from '../../../components/hub/Surface';

/**
 * What the rows below add up to.
 *
 * Every figure arrives already computed and already formatted by
 * `journal-view.ts`. `apps/web` deliberately does not carry `decimal.js`, and
 * that constraint is the useful kind: it means a total on this page cannot
 * disagree with the column above it, because the page never added anything up.
 *
 * The summary describes the *filtered* set — the trades currently on screen —
 * not the account. See `JournalSummaryView` for why those are different
 * questions.
 */
export function JournalSummary({ summary }: { summary: JournalSummaryView | null }) {
  if (!summary) return null;

  const net = Number.parseFloat(summary.netPnl);
  const netColor =
    net === 0
      ? 'var(--wariba-text-primary)'
      : net > 0
        ? 'var(--wariba-accent-emerald)'
        : 'var(--wariba-accent-red)';

  return (
    <Surface className="p-4 sm:p-5" data-testid="journal-summary">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Résultat net
          </dt>
          <dd
            className="wariba-data mt-1 text-[22px] font-semibold leading-none tracking-[-0.01em]"
            style={{ color: netColor }}
          >
            {summary.netPnlFormatted}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Trades clôturés
          </dt>
          {/* The breakdown lives inside the <dd> — see TelemetryStrip's note. */}
          <dd className="mt-1">
            <span className="wariba-data text-[22px] font-semibold leading-none text-[color:var(--wariba-text-primary)]">
              {summary.tradeCount}
            </span>
            <span className="mt-1 block text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {summary.wins} gagnants · {summary.losses} perdants
            </span>
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Taux de réussite
          </dt>
          <dd className="wariba-data mt-1 text-[22px] font-semibold leading-none text-[color:var(--wariba-text-primary)]">
            {/* A dash, never "0 %", when nothing has been decided. */}
            {summary.winRatePercent === null ? '—' : `${summary.winRatePercent} %`}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Gain / perte moyens
          </dt>
          <dd className="mt-1 flex flex-col gap-0.5">
            <span
              className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-semibold"
              style={{ color: 'var(--wariba-accent-emerald)' }}
            >
              {summary.averageWinFormatted ?? '—'}
            </span>
            <span
              className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-semibold"
              style={{ color: 'var(--wariba-accent-red)' }}
            >
              {summary.averageLossFormatted ?? '—'}
            </span>
          </dd>
        </div>
      </dl>
    </Surface>
  );
}
