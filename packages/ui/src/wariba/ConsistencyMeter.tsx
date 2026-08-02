export interface ConsistencyMeterProps {
  /** 0–100+, already computed: bestDay / totalProfit. */
  ratioPercent: number;
  limitPercent: number;
  /** Already formatted, e.g. "320 USD". */
  bestDayFormatted: string;
  totalProfitFormatted: string;
  /** Present only when ratioPercent > limitPercent — profit needed for compliance without reducing the best day. */
  requiredProfitFormatted?: string;
}

/**
 * Design System §25.4 — Rulebook §15: exceeding the 40% limit is never a breach,
 * only a hold on eligibility. The track never turns to a "violation" red — it's
 * "waiting for compliance" framing per UX Architecture §21.4.
 */
export function ConsistencyMeter({
  ratioPercent,
  limitPercent,
  bestDayFormatted,
  totalProfitFormatted,
  requiredProfitFormatted,
}: ConsistencyMeterProps) {
  const compliant = ratioPercent <= limitPercent;
  const trackPercent = Math.min(100, ratioPercent);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
          Consistance
        </span>
        <span
          className={`wariba-data text-[length:var(--wariba-font-size-data-md)] font-medium ${
            // Text uses the status.*.text tokens (tuned for 4.5:1 AA on body text),
            // not the component accent tokens above (tuned for 3:1 on fills/tracks).
            compliant
              ? 'text-[color:var(--wariba-status-success-text)]'
              : 'text-[color:var(--wariba-status-warning-text)]'
          }`}
        >
          {ratioPercent.toFixed(1)}%
        </span>
      </div>

      <div className="relative h-[var(--wariba-component-consistency-meter-track-height)] w-full overflow-visible rounded-[var(--wariba-component-consistency-meter-track-radius)] bg-[color:var(--wariba-background-subtle)]">
        <div
          className="h-full rounded-[var(--wariba-component-consistency-meter-track-radius)] transition-[width]"
          style={{
            width: `${trackPercent}%`,
            backgroundColor: compliant
              ? 'var(--wariba-component-consistency-meter-compliant-accent)'
              : 'var(--wariba-component-consistency-meter-waiting-accent)',
          }}
        />
        <div
          className="absolute top-0 h-full w-px bg-[color:var(--wariba-component-consistency-meter-limit-marker)]"
          style={{ left: `${Math.min(100, limitPercent)}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="flex justify-between text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        <span>
          Meilleure journée&nbsp;<span className="wariba-data">{bestDayFormatted}</span>
        </span>
        <span>
          Profit total&nbsp;<span className="wariba-data">{totalProfitFormatted}</span>
        </span>
      </div>

      {!compliant && requiredProfitFormatted ? (
        <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
          Compte non conforme : continuez à trader jusqu&apos;à un ratio ≤ {limitPercent}%. Profit
          total requis pour conformité (sans réduire la meilleure journée)&nbsp;:{' '}
          <span className="wariba-data">{requiredProfitFormatted}</span>.
        </p>
      ) : null}
    </div>
  );
}
