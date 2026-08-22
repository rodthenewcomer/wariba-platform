import { cx } from '../lib/cx';

export interface GuardianConcentrationBucket {
  /** Stable key for React lists — not shown, the label is. */
  bucket: string;
  label: string;
  usedFormatted: string;
  limitFormatted: string;
  /** 0-100+, already computed server-side — this component does no math (Design System §48). */
  usedRatioPercent: number;
}

export interface GuardianProps {
  symbol: string;
  quantityFormatted: string;
  marginEstimatedFormatted: string;
  dailyLossRemainingFormatted: string;
  maximumLossRemainingFormatted: string;
  concentration: GuardianConcentrationBucket[];
  isPriceStale: boolean;
  /** e.g. "Weekend dans 2h" — omit when none (TRD-016 not yet resolved, so this is always omitted today). */
  restrictionLabel?: string;
}

function statLine(label: string, value: string) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        {label}
      </span>
      <span className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
        {value}
      </span>
    </div>
  );
}

/**
 * UX Architecture §22.8 / Rulebook §9.5 / DECISION_LOG PROD-011 (LOCKED) —
 * Guardian is deterministic. It shows impact potentiel, marge, exposition,
 * DLL restante, Maximum Loss restante, concentration informative, prix
 * périmé, restriction news/weekend. It never says "Achetez", "Vendez",
 * "Setup fort", or a win probability — there is no such copy anywhere in
 * this component, by design, not by omission.
 *
 * Every number here is already computed by the caller (services/realtime's
 * risk math, @wariba/domain's estimateRequiredMargin/computeConcentration)
 * — this component only lays them out, exactly like RiskRibbon.
 */
export function Guardian({
  symbol,
  quantityFormatted,
  marginEstimatedFormatted,
  dailyLossRemainingFormatted,
  maximumLossRemainingFormatted,
  concentration,
  isPriceStale,
  restrictionLabel,
}: GuardianProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-theme-border)] bg-[color:var(--wariba-component-trade-panel-elevated)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
          Guardian
        </span>
        <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          Déterministe
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-wide text-[color:var(--wariba-text-tertiary)]">
          Impact potentiel — {symbol} {quantityFormatted}
        </span>
        {statLine('Marge estimée', marginEstimatedFormatted)}
        {statLine('DLL restante', dailyLossRemainingFormatted)}
        {statLine('Perte max. restante', maximumLossRemainingFormatted)}
      </div>

      {concentration.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-wide text-[color:var(--wariba-text-tertiary)]">
            Concentration
          </span>
          {concentration.map((entry) => (
            <div key={entry.bucket} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                  {entry.label}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                  {entry.usedFormatted} / {entry.limitFormatted}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`Concentration ${entry.label}`}
                aria-valuenow={Math.round(entry.usedRatioPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--wariba-theme-border)]"
              >
                <div
                  className={cx(
                    'h-full rounded-full',
                    entry.usedRatioPercent >= 100
                      ? 'bg-[color:var(--wariba-status-danger-strong)]'
                      : 'bg-[color:var(--wariba-status-information-strong)]',
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, entry.usedRatioPercent))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {isPriceStale && (
        <p className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-status-warning-text)]">
          Cours non actualisé — l’impact affiché n’est plus à jour.
        </p>
      )}

      {restrictionLabel && (
        <p className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
          {restrictionLabel}
        </p>
      )}

      <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
        Guardian informe, il ne recommande jamais un sens d’ordre.
      </p>
    </div>
  );
}
