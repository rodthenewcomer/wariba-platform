'use client';

import type { TradeImpactView } from './execution-impact';

export interface ExecutionImpactSummaryProps {
  impact: TradeImpactView | null;
}

const COLUMNS = [
  { key: 'margin', label: 'MARGE', title: 'Marge estimée' },
  { key: 'dll', label: 'DLL', title: 'Perte journalière restante' },
  { key: 'mll', label: 'MLL', title: 'Perte maximale restante' },
] as const;

/**
 * W4 visual closure §9 — the three figures that decide whether to press the
 * button, never more than a glance from the button.
 *
 * The Impact section is inside the scrolling region, which is correct for the
 * concentration bars and the stale-price caveat but wrong for these three: at
 * 1440×900 a trader could have Sell and Buy in front of them with the estimated
 * margin and both loss budgets scrolled out of sight. This row sits between the
 * fields and the actions, in the pinned area, so the decision state is complete
 * wherever the section above happens to be scrolled to.
 *
 * **Not a second derivation.** It renders `impact.compact`, the same values
 * `deriveTradeImpact` already produced for the section below — the margin from
 * `estimateRequiredMargin`, the two budgets verbatim from the server's risk
 * snapshot. Nothing here computes, rounds or reformats a figure: the only
 * difference from the detailed rows is that the shared "USD" is hoisted into
 * the header instead of repeating on each value.
 *
 * The abbreviations are the ones the status bar already uses ("DLL restant"),
 * and each carries its full French expansion as a `title` and in the accessible
 * name, so the compaction never costs a trader the meaning.
 */
export function ExecutionImpactSummary({ impact }: ExecutionImpactSummaryProps) {
  if (!impact) return null;

  const value = {
    margin: impact.compact.marginEstimated,
    dll: impact.compact.dailyLossRemaining,
    mll: impact.compact.maximumLossRemaining,
  } as const;

  return (
    <dl
      data-testid="execution-impact-summary"
      className="grid grid-cols-3 gap-x-2 border-t border-[color:var(--wariba-component-workstation-seam)] px-3 py-1.5"
    >
      {COLUMNS.map((column) => (
        <div key={column.key} className="flex min-w-0 flex-col gap-0.5">
          <dt
            title={column.title}
            className="text-[length:var(--wariba-font-size-data-xs)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]"
          >
            {column.label}
            <span className="sr-only"> — {column.title}, en dollars</span>
          </dt>
          <dd
            data-testid={`execution-impact-summary-${column.key}`}
            className="wariba-data truncate text-[length:var(--wariba-font-size-data-sm)] font-medium tabular-nums text-[color:var(--wariba-text-primary)]"
          >
            {value[column.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
