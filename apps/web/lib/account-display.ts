/*
 * The pure subpath, not the barrel.
 *
 * This module is imported by client components — the WariX header, the account
 * switcher — and `@wariba/application`'s main entry re-exports read models that
 * import `pg`. Reaching the labels through it put a Postgres driver in the
 * browser bundle and broke the build on `Can't resolve 'fs'`.
 */
import {
  ACCOUNT_STATUS_LABEL,
  accountStatusLabel,
  type AccountSummaryDTO,
} from '@wariba/application/presentation';

export type AccountProgramType = AccountSummaryDTO['programType'];
export type AccountProductFamily = AccountSummaryDTO['productFamily'];
export type AccountStatusVariant = 'neutral' | 'information' | 'success' | 'warning' | 'danger';

/**
 * What the account is called, from the family it belongs to.
 *
 * ## Why `programType` is not enough
 *
 * The W0 audit caught `TradeHeaderPanel` hardcoding "WARIBA ONE" for every
 * account, and the fix was to read the authoritative `programType`. That was
 * right for a two-program world and wrong the moment there were three
 * families: `programType` is *phase-shaped*, not product-shaped. A FLEX
 * account in Evaluation is `WARIBA_FLEX`, but its Performance successor is
 * `WARIBA_PERFORMANCE`, exactly like ONE's and exactly like INSTANT's.
 *
 * So the same bug came back one layer down. A FLEX Evaluation account fell
 * through to the `else` branch and was labelled WARIBA ONE — a trader told
 * they hold a product they did not buy, on the terminal they trade it from.
 * A FLEX or INSTANT Performance account lost its family entirely.
 *
 * `productFamily` is the account's own column, set at provisioning and never
 * derived. The phase is a separate question, answered separately below.
 */
const FAMILY_LABEL: Record<AccountProductFamily, string> = {
  WARIBA_ONE: 'WARIBA ONE',
  WARIBA_FLEX: 'WARIBA FLEX',
  WARIBA_INSTANT: 'WARIBA INSTANT',
};

const FAMILY_SHORT_LABEL: Record<AccountProductFamily, string> = {
  WARIBA_ONE: 'ONE',
  WARIBA_FLEX: 'FLEX',
  WARIBA_INSTANT: 'INSTANT',
};

export interface AccountIdentity {
  productFamily: AccountProductFamily;
  programType: AccountProgramType;
}

export function programLabel(account: AccountIdentity): string {
  return FAMILY_LABEL[account.productFamily] ?? FAMILY_LABEL.WARIBA_ONE;
}

/**
 * The family in the fewest characters that stay unambiguous, for the phone
 * status bar (W2 §25) where the full public id does not fit beside equity,
 * the daily limit and the notification control. The full identity is never
 * lost: it stays in the control's accessible name and one tap away in the
 * switcher.
 */
export function programShortLabel(account: AccountIdentity): string {
  return FAMILY_SHORT_LABEL[account.productFamily] ?? FAMILY_SHORT_LABEL.WARIBA_ONE;
}

/**
 * Which phase the account is in — the second half of its identity.
 *
 * §30: an INSTANT account started in Performance and never held an
 * Evaluation. Reading the phase from `programType` states that correctly
 * without implying a phase it skipped, because the phase really is what
 * `programType` encodes.
 */
export function programPhaseLabel(account: AccountIdentity): string {
  return account.programType === 'WARIBA_PERFORMANCE' ? 'Performance' : 'Évaluation';
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
