'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * The chart's own modal shell — the Indicators library and the Settings modal.
 *
 * Not `@wariba/ui`'s `Dialog`: that component's contract says in as many words
 * that it is "reserved for decisions that require interruption, never long
 * content", and it sizes and pads itself accordingly. An indicator library is
 * the opposite kind of surface — a scrollable working panel a trader reads and
 * searches, closer to a tool window than to a confirmation. Reusing the
 * confirmation dialog would have meant fighting its padding and its width in
 * every child, and would have blurred a distinction the design system makes on
 * purpose.
 *
 * What it does share is the mechanism: a native `<dialog>`, so focus trapping,
 * Escape and top-layer stacking come from the platform rather than from a
 * hand-rolled focus manager that has to be right on the first try.
 */

export interface ChartModalProps {
  open: boolean;
  onClose(): void;
  title: string;
  /** Optional line under the title — what this surface is for. */
  subtitle?: string;
  /** Sticky footer. The Settings modal's Cancel / OK live here. */
  footer?: ReactNode;
  width?: number;
  height?: number;
  children: ReactNode;
  testId?: string;
}

export function ChartModal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  width = 560,
  height = 560,
  children,
  testId,
}: ChartModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-testid={testId}
      // The native `close` event is the single source of truth: it fires exactly
      // once per dismissal, including Escape's default behaviour, so the parent
      // state can never drift out of step with what is on screen.
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        ref.current?.close();
      }}
      onClick={(event) => {
        // Backdrop click. The dialog element *is* the backdrop, so a click whose
        // target is the dialog itself landed outside the panel below.
        if (event.target === ref.current) ref.current?.close();
      }}
      style={{ width, maxHeight: height }}
      /*
       * VX1-B §21/§27 — one modal shell for the workstation.
       *
       * Raised module tone with a rim light along its top edge and the strong
       * seam as its border, over a dark translucent backdrop with a very light
       * blur — light enough that a 60fps chart keeps running behind it, which is
       * the reason a heavier veil was never on the table.
       */
      className="m-auto w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--wariba-component-workstation-radius-modal)] border border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] p-0 text-[color:var(--wariba-component-workstation-text-primary)] shadow-[var(--wariba-component-workstation-elevation-overlay),inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)] backdrop:bg-[color:var(--wariba-component-workstation-surface-overlay-backdrop)] backdrop:backdrop-blur-[2px] motion-safe:animate-[wariba-modal-enter_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-enter)] backdrop:motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-enter)]"
    >
      <div className="flex max-h-[inherit] flex-col" style={{ maxHeight: height }}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[color:var(--wariba-component-workstation-border-hairline)] px-4 py-3 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[length:var(--wariba-component-workstation-type-module-title)] font-semibold leading-tight text-[color:var(--wariba-component-workstation-text-primary)]"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-text-tertiary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Fermer"
            data-testid="chart-modal-close"
            onClick={() => ref.current?.close()}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--wariba-component-workstation-radius-control)] text-[color:var(--wariba-component-workstation-text-secondary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-hairline)] transition-colors duration-[var(--wariba-component-workstation-motion-quick)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
          >
            <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none">
              <path
                d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[color:var(--wariba-component-workstation-seam-hairline)] bg-[color:var(--wariba-component-workstation-surface-shell)] px-4 py-2.5 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
