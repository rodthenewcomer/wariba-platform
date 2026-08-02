'use client';

import {
  AccountsIcon,
  HubIcon,
  MobileBottomNav,
  MoreIcon,
  PayoutsIcon,
  PlatformSidebar,
  TradeIcon,
} from '@wariba/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const ITEMS = [
  { href: '/hub', label: 'Hub', icon: <HubIcon size="sm" /> },
  { href: '/trade', label: 'Trade', icon: <TradeIcon size="sm" /> },
  { href: '/comptes', label: 'Comptes', icon: <AccountsIcon size="sm" /> },
  { href: '/payouts', label: 'Payouts', icon: <PayoutsIcon size="sm" /> },
] as const;

const MOBILE_ITEMS = [
  ...ITEMS,
  { href: '/plus', label: 'Plus', icon: <MoreIcon size="sm" /> },
] as const;

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      data-wariba-section="platform"
      className="flex min-h-dvh bg-[color:var(--wariba-background-canvas)]"
    >
      <PlatformSidebar LinkComponent={Link} currentPath={pathname} items={[...ITEMS]} />
      <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-6">{children}</main>
      <MobileBottomNav LinkComponent={Link} currentPath={pathname} items={[...MOBILE_ITEMS]} />
    </div>
  );
}
