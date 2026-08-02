'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '../lib/cx';

export type DialogSize = 'sm' | 'md' | 'lg';

const MAX_WIDTH: Record<DialogSize, string> = {
  sm: 'max-w-[var(--wariba-component-dialog-max-width-sm)]',
  md: 'max-w-[var(--wariba-component-dialog-max-width-md)]',
  lg: 'max-w-[var(--wariba-component-dialog-max-width-lg)]',
};

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: DialogSize;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Design System §24.12 — reserved for decisions that require interruption, never
 * long content or a full rule explanation. Uses the native <dialog> element:
 * built-in focus trap, ESC-to-close, and top-layer stacking without a new dependency.
 */
export function Dialog({ open, onClose, title, size = 'md', children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cx(
        'rounded-[var(--wariba-component-dialog-radius)] p-0 backdrop:bg-[color:var(--wariba-background-inverse)]',
        'backdrop:opacity-[var(--wariba-opacity-overlay)] shadow-[var(--wariba-component-dialog-shadow)]',
        'border-none w-full',
        MAX_WIDTH[size],
      )}
    >
      <div className="p-[var(--wariba-component-dialog-padding)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-[var(--wariba-radius-xs)] p-1 text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-text-primary)]"
          >
            ×
          </button>
        </div>
        <div className="text-[color:var(--wariba-text-primary)]">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </dialog>
  );
}
