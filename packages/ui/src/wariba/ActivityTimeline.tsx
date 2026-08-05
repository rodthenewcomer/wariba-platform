import { cx } from '../lib/cx';

export type ActivityTimelineSeverity = 'information' | 'warning' | 'danger' | 'success';

export interface ActivityTimelineItem {
  id: string;
  label: string;
  detail?: string;
  timestampLabel: string;
  severity: ActivityTimelineSeverity;
}

export interface ActivityTimelineProps {
  items: readonly ActivityTimelineItem[];
  emptyLabel?: string;
}

const SEVERITY_DOT: Record<ActivityTimelineSeverity, string> = {
  information: 'bg-[color:var(--wariba-status-information-text)]',
  warning: 'bg-[color:var(--wariba-status-warning-text)]',
  danger: 'bg-[color:var(--wariba-status-danger-text)]',
  success: 'bg-[color:var(--wariba-status-success-text)]',
};

/** Prompt 06 Zone 4 — recent_activity_view rendered as a flat chronological list. */
export function ActivityTimeline({
  items,
  emptyLabel = 'Aucune activité pour l’instant.',
}: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span
            aria-hidden="true"
            className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT[item.severity])}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                {item.label}
              </p>
              <p className="wariba-data shrink-0 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                {item.timestampLabel}
              </p>
            </div>
            {item.detail ? (
              <p className="wariba-data mt-0.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {item.detail}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
