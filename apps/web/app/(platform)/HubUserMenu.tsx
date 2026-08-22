'use client';

import { useEffect, useRef, useState } from 'react';
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
function Avatar({ identity }: { identity: HubIdentity }) {
  if (identity.avatarUrl) {
    return (
      // Plain <img>: the host is whatever identity provider the account came
      // from, so it cannot be enumerated into next.config's remote patterns
      // ahead of time. Sized and cropped here rather than trusting the source,
      // and `no-referrer` so the provider is not told which page it loaded on.
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

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="20"
    >
      <circle cx="12" cy="9" r="3.4" />
      <path d="M5.5 19.2a6.9 6.9 0 0 1 13 0" />
    </svg>
  );
}

/**
 * The account menu.
 *
 * Compact on purpose. A 208px-wide popover holding one item made signing out
 * look like the beginning of a menu somebody forgot to finish; this states who
 * is signed in, then offers the single action that genuinely works.
 *
 * Profil, Paramètres and Notifications are the canonical menu and they are
 * deliberately absent until their routes exist. A menu entry that 404s is
 * worse than a short menu — it is a broken promise in the surface a trader
 * opens when they want to leave.
 */
export function HubUserMenu({ identity }: { identity: HubIdentity }) {
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
        data-testid="hub-user-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 items-center gap-2.5 rounded-full bg-[color:var(--warix-surface)] py-0 pl-0 pr-0 ring-1 ring-inset ring-[color:var(--warix-border-subtle)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:ring-[color:var(--warix-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none sm:pr-3"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--warix-surface-raised)] text-[color:var(--wariba-text-primary)]">
          <Avatar identity={identity} />
        </span>
        {/* The name is shown when there is room for it — an avatar alone makes
            people click to find out whose account they are in. */}
        <span className="hidden max-w-[10rem] truncate text-[length:var(--wariba-font-size-label-md)] font-medium text-[color:var(--wariba-text-secondary)] sm:inline">
          {name}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          data-testid="hub-user-menu"
          // One step above the header it drops out of, so it reads as a
          // surface in front rather than a hole cut in the chrome.
          className="wariba-reveal absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-[10px] border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface)] shadow-[0_18px_44px_-14px_rgba(0,0,0,0.7)]"
        >
          <div className="border-b border-[color:var(--warix-border-subtle)] px-3 py-2.5">
            <p className="truncate text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {name}
            </p>
            <p className="mt-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {productCopy.hub.title}
            </p>
          </div>

          <div className="p-1.5">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                data-testid="hub-sign-out"
                className="flex h-10 w-full items-center gap-2.5 rounded-[var(--warix-radius-well)] px-2.5 text-left text-[length:var(--wariba-font-size-label-md)] font-medium text-[color:var(--wariba-text-primary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
              >
                <svg
                  aria-hidden="true"
                  className="shrink-0 text-[color:var(--wariba-text-secondary)]"
                  fill="none"
                  height="17"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  viewBox="0 0 24 24"
                  width="17"
                >
                  <path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" />
                  <path d="M10 15.5 13.5 12 10 8.5" />
                  <path d="M13.5 12h-9" />
                </svg>
                {copy.signOut}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
