'use client';

import { PublicFooter, PublicHeader } from '@wariba/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The marketing shell, extracted from `(public)/layout.tsx`.
 *
 * It lives outside the route group because one route needs it conditionally.
 * The Constitution lists `/support` in both the Public and the Trader Hub
 * canonical route sets (§6), and Next.js cannot resolve two pages to the same
 * path — so `/support` sits outside both groups and its layout chooses the
 * shell from the session. A visitor gets this; a signed-in trader gets the
 * Hub. See DEC-3.2-01 in the Phase 3.2 implementation note.
 *
 * `(public)/layout.tsx` renders this too, so the two can never drift.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      data-wariba-section="public"
      data-wariba-theme="marketing"
      data-theme="dark"
      className="flex min-h-dvh flex-col bg-[color:var(--wariba-background-canvas)]"
    >
      <PublicHeader LinkComponent={Link} currentPath={pathname} />
      <main className="flex-1">{children}</main>
      <PublicFooter LinkComponent={Link} />
    </div>
  );
}
