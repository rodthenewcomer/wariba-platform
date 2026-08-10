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
 *
 * Responsive posture: a fixed, non-shrinking column from `md` up, and a
 * full-width strip of horizontally scrollable links below it. Control is
 * desktop-first and Prompt 09 does not change that, but a 240px sidebar held
 * against a 412px phone leaves ~170px of content and pushes the document
 * sideways — which moves the headings and the navigation itself off-screen.
 * The strip keeps every authorized area reachable while giving the content
 * the whole viewport.
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
      className={cx(
        'flex shrink-0 gap-0.5 bg-[color:var(--wariba-background-surface)] p-3',
        // Phone: a horizontal strip that scrolls within itself.
        'w-full flex-row overflow-x-auto border-b',
        // Desktop: the dense column this console is designed around.
        'md:w-[var(--wariba-component-control-sidebar-width)] md:flex-col md:overflow-x-visible md:border-b-0 md:border-r',
        'border-[color:var(--wariba-border-default)]',
      )}
    >
      <div className="mb-2 hidden px-2 py-2 md:block">
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
              // Labels stay on one line in the strip so the row height holds.
              'shrink-0 whitespace-nowrap md:shrink',
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
