import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import type { LinkComponentType } from '../lib/link';

export interface PlatformNavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export interface PlatformSidebarProps {
  LinkComponent: LinkComponentType;
  currentPath: string;
  items: PlatformNavItem[];
}

/** UX Architecture §12.1 — desktop sidebar, 5-entry nav max (§55.8). Hidden below md; MobileBottomNav takes over. */
export function PlatformSidebar({ LinkComponent: Link, currentPath, items }: PlatformSidebarProps) {
  return (
    <nav
      aria-label="Principal"
      className="hidden w-[var(--wariba-size-sidebar-expanded)] shrink-0 flex-col gap-1 border-r border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] p-[var(--wariba-space-4)] md:flex"
    >
      {items.map((item) => {
        const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex items-center gap-3 rounded-[var(--wariba-radius-md)] px-3 py-2.5',
              'text-[length:var(--wariba-font-size-body-md)] font-medium transition-colors',
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
