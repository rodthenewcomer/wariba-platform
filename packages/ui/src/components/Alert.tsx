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

// Text must pair with LEVEL's *-background above, not the page's generic
// --wariba-text-primary/-secondary: those flip to near-white on WariX's
// always-dark canvas while these status backgrounds stay a fixed light
// tint unless the design-tokens dark-theme block overrides them too — using
// the page's generic text color here would silently pair light-on-light
// the moment this renders inside a dark theme scope. Found via a real
// browser check against /trade rendering a genuine server rejection
// (Prompt 07) — the title was unreadable.
const TEXT: Record<AlertLevel, string> = {
  information: 'text-[color:var(--wariba-status-information-text)]',
  success: 'text-[color:var(--wariba-status-success-text)]',
  warning: 'text-[color:var(--wariba-status-warning-text)]',
  danger: 'text-[color:var(--wariba-status-danger-text)]',
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
          <p
            className={cx(
              'text-[length:var(--wariba-font-size-body-md)] font-semibold',
              TEXT[level],
            )}
          >
            {title}
          </p>
          {children ? (
            <div className={cx('text-[length:var(--wariba-font-size-body-sm)]', TEXT[level])}>
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
