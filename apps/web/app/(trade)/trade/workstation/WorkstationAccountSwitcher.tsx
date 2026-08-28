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
  /** `10K` — the size chip on the pill (VX1 §7); rendered from the same nominal. */
  sizeShortLabel: string;
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

  /*
   * VX1 §7 — a real control, not a run of words.
   *
   * The identity a trader needs at a glance is *which programme, which size*,
   * and WX1 spent the header's left edge on the programme name alone while the
   * size — the thing that decides what every figure beside it means — was only
   * in the dropdown. The pill now reads `● ONE · 10K ▾` on a raised graphite
   * surface with its own rim light and hairline, so it looks like the switch it
   * is; the full programme name, the phase, the nominal and the canonical
   * public id are one press away and always in the accessible name.
   */
  const summary = (
    <span className="flex min-w-0 shrink-0 items-center gap-1.5">
      {/*
       * VX1-C.1 §2 — no dot before ONE while the account is fine.
       *
       * A funded account in good standing is the condition every session opens
       * in, so a permanent green mark ahead of the programme name told the
       * trader nothing and cost the header one of the four green dots this pass
       * set out to remove. An account under warning or breach still shows its
       * mark, because that is the state that changes what the trader may do —
       * and the full status is in the pill's accessible name either way.
       */}
      {active.statusVariant === 'success' || active.statusVariant === 'neutral' ? null : (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[active.statusVariant]}`}
        />
      )}
      <span className="whitespace-nowrap text-[11px] font-bold leading-none tracking-[0.02em] text-[color:var(--wariba-component-workstation-text-primary)]">
        {active.programShortLabel}
      </span>
      {active.sizeShortLabel ? (
        <>
          <span
            aria-hidden="true"
            className="text-[10px] leading-none text-[color:var(--wariba-component-workstation-text-tertiary)]"
          >
            ·
          </span>
          <span className="wariba-data whitespace-nowrap text-[11px] font-semibold leading-none tabular-nums text-[color:var(--wariba-component-workstation-identity-mark)]">
            {active.sizeShortLabel}
          </span>
        </>
      ) : null}
    </span>
  );

  return (
    <details
      data-testid="workstation-account-switcher"
      className="relative shrink-0 [&[open]>summary>svg]:rotate-180"
    >
      <summary
        /*
         * Phase 3.4.4 §9 — the accessible name carries the whole identity.
         *
         * It used to read `${programLabel} ${nominal} ${publicId}`, which was
         * complete only while `programLabel` conflated product and phase
         * ("WARIBA Performance"). Now that the product is named from
         * `product_family`, dropping the phase would leave a screen-reader
         * user unable to tell a ONE Evaluation from its Performance
         * successor — the one distinction this control exists to make.
         */
        aria-label={`Compte actif : ${active.programLabel} ${active.phaseLabel} ${active.nominalFormatted} ${active.publicId}. Changer de compte`}
        className="flex h-7 shrink-0 cursor-pointer list-none items-center gap-1.5 rounded-[7px] bg-[color:var(--wariba-component-workstation-surface-control)] px-2 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)] transition-[background-color,box-shadow] duration-[var(--wariba-component-workstation-motion-quick)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:ring-[color:var(--wariba-component-workstation-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] [&::-webkit-details-marker]:hidden"
      >
        {summary}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-3 w-3 shrink-0 text-[color:var(--wariba-component-workstation-text-tertiary)] transition-transform duration-[var(--wariba-component-workstation-motion-quick)]"
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
