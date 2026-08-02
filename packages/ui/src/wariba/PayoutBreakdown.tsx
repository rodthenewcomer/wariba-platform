import type { ReactNode } from 'react';

export interface PayoutBreakdownRow {
  label: string;
  valueFormatted: string;
  helper?: string;
}

export interface PayoutBreakdownProps {
  /** In the strict order required by Design System §25.6: profit net → limite 50% →
   * cap → Payout Base → split → frais → conversion → montant local. Pass exactly
   * that order — this component renders rows verbatim, it computes nothing. */
  rows: PayoutBreakdownRow[];
  traderCashLabel: string;
  traderCashFormatted: string;
  estimateDisclaimer?: ReactNode;
}

/** Design System §25.6 / UX Architecture §28.2 — every payout figure fully decomposed, never a single number. */
export function PayoutBreakdown({
  rows,
  traderCashLabel,
  traderCashFormatted,
  estimateDisclaimer,
}: PayoutBreakdownProps) {
  return (
    <div className="flex flex-col gap-[var(--wariba-component-payout-breakdown-section-gap)]">
      <dl className="flex flex-col gap-[var(--wariba-component-payout-breakdown-row-gap)]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex min-h-[var(--wariba-component-payout-breakdown-row-height)] items-center justify-between gap-4"
          >
            <dt className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              {row.label}
              {row.helper ? (
                <span className="ml-1.5 text-[color:var(--wariba-text-secondary)]">
                  ({row.helper})
                </span>
              ) : null}
            </dt>
            <dd className="wariba-data text-[length:var(--wariba-font-size-data-md)] text-[color:var(--wariba-text-primary)]">
              {row.valueFormatted}
            </dd>
          </div>
        ))}
      </dl>

      <div
        className="flex items-center justify-between gap-4 border-t pt-[var(--wariba-component-payout-breakdown-row-gap)]"
        style={{
          borderTopWidth: 'var(--wariba-component-payout-breakdown-total-border-width)',
          borderTopColor: 'var(--wariba-component-payout-breakdown-total-accent)',
        }}
      >
        <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
          {traderCashLabel}
        </span>
        <span
          className="wariba-data text-[length:var(--wariba-font-size-data-lg)] font-semibold"
          style={{ color: 'var(--wariba-component-payout-breakdown-total-accent)' }}
        >
          {traderCashFormatted}
        </span>
      </div>

      {estimateDisclaimer ? (
        <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
          {estimateDisclaimer}
        </p>
      ) : null}
    </div>
  );
}
