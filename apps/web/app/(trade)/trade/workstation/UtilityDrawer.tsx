'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Tooltip, WariXCloseIcon } from '@wariba/ui';

export interface UtilityDrawerProps {
  title: string;
  eyebrow?: string;
  width: number;
  onClose(): void;
  children: ReactNode;
  testId: string;
}

/** Shared shell only; every drawer body remains its canonical product surface. */
export function UtilityDrawer({
  title,
  eyebrow,
  width,
  onClose,
  children,
  testId,
}: UtilityDrawerProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <section
      aria-label={title}
      data-testid={testId}
      style={{ width }}
      className="flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-l border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-module)] shadow-[var(--wariba-component-workstation-elevation-popover)] motion-safe:animate-[wariba-drawer-enter_var(--wariba-component-workstation-motion-panel)_var(--wariba-component-workstation-ease-enter)]"
    >
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-2.5 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="truncate text-[length:var(--wariba-component-workstation-type-module-title)] font-bold leading-tight text-[color:var(--wariba-component-workstation-text-primary)]">
            {title}
          </h2>
        </div>
        {/*
         * Final closure §9 — the way out has to be unmistakable, and it has to
         * be the only affordance drawn.
         *
         * The header used to carry a `PanelRightClose` glyph with no chrome
         * around it: a trader looking for "how do I close Trade" read it as a
         * decorative arrow rather than a control. It is now a cross in a real
         * icon button — hairline ring at rest, filled on hover — with a tooltip
         * and an accessible name that both say which surface it dismisses.
         *
         * No pin sits beside it. Pinning a drawer open is not implemented in
         * WX1, and drawing an inert pin would be exactly the fake affordance the
         * workstation rules forbid; the control returns when the behaviour does.
         */}
        <Tooltip label={`Fermer ${title}`} side="bottom">
          <button
            type="button"
            aria-label={`Fermer ${title}`}
            data-testid={`${testId}-close`}
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[color:var(--wariba-component-workstation-text-secondary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
          >
            <WariXCloseIcon size="toolbar" />
          </button>
        </Tooltip>
      </header>
      {/* VX1 §34 — surface first, content a beat behind it: the drawer reads as
          a panel arriving, not as a block of text appearing. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-enter)_60ms_backwards]">
        {children}
      </div>
    </section>
  );
}

export interface UtilityDrawerOverlayProps {
  onDismiss(): void;
  children: ReactNode;
}

/** Hybrid presentation: same drawer body, floated inward without shrinking the chart. */
export function UtilityDrawerOverlay({ onDismiss, children }: UtilityDrawerOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onDismiss();
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      data-testid="utility-drawer-overlay"
      className="absolute inset-y-0 right-0 z-30 hidden min-h-0 shadow-[var(--wariba-component-workstation-elevation-overlay)] lg:flex"
    >
      {children}
    </div>
  );
}
