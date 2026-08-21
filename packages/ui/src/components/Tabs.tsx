'use client';

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../lib/cx';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Tabs>`);
  return ctx;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/** Design System §24.7 — max 5 visible, overflow handled by the caller's layout, active state via border + color, never color alone. */
export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/**
 * `default` is the product tab strip. `workstation` is WariX's dense variant:
 * the strip sits on the raised module surface, the active tab lifts onto a wash
 * with a cobalt rule on top rather than underneath, and everything runs a step
 * smaller in small caps — which is what stops the activity dock from reading as
 * an administrative table header (visual closure §14).
 */
export type TabsVariant = 'default' | 'workstation';

export function TabList({
  children,
  variant = 'default',
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  variant?: TabsVariant;
  'aria-label': string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const { value: activeValue } = useTabsContext('TabList');

  /*
   * VX1-B §16 — the workstation's active tab *moves*.
   *
   * One indicator slides between destinations instead of two tabs repainting,
   * which is the same grammar the interval track uses — a product where every
   * selection behaves the same way is a product that feels choreographed rather
   * than assembled. Measured from the selected tab, because tab widths vary with
   * their labels and counters; keyed off the active value so it re-measures when
   * a counter appears and changes a tab's width.
   */
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    if (variant !== 'workstation') return;
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    setIndicator((current) => {
      if (!selected) return current === null ? current : null;
      const next = { left: selected.offsetLeft, width: selected.offsetWidth };
      if (current && current.left === next.left && current.width === next.width) return current;
      return next;
    });
  }, [activeValue, variant, children]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (currentIndex === -1) return;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx(
        'flex',
        variant === 'workstation'
          ? 'relative gap-0.5'
          : 'gap-1 border-b border-[color:var(--wariba-border-subtle)]',
      )}
    >
      {variant === 'workstation' && indicator ? (
        <span
          aria-hidden="true"
          data-testid="tablist-indicator"
          className={cx(
            'pointer-events-none absolute bottom-0 h-[2px] rounded-t-full',
            'bg-[color:var(--wariba-component-workstation-interaction-selected)]',
            'shadow-[0_0_10px_0_var(--wariba-component-workstation-focus-glow)]',
            'transition-[left,width] duration-[var(--wariba-component-workstation-motion-quick)]',
            'ease-[var(--wariba-component-workstation-ease-move)] motion-reduce:transition-none',
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
      {children}
    </div>
  );
}

export function Tab({
  value,
  variant = 'default',
  children,
}: {
  value: string;
  variant?: TabsVariant;
  children: ReactNode;
}) {
  const { value: active, setValue, baseId } = useTabsContext('Tab');
  const selected = active === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-controls={`${baseId}-panel-${value}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cx(
        'font-semibold transition-[background-color,color,box-shadow]',
        variant === 'workstation'
          ? cx(
              'relative flex min-h-11 items-center gap-1.5 rounded-t-[7px] px-2 lg:min-h-9 lg:px-3',
              'text-[length:var(--wariba-component-workstation-type-label)] uppercase tracking-[var(--wariba-component-workstation-tracking-label)]',
              'duration-[var(--wariba-component-workstation-motion-quick)]',
              selected
                ? cx(
                    'bg-[color:var(--wariba-component-workstation-wash-selected)]',
                    'text-[color:var(--wariba-component-workstation-text-primary)]',
                  )
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]',
            )
          : cx(
              'min-h-11 border-b-2 px-[var(--wariba-space-3)] py-[var(--wariba-space-2)] lg:min-h-0',
              'text-[length:var(--wariba-font-size-label-md)]',
              selected
                ? 'border-[color:var(--wariba-action-primary)] text-[color:var(--wariba-text-primary)]'
                : 'border-transparent text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-text-primary)]',
            ),
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, baseId } = useTabsContext('TabPanel');
  if (active !== value) return null;
  return (
    <div
      id={`${baseId}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
