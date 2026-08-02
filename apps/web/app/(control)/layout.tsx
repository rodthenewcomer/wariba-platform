'use client';

import { ControlSidebar, OverviewIcon, PayoutsIcon, ShieldIcon, UsersIcon } from '@wariba/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const ITEMS = [
  { href: '/control', label: 'Overview', icon: <OverviewIcon size="sm" /> },
  { href: '/control/users', label: 'Users', icon: <UsersIcon size="sm" /> },
  { href: '/control/payouts', label: 'Payouts', icon: <PayoutsIcon size="sm" /> },
  { href: '/control/integrity', label: 'Integrity', icon: <ShieldIcon size="sm" /> },
] as const;

/** UX Architecture §35 — dense, clear, no super-admin catch-all. Never reachable from trader nav. */
export default function ControlLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      data-wariba-section="control"
      className="flex min-h-dvh bg-[color:var(--wariba-background-canvas)]"
    >
      <ControlSidebar
        LinkComponent={Link}
        currentPath={pathname}
        items={[...ITEMS]}
        staffLabel="DEMO — staff@wariba.app"
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
