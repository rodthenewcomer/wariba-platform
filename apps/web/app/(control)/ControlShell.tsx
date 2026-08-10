'use client';

import { ControlSidebar, OverviewIcon, PayoutsIcon, ShieldIcon, UsersIcon } from '@wariba/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface ControlNavItem {
  href: string;
  label: string;
}

/**
 * Icons are chosen here rather than travelling from the server: a React
 * element is not serializable across that boundary, and the icon carries no
 * authorization meaning — which areas exist for this operator was already
 * decided server-side.
 */
const AREA_ICON: Record<string, ReactNode> = {
  '/control': <OverviewIcon size="sm" />,
  '/control/users': <UsersIcon size="sm" />,
  '/control/accounts': <UsersIcon size="sm" />,
  '/control/trading': <OverviewIcon size="sm" />,
  '/control/integrity': <ShieldIcon size="sm" />,
  '/control/payouts': <PayoutsIcon size="sm" />,
  '/control/market-operations': <OverviewIcon size="sm" />,
  '/control/incidents': <ShieldIcon size="sm" />,
  '/control/treasury': <OverviewIcon size="sm" />,
  '/control/actuarial': <OverviewIcon size="sm" />,
  '/control/policies': <ShieldIcon size="sm" />,
  '/control/commercial': <OverviewIcon size="sm" />,
  '/control/audit': <ShieldIcon size="sm" />,
  '/control/team': <UsersIcon size="sm" />,
};

/** UX Architecture §35 — dense, clear, no super-admin catch-all. Never reachable from trader nav. */
export function ControlShell({
  staffLabel,
  areas,
  children,
}: {
  staffLabel: string;
  areas: readonly ControlNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div
      data-wariba-section="control"
      className="flex min-h-dvh flex-col bg-[color:var(--wariba-background-canvas)] md:flex-row"
    >
      <ControlSidebar
        LinkComponent={Link}
        currentPath={pathname}
        items={areas.map((area) => ({
          href: area.href,
          label: area.label,
          icon: AREA_ICON[area.href] ?? <OverviewIcon size="sm" />,
        }))}
        staffLabel={staffLabel}
      />
      {/* min-w-0: a flex child defaults to min-width:auto, so without this
          the main column refuses to shrink below its content's intrinsic
          width and pushes the whole document sideways instead. */}
      <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
