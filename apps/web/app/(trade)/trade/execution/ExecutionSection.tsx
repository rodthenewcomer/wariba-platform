import type { ReactNode } from 'react';

/**
 * W4 §61 — a seam, not a card.
 *
 * The pre-W4 right panel was a stack of bordered, elevated, rounded boxes: an
 * Order Ticket block, a Guardian block below it, alert cards above both. Each
 * one announced itself as a separate widget, which is why the panel read as a
 * SaaS dashboard rather than as one instrument. This primitive replaces that
 * with a hairline rule and a small caps heading, so the Execution Center is a
 * single continuous surface whose parts are legible without being boxed.
 *
 * A section only suppresses its rule when it is genuinely the first child of
 * its container (`first:`) — inside the Execution Center it never is, because
 * the market header and the status area precede it, and a seam under the
 * header is exactly the separation that belongs there.
 */
export interface ExecutionSectionProps {
  title: string;
  /** Optional right-aligned control or value on the heading row. */
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}

export function ExecutionSection({ title, action, children, testId }: ExecutionSectionProps) {
  return (
    <section
      {...(testId ? { 'data-testid': testId } : {})}
      className="flex flex-col gap-2 border-t border-[color:var(--wariba-component-workstation-seam)] px-3 py-2.5 first:border-t-0"
    >
      <div className="flex min-h-4 items-baseline justify-between gap-2">
        <h3 className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-wide text-[color:var(--wariba-text-tertiary)]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One label/value line, tabular figures on the value — the Trade Impact row shape. */
export function ExecutionStatLine({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const valueColor =
    tone === 'positive'
      ? 'text-[color:var(--wariba-status-success-text)]'
      : tone === 'negative'
        ? 'text-[color:var(--wariba-status-danger-text)]'
        : 'text-[color:var(--wariba-text-primary)]';
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        {label}
      </span>
      <span
        className={`wariba-data text-[length:var(--wariba-font-size-body-sm)] font-medium ${valueColor}`}
      >
        {value}
      </span>
    </div>
  );
}
