import {
  ACCOUNT_STATUS_LABEL,
  accountStatusLabel,
  type AccountSummaryDTO,
} from '@wariba/application';

export type AccountProgramType = AccountSummaryDTO['programType'];
export type AccountStatusVariant = 'neutral' | 'information' | 'success' | 'warning' | 'danger';

/**
 * The canonical human labels for the two programs. Extracted in W1 so the
 * Hub selector, the WariX status bar and the `/trade` empty state cannot
 * drift apart — the W0 audit (§3A.4) found exactly that drift, with
 * `TradeHeaderPanel` hardcoding "WARIBA ONE" for every account and a
 * WARIBA_PERFORMANCE trader being shown the wrong program in the terminal.
 *
 * The program is always read from authoritative account/snapshot state
 * (`AccountSummaryDTO.programType` / `AccountSnapshot.programType`), never
 * inferred from balance, payout presence, the URL or anything client-side.
 */
export function programLabel(programType: AccountProgramType): 'WARIBA ONE' | 'WARIBA Performance' {
  return programType === 'WARIBA_PERFORMANCE' ? 'WARIBA Performance' : 'WARIBA ONE';
}

/**
 * The program in the fewest characters that stay unambiguous, for the phone
 * status bar (W2 §25) where the full canonical public id does not fit beside
 * equity, DLL and the notification control. The full identity is never lost:
 * it stays in the control's accessible name and one tap away in the switcher.
 */
export function programShortLabel(programType: AccountProgramType): string {
  return programType === 'WARIBA_PERFORMANCE' ? 'PERF' : 'ONE';
}

/** The phase a program represents — what distinguishes the two at a glance. */
export function programPhaseLabel(programType: AccountProgramType): string {
  return programType === 'WARIBA_PERFORMANCE' ? 'Performance' : 'Évaluation';
}

/**
 * Lightweight labels for the account list/selector — the raw 8-value DB
 * status, not the fuller risk-derived HubDisplayState (that would mean
 * running the risk engine for every account just to render the switcher).
 *
 * Re-exported rather than redeclared. The same eight strings were also needed
 * by the recent-activity read model, which is on the far side of the package
 * boundary and could not import them from here — so the canonical copy moved
 * to `@wariba/application` and this stays the name the web app has always
 * imported. A third literal copy is how the activity feed came to be the one
 * surface still rendering `pending_activation` at a person.
 */
export { ACCOUNT_STATUS_LABEL };

export const ACCOUNT_STATUS_VARIANT: Record<string, AccountStatusVariant> = {
  pending_activation: 'neutral',
  active: 'success',
  soft_locked: 'warning',
  pass_pending: 'information',
  inactive: 'neutral',
  passed: 'success',
  breached: 'danger',
  closed: 'neutral',
};

export { accountStatusLabel };

export function accountStatusVariant(status: string): AccountStatusVariant {
  return ACCOUNT_STATUS_VARIANT[status] ?? 'neutral';
}

/** `50 000 USD` — the nominal size as the Hub has always rendered it. */
export function formatNominal(nominalBalance: string, currency: string): string {
  return `${Math.round(Number.parseFloat(nominalBalance)).toLocaleString('fr-FR')} ${currency}`;
}

/**
 * `10K`, `50K` — the account's size in the two characters a workstation pill
 * has for it (VX1 §7).
 *
 * WariX sells five sizes and a trader thinks in them, so the selector says
 * which one is loaded without spending the width of `50 000 USD` on it. It is a
 * *rendering* of the authoritative nominal balance, not a tier concept of its
 * own: an account whose nominal is not a round thousand falls back to the whole
 * number rather than inventing a bucket for it.
 */
export function accountSizeShortLabel(nominalBalance: string): string {
  const nominal = Math.round(Number.parseFloat(nominalBalance));
  if (!Number.isFinite(nominal)) return '';
  if (nominal >= 1_000 && nominal % 1_000 === 0) return `${nominal / 1_000}K`;
  return String(nominal);
}
