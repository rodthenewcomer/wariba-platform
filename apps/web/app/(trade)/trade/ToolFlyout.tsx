'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The rail's attached side panel — §10.
 *
 * Deliberately *not* a centred modal. A drawing flyout is chosen while looking
 * at the chart: the trader is deciding between a ray and an extended line
 * because of what the candles are doing right now, and a modal that dims the
 * plot to ask the question removes the only information the question is about.
 * So it attaches to the rail, floats over the left edge of the plot, and leaves
 * the rest of the chart untouched.
 *
 * Dismissal is the standard three: Escape, an outside pointer, and choosing
 * something. Escape is stopped from propagating because an in-progress drawing
 * also listens for it (§112) — one press must close one thing.
 */

export interface ToolFlyoutProps {
  /** Accessible name; also the heading when the panel has a single group. */
  label: string;
  /** Vertical offset from the top of the rail, so the panel opens beside its button. */
  top: number;
  onDismiss(): void;
  children: ReactNode;
  testId?: string;
  /** Wider panels for two-column families. */
  width?: number;
}

const DEFAULT_WIDTH = 288;

export function ToolFlyout({
  label,
  top,
  onDismiss,
  children,
  testId,
  width = DEFAULT_WIDTH,
}: ToolFlyoutProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const node = ref.current;
      if (!node) return;
      const target = event.target as Node;
      if (node.contains(target)) return;
      // The rail button that opened this panel is outside it. Letting the
      // outside handler fire on that button would close and immediately
      // reopen the panel, so the rail marks itself and is excluded here.
      if (target instanceof Element && target.closest('[data-tool-rail]')) return;
      onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onDismiss();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      data-testid={testId}
      style={{ top, width }}
      className="absolute left-full z-[var(--wariba-z-popover)] ml-px max-h-[min(78vh,640px)] overflow-y-auto overscroll-contain rounded-r-[10px] rounded-bl-[10px] border border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] py-1.5 shadow-[var(--wariba-component-workstation-elevation-popover)] motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-popover)_ease-out]"
    >
      {children}
    </div>
  );
}

/** A heading inside a flyout — the reference's grouped sections. */
export function FlyoutHeading({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pb-1.5 pt-3 text-[length:var(--wariba-component-workstation-type-section-label)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
      {children}
    </div>
  );
}

export function FlyoutSeparator() {
  return (
    <div
      aria-hidden="true"
      className="my-1 h-px bg-[color:var(--wariba-component-workstation-border-hairline)]"
    />
  );
}

export interface FlyoutRowProps {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  /** Right-aligned. Only ever passed where the shortcut is genuinely bound. */
  shortcut?: string;
  /** Renders the favourite star. Omitted, no star is shown at all. */
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onSelect(): void;
  testId?: string;
}

/**
 * One dense flyout row: glyph, name, optional shortcut, optional star.
 *
 * 40px tall on a pointer device — the reference's readable density, and the reason
 * these menus can show a whole family without scrolling. The mobile Tools sheet
 * uses its own component at 44px rather than reusing this one, because shrinking
 * a touch target to match a desktop menu is exactly the "mobile as shrunk
 * desktop" §26 rules out.
 */
export function FlyoutRow({
  icon,
  label,
  active = false,
  disabled = false,
  shortcut,
  favorite,
  onToggleFavorite,
  onSelect,
  testId,
}: FlyoutRowProps) {
  return (
    <div
      className={`group/row relative flex items-center ${
        active ? 'bg-[color:var(--wariba-component-workstation-wash-selected)]' : ''
      }`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-0.5 bg-[color:var(--wariba-component-workstation-interaction-selected)]"
        />
      )}
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        data-testid={testId}
        onClick={onSelect}
        className={`flex h-10 min-w-0 flex-1 items-center gap-3 px-4 text-left text-[length:var(--wariba-component-workstation-type-data-strong)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] disabled:cursor-not-allowed disabled:opacity-40 ${
          active
            ? 'text-[color:var(--wariba-component-workstation-interaction-selected-text)]'
            : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
        }`}
      >
        {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {shortcut ? (
          <span className="wariba-data shrink-0 text-[length:var(--wariba-component-workstation-type-meta)] uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            {shortcut}
          </span>
        ) : null}
      </button>
      {onToggleFavorite ? (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `Retirer ${label} des favoris` : `Ajouter ${label} aux favoris`}
          className={`mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] transition-opacity duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
            favorite
              ? 'text-[color:var(--wariba-component-workstation-trading-warning)] opacity-100'
              : 'text-[color:var(--wariba-component-workstation-text-tertiary)] opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100'
          }`}
        >
          <svg viewBox="0 0 24 24" width={13} height={13} aria-hidden="true">
            <path
              d="M12 3.6l2.6 5.6 6 0.8-4.4 4.3 1.1 6.1L12 17.5l-5.3 2.9 1.1-6.1L3.4 10l6-0.8Z"
              fill={favorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
