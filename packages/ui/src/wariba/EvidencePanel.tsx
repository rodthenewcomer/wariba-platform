import type { ReactNode } from 'react';

export interface EvidenceEvent {
  timestampLabel: string;
  description: string;
}

export interface EvidencePanelProps {
  ruleCode: string;
  ruleLabel: string;
  thresholdFormatted: string;
  observedValueFormatted: string;
  timestampLabel: string;
  events: EvidenceEvent[];
  consequence: string;
  appealAction?: ReactNode;
}

/**
 * Design System §25.9 / Rulebook §4.5 — every restriction, violation, or payout
 * decision must show rule, threshold, observed value, timestamp, events, and
 * consequence, plus a way to contest it. This panel is that contract made visible.
 */
export function EvidencePanel({
  ruleCode,
  ruleLabel,
  thresholdFormatted,
  observedValueFormatted,
  timestampLabel,
  events,
  consequence,
  appealAction,
}: EvidencePanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-subtle)] p-[var(--wariba-space-5)]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
          {ruleLabel}
        </h3>
        <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          {ruleCode}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[length:var(--wariba-font-size-body-sm)]">
        <dt className="text-[color:var(--wariba-text-secondary)]">Seuil</dt>
        <dd className="wariba-data text-right text-[color:var(--wariba-text-primary)]">
          {thresholdFormatted}
        </dd>
        <dt className="text-[color:var(--wariba-text-secondary)]">Valeur observée</dt>
        <dd className="wariba-data text-right text-[color:var(--wariba-text-primary)]">
          {observedValueFormatted}
        </dd>
        <dt className="text-[color:var(--wariba-text-secondary)]">Horodatage</dt>
        <dd className="wariba-data text-right text-[color:var(--wariba-text-primary)]">
          {timestampLabel}
        </dd>
      </dl>

      {events.length > 0 ? (
        <ol className="flex flex-col gap-1.5 border-l border-[color:var(--wariba-border-strong)] pl-3">
          {events.map((event, index) => (
            <li
              key={index}
              className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]"
            >
              <span className="wariba-data mr-2 text-[color:var(--wariba-text-secondary)]">
                {event.timestampLabel}
              </span>
              {event.description}
            </li>
          ))}
        </ol>
      ) : null}

      <p className="text-[length:var(--wariba-font-size-body-md)] font-medium text-[color:var(--wariba-text-primary)]">
        {consequence}
      </p>

      {appealAction}
    </div>
  );
}
