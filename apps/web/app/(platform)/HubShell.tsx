'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { HubIdentity } from '../../lib/hub-identity';
import { titleFor } from './hub-destinations';
import { HubMobileNav } from './HubMobileNav';
import { HubSidebar } from './HubSidebar';
import { HubUserMenu } from './HubUserMenu';

/**
 * The WARIBA Trader Hub shell.
 *
 * The Hub is not WariX and must not feel like it. The workstation is dense
 * because a trader is working inside it; the Hub is where they arrive, check
 * where they stand and decide what to do next, so it is calmer, more spacious
 * and structured around navigation rather than around a chart.
 *
 * ## The width problem this exists to fix
 *
 * The first build put the dashboard in a 768px column and centred it in
 * whatever space was left. At 1440 that produced a narrow ribbon of content
 * with hundreds of pixels of empty graphite on either side, and — worse —
 * collapsing the sidebar changed nothing a trader could see. A 164px saving
 * that lands entirely in the margin is not a saving, it is an animation.
 *
 * So the column is fluid: it starts one 32px gutter after the sidebar and
 * grows until it hits a 1240px reading limit. At 1366 and 1440 it never
 * reaches that limit while the sidebar is open, which is precisely why
 * collapsing hands the width back to the dashboard instead of to the page
 * background.
 *
 * `mx-auto` waits until `2xl`. Below that, centring would re-introduce the
 * margin the collapse just recovered; above it, the content has grown past
 * what is comfortable to read and centring is the right answer.
 */

const COLLAPSE_STORAGE_KEY = 'wariba.hub.sidebar.collapsed';

export function HubShell({ children, identity }: { children: ReactNode; identity: HubIdentity }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /*
   * Restored after mount rather than during render: reading storage while
   * rendering makes the server and client disagree, and the sidebar snaps
   * width on hydration. `hydrated` suppresses the transition for that first
   * paint so a restored collapsed state does not animate open then shut.
   */
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true');
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). The
      // sidebar simply opens expanded; it is a preference, not state.
    }
    setHydrated(true);
  }, []);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // Preference is not persisted; the session still works.
      }
      return next;
    });
  };

  return (
    <div
      data-wariba-section="hub"
      data-wariba-theme="hub"
      data-theme="dark"
      className="flex min-h-dvh bg-[color:var(--warix-shell)] text-[color:var(--wariba-text-primary)]"
    >
      <HubSidebar pathname={pathname} collapsed={collapsed} hydrated={hydrated} onToggle={toggle} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-testid="hub-header"
          style={{ height: 'var(--hub-header-height)' }}
          className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-[color:var(--warix-border-subtle)] bg-[color:color-mix(in_srgb,var(--warix-panel)_88%,transparent)] px-5 backdrop-blur-[10px] md:px-[var(--hub-gutter)]"
        >
          <h1 className="truncate text-[length:var(--wariba-font-size-heading-sm)] font-semibold tracking-[-0.01em]">
            {titleFor(pathname)}
          </h1>
          {/* No notification control: the notification centre does not exist
              yet, and a bell that opens nothing — or worse, wears a fabricated
              count — is the first fake thing in a product that has none. */}
          <HubUserMenu identity={identity} />
        </header>

        {/*
         * `min-w-0` keeps a wide child scrolling inside its own container
         * instead of dragging the page sideways at 320px. The bottom padding
         * on phones is exactly the tab bar's height, so the last row of the
         * dashboard is reachable rather than hidden under it.
         */}
        <main
          data-testid="hub-main"
          className="min-w-0 flex-1 px-5 pt-6 md:px-[var(--hub-gutter)]"
          style={{ paddingBottom: 'var(--hub-content-bottom)' }}
        >
          <div
            data-testid="hub-content"
            className="w-full max-w-[var(--hub-content-max)] 2xl:mx-auto"
          >
            {children}
          </div>
        </main>
      </div>

      <HubMobileNav pathname={pathname} />
    </div>
  );
}
