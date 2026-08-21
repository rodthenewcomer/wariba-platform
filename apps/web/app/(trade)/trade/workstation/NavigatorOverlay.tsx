'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export interface NavigatorOverlayProps {
  /** The Navigator's own width preference — the overlay never invents a size. */
  width: number;
  /** Collapses the Navigator again. Invoked by Escape and by a pointer outside the panel. */
  onDismiss: () => void;
  children: ReactNode;
}

/**
 * The hybrid band's Market Navigator, floating over the chart (§22/§24).
 *
 * `WorkstationShell` places this box; the behaviour that makes it a *dismissible*
 * surface lives here, so the shell stays a component that positions slots and
 * owns no interaction. Three things a floating panel beside a live market owes
 * its user, and one it deliberately does not:
 *
 * - **Escape closes it.** Captured on the window, because the pointer may be
 *   anywhere over the chart when a trader decides they are done choosing.
 * - **A pointer outside closes it.** Listened for on `pointerdown` rather than
 *   `click` so the panel is already gone by the time a chart drag begins —
 *   otherwise the first gesture after dismissal would be swallowed closing it.
 * - **Focus goes in and comes back out.** Opening moves focus to the panel's
 *   first control (its search field); closing returns focus to whatever opened
 *   it, so a keyboard trader is never dropped at the top of the document.
 *
 * **No scrim, and no focus trap.** A scrim would dim the market the trader is
 * reading, and trapping focus would stop Tab from reaching the chart and the
 * Execution Center — both of which stay live and operable while the Navigator
 * is open. This is a desktop panel, not a modal, and it is the one place in
 * WariX where that distinction is load-bearing.
 */
export function NavigatorOverlay({ width, onDismiss, children }: NavigatorOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    // Remembered before focus moves, so dismissal can hand it back.
    openerRef.current = document.activeElement;
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Only when nothing nearer has claimed it — a drawing in progress and an
      // open popover both own Escape first (W5 §112).
      event.stopPropagation();
      onDismiss();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      onDismiss();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      // Returning focus on unmount covers every dismissal path — Escape, an
      // outside pointer, the panel's own collapse control, and a symbol being
      // chosen — without each one having to remember to do it.
      const opener = openerRef.current;
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [onDismiss]);

  return (
    <div
      ref={panelRef}
      data-testid="market-navigator-overlay"
      style={{ width: `${width}px` }}
      className="absolute inset-y-0 left-0 z-30 hidden min-h-0 min-w-0 border-r border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-module)] shadow-[var(--wariba-component-workstation-elevation-popover)] motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-popover)_ease-out] lg:flex lg:flex-col"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
