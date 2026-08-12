'use client';

import type { TradeImpactView } from './execution-impact';

export interface TradeImpactPanelProps {
  impact: TradeImpactView | null;
}

/**
 * W4 §30/§31/§32/§33/§35 — Guardian's data, folded into the execution flow.
 *
 * Every figure Guardian showed is still on screen — estimated margin, DLL
 * remaining, maximum-loss remaining, concentration per bucket, the stale-price
 * caveat — and every one still comes from the same source it did before: the
 * canonical `estimateRequiredMargin` for margin, and the server's risk snapshot
 * verbatim for the rest. What changed is where each one lives. The three
 * headline figures are pinned above the actions in `ExecutionImpactSummary`
 * (visual closure §9), because they decide whether to press the button; this
 * section keeps what the summary cannot carry at that size.
 *
 * The summary labels the margin "MARGE" with "Marge estimée" as its title —
 * never "Marge finale": the server prices and executes the order, and the
 * browser's mid-price estimate is not the figure that will be debited (§32).
 *
 * Guardian's own promise is preserved by construction — this component states
 * impact and never suggests a direction. There is no "buy"/"sell"/"strong
 * setup" copy anywhere in it.
 */
export function TradeImpactPanel({ impact }: TradeImpactPanelProps) {
  if (!impact) {
    return (
      <p
        data-testid="trade-impact-unavailable"
        className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-tertiary)]"
      >
        L’impact sera calculé dès que le compte, le symbole et une cotation sont disponibles.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="trade-impact">
      {/*
       * Visual closure §9 — the three headline figures *moved* here to the
       * pinned summary above the actions; they are not repeated.
       *
       * Rendering them in both places was the first attempt and the mobile
       * capture showed why it was wrong: on a 90dvh sheet both are on screen
       * at once, so "Marge estimée 216.99 USD" appeared twice, four rows apart.
       * Duplication in a panel about money reads as two numbers that happen to
       * agree rather than as one fact. What stays here is what the summary
       * cannot carry at that size — concentration per bucket, and the
       * stale-price caveat.
       */}
      {impact.concentration.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {impact.concentration.map((entry) => (
            <div key={entry.bucket} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                  {entry.label}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-primary)]">
                  {entry.usedFormatted} / {entry.limitFormatted}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`Concentration ${entry.label}`}
                aria-valuenow={Math.round(entry.usedRatioPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1 w-full overflow-hidden rounded-full bg-[color:var(--wariba-theme-border)]"
              >
                <div
                  className={`h-full rounded-full ${
                    entry.usedRatioPercent >= 100
                      ? 'bg-[color:var(--wariba-status-danger-strong)]'
                      : 'bg-[color:var(--wariba-status-information-strong)]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, entry.usedRatioPercent))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {impact.isPriceStale ? (
        <p className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-status-warning-text)]">
          Prix périmé — l’impact affiché n’est plus à jour.
        </p>
      ) : null}
    </div>
  );
}
