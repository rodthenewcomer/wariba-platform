import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Design System §34.1 — explain why, propose an action, never simulate data. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--wariba-radius-lg)] border border-dashed border-[color:var(--wariba-border-default)] px-6 py-12 text-center">
      <p className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
        {title}
      </p>
      <p className="max-w-sm text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
