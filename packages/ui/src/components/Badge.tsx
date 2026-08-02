import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export type BadgeVariant = 'neutral' | 'information' | 'success' | 'warning' | 'danger' | 'review';

const VARIANT: Record<BadgeVariant, string> = {
  neutral:
    'bg-[color:var(--wariba-status-neutral-background)] text-[color:var(--wariba-status-neutral-text)]',
  information:
    'bg-[color:var(--wariba-status-information-background)] text-[color:var(--wariba-status-information-text)]',
  success:
    'bg-[color:var(--wariba-status-success-background)] text-[color:var(--wariba-status-success-text)]',
  warning:
    'bg-[color:var(--wariba-status-warning-background)] text-[color:var(--wariba-status-warning-text)]',
  danger:
    'bg-[color:var(--wariba-status-danger-background)] text-[color:var(--wariba-status-danger-text)]',
  review: 'bg-copper-100 text-copper-700',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

/** Design System §24.9 — for state/type/policy-version, not decoration on every row. */
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex h-[var(--wariba-component-badge-height)] items-center gap-[var(--wariba-component-badge-gap)]',
        'rounded-[var(--wariba-component-badge-radius)] px-[var(--wariba-component-badge-padding-x)]',
        'text-[length:var(--wariba-font-size-label-sm)] font-semibold tracking-[var(--wariba-letter-spacing-wide)] uppercase',
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
