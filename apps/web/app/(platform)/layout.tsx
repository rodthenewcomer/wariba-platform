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
      {/*
       * `min-w-0` is load-bearing, not cosmetic: a flex item defaults to
       * `min-width: auto`, so <main> refuses to shrink below the intrinsic
       * width of its widest descendant. At the 320px minimum supported
       * width (UX Architecture §12.2) that pushed <main> to 324px and gave
       * the whole document a horizontal scrollbar on first paint. With
       * `min-w-0` the column tracks the viewport and any genuinely wide
       * child (table, chart) scrolls inside its own container instead of
       * dragging the page sideways.
       */}
      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-6">{children}</main>
      <MobileBottomNav LinkComponent={Link} currentPath={pathname} items={[...MOBILE_ITEMS]} />
    </div>
  );
}
