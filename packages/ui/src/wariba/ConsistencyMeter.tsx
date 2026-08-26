export interface ConsistencyMeterProps {
  /** 0–100+, already computed: bestDay / sum of the POSITIVE days. */
  ratioPercent: number;
  limitPercent: number;
  /** Already formatted, e.g. "320 USD". */
  bestDayFormatted: string;
  /**
   * The sum of the winning days — NOT total realized profit, whatever the
   * name suggests. Callers pass `positiveDaysProfitSum`; the name is the
   * v1.0 denominator's and has outlived the rule it described.
   */
  totalProfitFormatted: string;
  /** Present only when ratioPercent > limitPercent — profit needed for compliance without reducing the best day. */
  requiredProfitFormatted?: string;
}

/**
 * Design System §25.4 — Rulebook §15: exceeding the limit is never a breach,
 * only a hold on eligibility. The track never turns to a "violation" red — it's
 * "waiting for compliance" framing per UX Architecture §21.4.
 *
 * `limitPercent` is a prop rather than a constant because the ratio lives in
 * the published policy; the comment above used to name a figure of its own,
 * which is how a component ends up disagreeing with the rule it draws.
 *
 * The heading reads « Meilleur Jour », the rule's name in the policy the risk
 * engine enforces. « Consistance » was the v1.0 name and survived here after
 * the rule itself was superseded (see computeBestDayRatio, which notes the
 * old denominator); a trader reading the Help Center finds « Meilleur Jour »
 * and must find the same words on the screen it describes.
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
          Meilleur Jour
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
          Journées gagnantes&nbsp;<span className="wariba-data">{totalProfitFormatted}</span>
        </span>
      </div>

      {!compliant && requiredProfitFormatted ? (
        <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
          Votre meilleure journée pèse encore trop lourd — ce n&apos;est pas un dépassement, et
          votre compte n&apos;est pas en danger. Elle doit descendre à {limitPercent}&nbsp;% de vos
          journées gagnantes. Sans rien retirer à votre meilleure journée, il vous manque{' '}
          <span className="wariba-data">{requiredProfitFormatted}</span> de gains sur d&apos;autres
          journées.
        </p>
      ) : null}
    </div>
  );
}
