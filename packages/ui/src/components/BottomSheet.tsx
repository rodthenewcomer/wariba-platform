'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Design System §24.13 — mobile order ticket / detail / Close-All-confirmation pattern.
 * Native <dialog>, styled to sit flush against the bottom edge with a drag handle.
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
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
        'm-0 mt-auto mb-0 w-full max-w-full rounded-t-[var(--wariba-component-bottom-sheet-radius-top)] rounded-b-none',
        'border-none p-0 backdrop:bg-[color:var(--wariba-background-inverse)] backdrop:opacity-[var(--wariba-opacity-overlay)]',
        'shadow-[var(--wariba-component-bottom-sheet-shadow)]',
      )}
    >
      <div className="flex justify-center pt-3">
        <span
          aria-hidden="true"
          className="h-1 w-[var(--wariba-component-bottom-sheet-minimum-handle-width)] rounded-full bg-[color:var(--wariba-border-strong)]"
        />
      </div>
      <div className="p-[var(--wariba-component-bottom-sheet-padding)]">
        {title ? (
          <h2 className="mb-3 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </dialog>
  );
}
