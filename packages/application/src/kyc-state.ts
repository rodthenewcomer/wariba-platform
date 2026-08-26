/**
 * Identity verification, as a product state.
 *
 * ## The boundary, stated plainly
 *
 * WARIBA does not verify identity documents. It stores one authoritative fact
 * — `trading_accounts.kyc_sandbox_verified` — which today is set by WARIBA
 * staff through Control, and which a real identity provider will set when one
 * is integrated. There is no document upload, no liveness check, no selfie
 * capture, and this module must never imply otherwise.
 *
 * That constraint is the reason the union below is larger than what the
 * platform can currently reach. The six states are the contract an external
 * provider will fill; `reachableStates()` says which of them this deployment
 * can actually produce, so a screen can render the honest subset instead of
 * a hopeful flow. Building the vocabulary now is what keeps the provider
 * integration from becoming a UI rewrite later; pretending the intermediate
 * states already happen would be a fabricated flow, which is worse than an
 * absent one.
 *
 * The user-facing copy therefore never says "envoyez vos documents". It says
 * what is true: verification is required, and where the trader stands.
 */

import type { IdentityReviewStatus } from '@wariba/database';

export type KycState =
  'not_started' | 'in_progress' | 'submitted' | 'needs_information' | 'verified' | 'rejected';

export interface KycView {
  state: KycState;
  label: string;
  description: string;
  tone: 'neutral' | 'progress' | 'attention' | 'success' | 'danger';
  /** Whether the trader can act. `false` means they are waiting on someone else. */
  actionable: boolean;
  /** The action's words, when there is one to take. */
  actionLabel: string | null;
}

const VIEW: Record<KycState, Omit<KycView, 'state'>> = {
  not_started: {
    label: 'Vérification requise',
    description:
      'Votre identité doit être vérifiée avant votre premier payout. Cette étape n’est demandée qu’une fois.',
    tone: 'attention',
    actionable: true,
    actionLabel: 'Vérifier mon identité',
  },
  in_progress: {
    label: 'Vérification commencée',
    description: 'Reprenez la vérification là où vous vous êtes arrêté.',
    tone: 'progress',
    actionable: true,
    actionLabel: 'Reprendre la vérification',
  },
  submitted: {
    label: 'Vérification en cours',
    description: 'Nous examinons vos informations. Vous serez informé dès qu’elle est terminée.',
    tone: 'progress',
    actionable: false,
    actionLabel: null,
  },
  needs_information: {
    label: 'Information requise',
    description: 'Une information supplémentaire est nécessaire pour terminer la vérification.',
    tone: 'attention',
    actionable: true,
    actionLabel: 'Compléter ma vérification',
  },
  verified: {
    label: 'Identité vérifiée',
    description: 'Votre identité est vérifiée. Vos payouts ne sont plus bloqués par cette étape.',
    tone: 'success',
    actionable: false,
    actionLabel: null,
  },
  rejected: {
    label: 'Vérification refusée',
    description: 'La vérification n’a pas abouti. Contactez le support pour comprendre pourquoi.',
    tone: 'danger',
    actionable: true,
    actionLabel: 'Contacter le support',
  },
};

/**
 * The states a private-beta identity case maps onto.
 *
 * `requested` and `under_review` are both "WARIBA is looking at it" from the
 * trader's side — the distinction between a case that has been picked up and
 * one that has not is an operator fact, not a trader one.
 */
const REVIEW_STATE: Record<IdentityReviewStatus, KycState> = {
  requested: 'submitted',
  under_review: 'submitted',
  needs_information: 'needs_information',
  verified: 'verified',
  unable_to_verify: 'rejected',
  // A closed case leaves no live obligation. The account flag decides.
  closed: 'not_started',
};

/**
 * Derived from the two facts the platform actually holds: whether the account
 * carries verification, and whether a review case is open on it.
 *
 * B1 — the case used to be invisible here, so a trader whose file was already
 * `under_review` was still told "Vérification requise" and, three cards lower,
 * to contact support to trigger the verification that had already been
 * triggered. The states below are still not a guess at a provider's flow;
 * every one of them corresponds to a row this deployment really writes.
 */
export function deriveKycState(params: {
  verified: boolean;
  reviewStatus?: IdentityReviewStatus | null;
}): KycState {
  if (params.verified) return 'verified';
  return params.reviewStatus ? REVIEW_STATE[params.reviewStatus] : 'not_started';
}

export function kycView(state: KycState): KycView {
  return { state, ...VIEW[state] };
}

/**
 * Which states this deployment can currently produce.
 *
 * Exported so tests can assert that the UI is not built around states no
 * provider is generating yet, and so the eventual integration has one place
 * to widen.
 */
export function reachableKycStates(): readonly KycState[] {
  // Widened in Phase 3.3.2: the private-beta identity queue really does write
  // `requested`/`under_review`/`needs_information`/`unable_to_verify` rows, so
  // these are states the product produces, not states it pretends to.
  return ['not_started', 'submitted', 'needs_information', 'verified', 'rejected'];
}

/**
 * Whether identity verification is handled by an external provider.
 *
 * `false` today: verification is completed by WARIBA staff review in the
 * sandbox. Surfaces read this rather than hardcoding the sentence, so the day
 * a provider is integrated the copy changes in one place instead of in every
 * screen that mentions it.
 */
export const KYC_PROVIDER_INTEGRATED = false;
