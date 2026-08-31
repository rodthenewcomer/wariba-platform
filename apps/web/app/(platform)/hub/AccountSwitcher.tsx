'use client';

import { useEffect, useRef, useState } from 'react';
import type { AccountSummaryDTO, LifecycleTone } from '@wariba/application/presentation';
import { HubIcon } from '../../../components/hub/icons';
import { StatusPill } from '../../../components/hub/StatusPill';
import { accountSizeShortLabel, formatNominal, programLabel } from '../../../lib/account-display';

/**
 * Switching accounts, in one control instead of a list.
 *
 * ## Why this replaced the stacked list
 *
 * The previous switcher rendered every account as a full-width row above the
 * dashboard. With one account it rendered nothing; with three it pushed the
 * hero below the fold, which is the opposite of what a switcher is for. This
 * shows the account you are on and opens the others on demand — the pattern
 * every reference product converged on, and the only one that scales past two.
 *
 * ## Why the links are plain anchors
 *
 * UX-NAV-001, unchanged. Switching account changes only a search parameter on
 * the same route segment, and Next's client router proved unreliable in that
 * shape — the server rendered the right account and the client silently kept
 * the old URL. A document navigation also matches the semantics: switching
 * replaces the page's entire data context, so there is no partial state worth
 * preserving and no in-flight payload to race.
 *
 * It renders even for a single account, because it is also the place the
 * account's identity and state are stated.
 *
 * ## Why the lifecycle arrives as a prop
 *
 * `deriveAccountLifecycle` lives in `@wariba/application`, whose barrel also
 * re-exports the read models — and those import `pg`. Calling it from a client
 * component drags a Postgres driver into the browser bundle, which is exactly
 * what the webpack `Can't resolve 'fs'` failure was reporting. The derivation
 * belongs on the server anyway: it is a projection of authoritative state, and
 * a client able to compute it is a client able to compute it differently.
 */
export interface SwitcherAccount {
  account: AccountSummaryDTO;
  /** Derived server-side. See the note above. */
  lifecycleLabel: string;
  lifecycleTone: LifecycleTone;
}

export function AccountSwitcher({
  accounts,
  activeAccountId,
  basePath,
}: {
  accounts: readonly SwitcherAccount[];
  activeAccountId: string;
  basePath: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const active = accounts.find((entry) => entry.account.id === activeAccountId) ?? accounts[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!active) return null;
  const multiple = accounts.length > 1;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={multiple ? open : undefined}
        aria-haspopup={multiple ? 'menu' : undefined}
        disabled={!multiple}
        data-testid="account-switcher"
        onClick={() => multiple && setOpen((current) => !current)}
        className={[
          'flex min-h-[48px] w-full items-center gap-3 rounded-[10px] border px-3.5 sm:w-auto sm:min-w-[22rem]',
          'border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface)]',
          'transition-colors duration-[var(--wariba-component-workstation-motion-interaction)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none',
          multiple
            ? 'hover:border-[color:var(--warix-border-strong)] hover:bg-[color:var(--warix-surface-hover)]'
            : 'cursor-default',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className="wariba-data flex h-8 w-11 shrink-0 items-center justify-center rounded-[7px] bg-[color:var(--warix-surface-raised)] text-[length:var(--wariba-font-size-label-sm)] font-bold text-[color:var(--wariba-text-secondary)]"
        >
          {accountSizeShortLabel(active.account.nominalBalance)}
        </span>

        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="flex w-full items-center gap-2">
            <span className="truncate text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {programLabel(active.account)}
            </span>
            <StatusPill tone={active.lifecycleTone} size="sm">
              {active.lifecycleLabel}
            </StatusPill>
          </span>
          <span className="wariba-data truncate text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            {formatNominal(active.account.nominalBalance, active.account.nominalCurrency)}
          </span>
        </span>

        {multiple ? (
          <span
            aria-hidden="true"
            className={`shrink-0 text-[color:var(--wariba-text-tertiary)] transition-transform duration-[var(--wariba-component-workstation-motion-interaction)] motion-reduce:transition-none ${
              open ? 'rotate-90' : ''
            }`}
          >
            <HubIcon role="chevron" size={18} />
          </span>
        ) : null}
      </button>

      {open && multiple ? (
        <div
          role="menu"
          data-testid="account-switcher-menu"
          className="wariba-reveal absolute left-0 top-[calc(100%+8px)] z-40 w-full min-w-[22rem] overflow-hidden rounded-[12px] border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface)] shadow-[0_20px_48px_-16px_rgba(0,0,0,0.75)] sm:w-auto"
        >
          {accounts.map((entry) => {
            const account = entry.account;
            const selected = account.id === activeAccountId;
            return (
              <a
                key={account.id}
                href={`${basePath}?account=${account.id}`}
                role="menuitem"
                aria-current={selected ? 'page' : undefined}
                className={`flex min-h-[56px] items-center gap-3 px-3.5 py-2.5 transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] motion-reduce:transition-none ${
                  selected ? 'bg-[color:var(--warix-surface-selected)]' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="wariba-data flex h-8 w-11 shrink-0 items-center justify-center rounded-[7px] bg-[color:var(--warix-surface-raised)] text-[length:var(--wariba-font-size-label-sm)] font-bold text-[color:var(--wariba-text-secondary)]"
                >
                  {accountSizeShortLabel(account.nominalBalance)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                    {programLabel(account)}
                  </span>
                  {/* The public reference lives here, where it does its one
                      real job: telling two similar accounts apart. */}
                  <span className="wariba-data truncate text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    {account.publicId}
                  </span>
                </span>
                <StatusPill tone={entry.lifecycleTone} size="sm">
                  {entry.lifecycleLabel}
                </StatusPill>
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
