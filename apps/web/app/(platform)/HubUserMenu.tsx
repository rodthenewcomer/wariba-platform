'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { HubIcon } from '../../components/hub/icons';
import { productCopy } from '../../lib/product-copy';
import type { HubIdentity } from '../../lib/hub-identity';
import { signOutAction } from '../(auth)/actions';

const copy = productCopy.hub.user;

/**
 * The avatar, drawn down the identity ladder in `lib/hub-identity.ts`.
 *
 * The silhouette is the honest bottom rung: it says "we do not have a picture
 * of you" instead of inventing something that looks like we do.
 */
function Avatar({ identity, size }: { identity: HubIdentity; size: number }) {
  if (identity.avatarUrl) {
    return (
      // Plain <img>: the host is whatever identity provider the account came
      // from, so it cannot be enumerated into next.config's remote patterns
      // ahead of time. `no-referrer` so the provider is not told which page it
      // loaded on.
      <img
        alt=""
        aria-hidden="true"
        src={identity.avatarUrl}
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (identity.initials) {
    return (
      <span
        aria-hidden="true"
        className="text-[length:var(--wariba-font-size-label-md)] font-bold leading-none"
      >
        {identity.initials}
      </span>
    );
  }

  return <HubIcon role="profile" size={size} />;
}

/**
 * The account menu, at the foot of the sidebar.
 *
 * ## Where it lives
 *
 * At the bottom of the navigation rather than in the header, which is where
 * every product in this category puts it and where a trader reaches for it
 * without thinking. The header is now carrying contextual actions per page,
 * and identity competing with "Ouvrir WariX" for the same corner made both
 * weaker.
 *
 * ## What is in it
 *
 * Profil, Paramètres and Se déconnecter. Paramètres and Profil now have real
 * routes, so they are listed; Notifications still does not exist and is still
 * absent. A menu entry that 404s is worse than a short menu — it is a broken
 * promise in the surface a trader opens when they want to leave.
 *
 * The menu opens upward, because it is anchored to the bottom of the viewport.
 */
export function HubUserMenu({
  identity,
  compact = false,
  placement = 'up',
  testId = 'hub-user-menu-trigger',
}: {
  identity: HubIdentity;
  compact?: boolean;
  placement?: 'up' | 'down';
  /**
   * The sidebar and the mobile header both mount one of these, at different
   * breakpoints. They need distinct ids — two elements answering to the same
   * test id is a strict-mode violation the moment anything looks one up.
   */
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // Focus returns to the control that opened the menu, not to the page.
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const name = identity.displayName ?? copy.unnamed;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.menu}
        data-testid={testId}
        onClick={() => setOpen((current) => !current)}
        className={[
          'flex items-center rounded-[10px] transition-colors',
          'duration-[var(--wariba-component-workstation-motion-interaction)]',
          'hover:bg-[color:var(--warix-surface-hover)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none',
          compact ? 'h-11 w-11 justify-center' : 'min-h-[44px] w-full gap-2.5 px-2',
        ].join(' ')}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--warix-surface-raised)] text-[color:var(--wariba-text-primary)] ring-1 ring-inset ring-[color:var(--warix-border-subtle)]">
          <Avatar identity={identity} size={compact ? 20 : 22} />
        </span>
        {compact ? null : (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-[length:var(--wariba-font-size-label-md)] font-medium text-[color:var(--wariba-text-secondary)]">
              {name}
            </span>
            <span aria-hidden="true" className="shrink-0 text-[color:var(--wariba-text-tertiary)]">
              <HubIcon role="chevron" size={16} />
            </span>
          </>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          data-testid="hub-user-menu"
          className={[
            'wariba-reveal absolute z-50 w-60 overflow-hidden rounded-[12px]',
            'border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface)]',
            'shadow-[0_20px_48px_-16px_rgba(0,0,0,0.75)]',
            placement === 'up' ? 'bottom-[calc(100%+8px)] left-0' : 'right-0 top-[calc(100%+8px)]',
          ].join(' ')}
        >
          <div className="border-b border-[color:var(--warix-border-subtle)] px-3 py-2.5">
            <p className="truncate text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {name}
            </p>
            <p className="mt-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {productCopy.hub.title}
            </p>
          </div>

          <div className="flex flex-col p-1.5">
            {[
              { href: '/parametres', label: copy.profile, icon: 'profile' as const },
              { href: '/parametres', label: copy.settings, icon: 'settings' as const },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-[40px] items-center gap-2.5 rounded-[8px] px-2.5 text-[length:var(--wariba-font-size-label-md)] font-medium text-[color:var(--wariba-text-primary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
              >
                <span className="text-[color:var(--wariba-text-secondary)]">
                  <HubIcon role={item.icon} size={18} />
                </span>
                {item.label}
              </Link>
            ))}

            <div aria-hidden="true" className="my-1.5 h-px bg-[color:var(--warix-border-subtle)]" />

            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                data-testid="hub-sign-out"
                className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[length:var(--wariba-font-size-label-md)] font-medium text-[color:var(--wariba-text-primary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
              >
                <span className="text-[color:var(--wariba-text-secondary)]">
                  <HubIcon role="signOut" size={18} />
                </span>
                {copy.signOut}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
