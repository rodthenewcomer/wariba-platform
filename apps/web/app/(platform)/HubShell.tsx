'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { HubIdentity } from '../../lib/hub-identity';
import { EASE_ENTER, MOTION } from '../../components/motion/primitives';
import { titleFor } from './hub-destinations';
import { HUB_HEADER_SLOT_ID } from './HubHeaderSlot';
import { HubMobileNav } from './HubMobileNav';
import { HubSidebar } from './HubSidebar';
import { HubUserMenu } from './HubUserMenu';

/**
 * The WARIBA Trader Hub shell.
 *
 * The Hub is not WariX and must not feel like it. The workstation is dense
 * because a trader is working inside it; the Hub is where they arrive, check
 * where they stand and decide what to do next.
 *
 * ## Width
 *
 * The column is fluid: it starts one 32px gutter after the sidebar and grows
 * until it hits a 1240px reading limit. At 1366 and 1440 it never reaches that
 * limit while the sidebar is open, which is why collapsing hands the width
 * back to the dashboard instead of to the page background. `mx-auto` waits
 * until `2xl`, where the content has outgrown a comfortable reading measure.
 *
 * ## Header
 *
 * Title on the left, page-owned controls on the right through a portal slot.
 * The identity block lives at the foot of the sidebar on desktop, and only
 * appears in the header below `md` where there is no sidebar to hold it —
 * one identity affordance at every width, never two competing for a corner.
 */

const COLLAPSE_STORAGE_KEY = 'wariba.hub.sidebar.collapsed';

export function HubShell({ children, identity }: { children: ReactNode; identity: HubIdentity }) {
  const pathname = usePathname();
  const isTransactionRoute = pathname.startsWith('/checkout') || pathname.startsWith('/bienvenue');
  const reduced = useReducedMotion();
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

  if (isTransactionRoute) {
    return (
      <div
        data-wariba-section="transaction"
        data-wariba-theme="commerce"
        data-theme="light"
        className="min-h-dvh bg-[color:var(--wariba-color-bone-50)] text-[color:var(--wariba-color-ink-950)]"
      >
        {children}
      </div>
    );
  }

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
      <HubSidebar
        pathname={pathname}
        collapsed={collapsed}
        hydrated={hydrated}
        onToggle={toggle}
        identity={identity}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-testid="hub-header"
          style={{ height: 'var(--hub-header-height)' }}
          className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-[color:var(--warix-border-subtle)] bg-[color:color-mix(in_srgb,var(--warix-panel)_86%,transparent)] px-5 backdrop-blur-[12px] md:px-[var(--hub-gutter)]"
        >
          <h1 className="shrink-0 truncate text-[length:var(--wariba-font-size-heading-sm)] font-semibold tracking-[-0.01em]">
            {titleFor(pathname)}
          </h1>

          <div className="flex min-w-0 items-center gap-3">
            {/* Page-owned controls land here. See HubHeaderSlot. */}
            <div id={HUB_HEADER_SLOT_ID} className="flex min-w-0 items-center gap-2" />
            {/* Below md there is no sidebar, so identity needs a home. */}
            <div className="md:hidden">
              <HubUserMenu
                identity={identity}
                compact
                placement="down"
                testId="hub-user-menu-trigger-mobile"
              />
            </div>
          </div>
        </header>

        <main
          data-testid="hub-main"
          className="min-w-0 flex-1 px-5 pt-6 md:px-[var(--hub-gutter)]"
          style={{ paddingBottom: 'var(--hub-content-bottom)' }}
        >
          <div
            data-testid="hub-content"
            className="w-full max-w-[var(--hub-content-max)] 2xl:mx-auto"
          >
            {/*
             * Page transition: a short fade and 6px of travel, keyed on the
             * route. Long enough to read as a change of place, short enough
             * that a trader navigating quickly never waits on it. Removed
             * entirely under reduced motion rather than shortened.
             */}
            {reduced ? (
              children
            ) : (
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: MOTION.panel, ease: EASE_ENTER }}
              >
                {children}
              </motion.div>
            )}
          </div>
        </main>
      </div>

      <HubMobileNav pathname={pathname} />
    </div>
  );
}
