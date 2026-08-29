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
  /*
   * Dark, and stated rather than inherited.
   *
   * This shell used to force `data-theme="light"` and paint bone-50 — the
   * direction 3.4.5R replaced. Pinning `dark` rather than letting the viewer's
   * system preference decide is deliberate: WARIBA's public surface is a dark
   * brand the way ForTraders is a lime one, and a cream-mode version of it
   * would be a second, unowned design to keep in sync.
   */
  return (
    <div
      data-wariba-section="public"
      data-wariba-theme="marketing"
      data-theme="dark"
      className="flex min-h-dvh flex-col bg-[color:var(--wariba-color-ink-975)]"
    >
      {/*
       * The skip link — 3.4.5A §32.
       *
       * The header carries six navigation items plus a mega-menu trigger, so
       * a keyboard reader arriving on any public page had eight stops before
       * reaching the first word of content, on every route. It is invisible
       * until focused and then it is a real WARIBA control, not a bare
       * browser outline.
       */}
      <a href="#contenu" className="wariba-skip-link">
        Aller au contenu
      </a>
      <PublicHeader LinkComponent={Link} currentPath={pathname} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <PublicFooter LinkComponent={Link} />
    </div>
  );
}
