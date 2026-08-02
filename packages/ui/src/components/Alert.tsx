'use client';

import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export type AlertLevel = 'information' | 'success' | 'warning' | 'danger';

const LEVEL: Record<AlertLevel, string> = {
  information:
    'border-[color:var(--wariba-status-information-border)] bg-[color:var(--wariba-status-information-background)]',
  success:
    'border-[color:var(--wariba-status-success-border)] bg-[color:var(--wariba-status-success-background)]',
  warning:
    'border-[color:var(--wariba-status-warning-border)] bg-[color:var(--wariba-status-warning-background)]',
  danger:
    'border-[color:var(--wariba-status-danger-border)] bg-[color:var(--wariba-status-danger-background)]',
};

export interface AlertProps {
  level?: AlertLevel;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}

/** Design System §24.10 / §35 — border + fond léger, jamais rouge plein écran sauf incident terminal. */
export function Alert({ level = 'information', title, children, action, onDismiss }: AlertProps) {
  return (
    <div
      role={level === 'danger' ? 'alert' : 'status'}
      className={cx(
        'rounded-[var(--wariba-radius-lg)] border p-[var(--wariba-space-4)]',
        LEVEL[level],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
            {title}
          </p>
          {children ? (
            <div className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              {children}
            </div>
          ) : null}
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fermer"
            className="shrink-0 rounded-[var(--wariba-radius-xs)] p-1 text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-text-primary)]"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
