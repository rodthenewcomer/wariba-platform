export interface TradingDayItem {
  dateLabel: string;
  finalized: boolean;
  netPnlFormatted: string;
}

export interface TradingDaysListProps {
  days: readonly TradingDayItem[];
  emptyLabel?: string;
}

/**
 * WARIBA ONE history of finalized trading days — deliberately has no
 * "qualified" concept (ONE-024 removed qualified days from Evaluation).
 * Distinct from QualifiedDaysTracker, which is reserved for Performance.
 */
export function TradingDaysList({
  days,
  emptyLabel = 'Aucune journée finalisée pour l’instant.',
}: TradingDaysListProps) {
  if (days.length === 0) {
    return (
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {days.map((day) => (
        <li
          key={day.dateLabel}
          className="flex items-center justify-between gap-3 rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-border-subtle)] px-[var(--wariba-space-3)] py-[var(--wariba-space-2)]"
        >
          <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
            {day.dateLabel}
          </span>
          <span className="flex items-center gap-3">
            {!day.finalized ? (
              <span className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-secondary)]">
                En cours
              </span>
            ) : null}
            <span className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
              {day.netPnlFormatted}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
