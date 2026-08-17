'use client';

import { memo } from 'react';
import type { AccountStatusVariant } from '../../../../lib/account-display';

export interface WorkstationAccountOption {
  id: string;
  href: string;
  programLabel: string;
  programShortLabel: string;
  phaseLabel: string;
  nominalFormatted: string;
  publicId: string;
  statusLabel: string;
  statusVariant: AccountStatusVariant;
}

export interface WorkstationAccountSwitcherProps {
  accounts: readonly WorkstationAccountOption[];
  activeAccountId: string;
}

const STATUS_DOT: Record<AccountStatusVariant, string> = {
  neutral: 'bg-[color:var(--wariba-status-neutral-text)]',
  information: 'bg-[color:var(--wariba-status-information-text)]',
  success: 'bg-[color:var(--wariba-status-success-text)]',
  warning: 'bg-[color:var(--wariba-status-warning-text)]',
  danger: 'bg-[color:var(--wariba-status-danger-text)]',
};

/**
 * WariX's account switcher (W1 §12), the workstation-density counterpart to
 * the Hub's `AccountSelector` — same convention, same read model
 * (`listAccountsForUser`), same public identity.
 *
 * Two rules it inherits rather than reinvents:
 *
 * - **UX-NAV-001** — switching account is a plain `<a>`, an ordinary
 *   document navigation. `next/link` and `router.push()` both silently
 *   failed for this exact shape (a search param on the same route segment),
 *   and a full navigation is also the honest thing here: the new account
 *   replaces every number on screen and opens a new websocket session, so
 *   there is no partial state worth preserving and no way for a stale
 *   snapshot to survive the transition. Middle-click and open-in-new-tab
 *   keep working because it is a real anchor.
 * - **Public identity** — `publicId` from the account read model, never the
 *   internal UUID. The pre-W1 terminal displayed `accountId.slice(0, 8)`,
 *   an implementation detail the trader has never seen anywhere else.
 *
 * `<details>`/`<summary>` gives keyboard operation, Escape and focus
 * behaviour from the platform instead of a hand-rolled menu.
 */
export const WorkstationAccountSwitcher = memo(function WorkstationAccountSwitcher({
  accounts,
  activeAccountId,
}: WorkstationAccountSwitcherProps) {
  const active = accounts.find((account) => account.id === activeAccountId) ?? accounts[0];
  if (!active) return null;

  const summary = (
    // Never truncated: "WA…" tells the trader nothing, and which account is
    // loaded is the one fact this bar exists to state. The program name drops
    // out entirely on the narrowest widths instead, leaving the public id —
    // which is unambiguous on its own.
    //
    // Visual closure §6 — an identity *block*, not a run of same-sized words.
    // Programme on top, machine identity beneath it a step down, matching the
    // stacked label/value rhythm every metric in the bar now uses. That is what
    // stops the left edge from reading as the first four words of a sentence.
    <span className="flex min-w-0 shrink-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[active.statusVariant]}`}
      />
      <span className="flex min-w-0 items-center leading-none">
        <span className="hidden whitespace-nowrap text-[11px] font-bold leading-none tracking-[-0.01em] text-[color:var(--wariba-component-workstation-text-primary)] sm:inline">
          {active.programLabel}
        </span>
        {/* Phone widths carry the program code; the canonical public id returns
              from `sm` upward and is always in the accessible name. */}
        <span className="shrink-0 text-[11px] font-bold leading-none text-[color:var(--wariba-component-workstation-text-primary)] sm:hidden">
          {active.programShortLabel}
        </span>
      </span>
    </span>
  );

  return (
    <details
      data-testid="workstation-account-switcher"
      className="relative shrink-0 [&[open]>summary>svg]:rotate-180"
    >
      <summary
        aria-label={`Compte actif : ${active.programLabel} ${active.publicId}. Changer de compte`}
        className="flex h-8 shrink-0 cursor-pointer list-none items-center gap-1 rounded-[6px] px-1.5 transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] lg:px-2 [&::-webkit-details-marker]:hidden"
      >
        {summary}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-3 w-3 shrink-0 text-[color:var(--wariba-text-tertiary)] transition-transform"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <nav
        aria-label="Changer de compte"
        className="absolute left-0 top-full z-[var(--wariba-z-dropdown)] mt-1 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-1 rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-component-workstation-seam)] bg-[color:var(--wariba-component-workstation-surface-raised)] p-1 shadow-[var(--wariba-shadow-lg)]"
      >
        {accounts.map((account) => {
          const isActive = account.id === activeAccountId;
          return (
            <a
              key={account.id}
              href={account.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-11 flex-col justify-center gap-0.5 rounded-[var(--wariba-radius-sm)] px-2 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] ${
                isActive
                  ? 'bg-[color:var(--wariba-component-workstation-wash-selected)]'
                  : 'hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)]'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[account.statusVariant]}`}
                  />
                  <span className="text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-theme-text)]">
                    {account.programLabel}
                  </span>
                  <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    {account.phaseLabel}
                  </span>
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-secondary)]">
                  {account.nominalFormatted}
                </span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-secondary)]">
                  {account.publicId}
                </span>
                <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                  {account.statusLabel}
                </span>
              </span>
            </a>
          );
        })}
      </nav>
    </details>
  );
});
