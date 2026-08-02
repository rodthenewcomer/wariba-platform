import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import type { LinkComponentType } from '../lib/link';

export interface ControlNavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export interface ControlSidebarProps {
  LinkComponent: LinkComponentType;
  currentPath: string;
  items: ControlNavItem[];
  staffLabel: string;
}

/**
 * UX Architecture §35.1-35.2 — dense operational sidebar. Sections shown are
 * whatever the caller passes in `items` (already filtered by role/permission
 * upstream) — this component makes no authorization decisions.
 */
export function ControlSidebar({
  LinkComponent: Link,
  currentPath,
  items,
  staffLabel,
}: ControlSidebarProps) {
  return (
    <nav
      aria-label="Control"
      className="flex w-[var(--wariba-component-control-sidebar-width)] shrink-0 flex-col gap-0.5 border-r border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-surface)] p-3"
    >
      <div className="mb-2 px-2 py-2">
        <p className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
          WARIBA Control
        </p>
        <p className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          {staffLabel}
        </p>
      </div>
      {items.map((item) => {
        const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex h-[var(--wariba-component-control-row-height-compact)] items-center gap-2.5 rounded-[var(--wariba-radius-sm)] px-2.5',
              'text-[length:var(--wariba-font-size-body-sm)] font-medium transition-colors',
              active
                ? 'bg-[color:var(--wariba-background-selected)] text-[color:var(--wariba-text-link)]'
                : 'text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--wariba-background-subtle)] hover:text-[color:var(--wariba-text-primary)]',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
