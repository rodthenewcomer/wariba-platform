import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import type { LinkComponentType } from '../lib/link';

export interface MobileNavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export interface MobileBottomNavProps {
  LinkComponent: LinkComponentType;
  currentPath: string;
  items: MobileNavItem[];
}

/** UX Architecture §12.2 — Hub/Trade/Comptes/Payouts/Plus, ≥44px touch targets, safe-area aware. */
export function MobileBottomNav({ LinkComponent: Link, currentPath, items }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-[var(--wariba-z-sticky)] flex h-[var(--wariba-size-bottom-navigation)] border-t border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => {
        const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex min-w-[var(--wariba-size-touch-target-minimum)] flex-1 flex-col items-center justify-center gap-0.5',
              'text-[length:var(--wariba-font-size-label-sm)]',
              active
                ? 'text-[color:var(--wariba-text-link)]'
                : 'text-[color:var(--wariba-text-secondary)]',
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
