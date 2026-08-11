'use client';

import { ExecutionStatLine } from './ExecutionSection';
import type { TradeImpactView } from './execution-impact';

export interface TradeImpactPanelProps {
  impact: TradeImpactView | null;
}

/**
 * W4 §30/§31/§32/§33/§35 — Guardian's data, folded into the execution flow.
 *
 * Every figure Guardian showed is still here — estimated margin, DLL
 * remaining, maximum-loss remaining, concentration per bucket, the stale-price
 * caveat — and every one still comes from the same source it did before: the
 * canonical `estimateRequiredMargin` for margin, and the server's risk
 * snapshot verbatim for the rest. What changed is only that it is a section of
 * the instrument rather than a second card sitting under the ticket, and that
 * the concentration bars are compact (§35: no large chart).
 *
 * The label is "Marge estimée", never "Marge finale": the server prices and
 * executes the order, and the browser's mid-price estimate is not the figure
 * that will be debited (§32).
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
      <ExecutionStatLine label="Marge estimée" value={impact.marginEstimatedFormatted} />
      <ExecutionStatLine label="DLL restante" value={impact.dailyLossRemainingFormatted} />
      <ExecutionStatLine label="Perte max. restante" value={impact.maximumLossRemainingFormatted} />

      {impact.concentration.length > 0 ? (
        <div className="mt-1 flex flex-col gap-1.5">
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
