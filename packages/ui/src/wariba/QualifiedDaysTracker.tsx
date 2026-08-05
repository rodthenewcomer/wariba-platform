import { cx } from '../lib/cx';
import { VisuallyHidden } from '../primitives/VisuallyHidden';

function qualificationStatusLabel(day: { qualified: boolean; finalized: boolean }): string {
  if (day.qualified) return 'Qualifiée';
  if (day.finalized) return 'Non qualifiée';
  return 'En attente';
}

export interface QualifiedDay {
  /** e.g. "1 août" */
  dateLabel: string;
  qualified: boolean;
  /** Finalized but not qualified (profitable-but-below-threshold, or non-profitable). */
  finalized: boolean;
  netPnlFormatted: string;
}

export interface QualifiedDaysTrackerProps {
  requiredCount: number;
  qualifiedCount: number;
  thresholdFormatted: string;
  days: QualifiedDay[];
}

/** Legacy component name; Rules v1.1 uses it for finalized Performance Days only. */
export function QualifiedDaysTracker({
  requiredCount,
  qualifiedCount,
  thresholdFormatted,
  days,
}: QualifiedDaysTrackerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
          Performance Days
        </span>
        <span className="wariba-data text-[length:var(--wariba-font-size-data-md)] font-medium text-[color:var(--wariba-text-primary)]">
          {qualifiedCount} / {requiredCount}
        </span>
      </div>
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        Seuil par journée&nbsp;: <span className="wariba-data">{thresholdFormatted}</span>
      </p>
      <ul className="flex flex-wrap gap-2">
        {days.map((day) => (
          <li
            key={day.dateLabel}
            className={cx(
              'flex flex-col items-center gap-1 rounded-[var(--wariba-radius-sm)] border px-2.5 py-1.5 text-center',
              day.qualified
                ? 'border-[color:var(--wariba-status-success-border)] bg-[color:var(--wariba-status-success-background)]'
                : day.finalized
                  ? 'border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-subtle)]'
                  : 'border-dashed border-[color:var(--wariba-border-default)]',
            )}
          >
            <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              {day.dateLabel}
            </span>
            <VisuallyHidden>{qualificationStatusLabel(day)}</VisuallyHidden>
            <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] font-medium text-[color:var(--wariba-text-primary)]">
              {day.netPnlFormatted}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
