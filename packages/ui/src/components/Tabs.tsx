'use client';

import {
  createContext,
  useContext,
  useId,
  useRef,
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
  wrap = false,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  variant?: TabsVariant;
  /** Lets an overflow destination fall to a second line inside the same tablist. */
  wrap?: boolean;
  'aria-label': string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

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
        wrap ? 'flex-wrap' : '',
        variant === 'workstation'
          ? 'gap-0.5'
          : 'gap-1 border-b border-[color:var(--wariba-border-subtle)]',
      )}
    >
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
              selected
                ? cx(
                    'bg-[color:var(--wariba-component-workstation-wash-selected)] text-[color:var(--wariba-component-workstation-text-primary)]',
                    'after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:rounded-b-full after:bg-[color:var(--wariba-component-workstation-interaction-selected)]',
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
