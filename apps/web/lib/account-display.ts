import type { AccountSummaryDTO } from '@wariba/application';

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

/** The phase a program represents — what distinguishes the two at a glance. */
export function programPhaseLabel(programType: AccountProgramType): string {
  return programType === 'WARIBA_PERFORMANCE' ? 'Performance' : 'Évaluation';
}

/**
 * Lightweight labels for the account list/selector — the raw 8-value DB
 * status, not the fuller risk-derived HubDisplayState (that would mean
 * running the risk engine for every account just to render the switcher).
 */
export const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  pending_activation: 'Activation en attente',
  active: 'Actif',
  soft_locked: 'Blocage temporaire',
  pass_pending: 'Passage en attente',
  inactive: 'Inactif',
  passed: 'Objectif validé',
  breached: 'Limite maximale dépassée',
  closed: 'Compte terminé',
};

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

export function accountStatusLabel(status: string): string {
  return ACCOUNT_STATUS_LABEL[status] ?? status;
}

export function accountStatusVariant(status: string): AccountStatusVariant {
  return ACCOUNT_STATUS_VARIANT[status] ?? 'neutral';
}

/** `50 000 USD` — the nominal size as the Hub has always rendered it. */
export function formatNominal(nominalBalance: string, currency: string): string {
  return `${Math.round(Number.parseFloat(nominalBalance)).toLocaleString('fr-FR')} ${currency}`;
}
