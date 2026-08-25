import Decimal from 'decimal.js';
import { computeBufferBuildProgress } from '@wariba/domain';
import {
  evaluateCycleProgress,
  evaluatePayoutEligibility,
  loadPayoutRequestsForAccount,
  type Db,
  type PayoutRejectionCode,
} from '@wariba/database';
import { deriveKycState, kycView, type KycState, type KycView } from './kyc-state';

/**
 * Where a trader stands on getting paid.
 *
 * ## The question this answers
 *
 * A payout page that opens on a form is answering the wrong question. Before
 * "how much do you want", a trader needs to know whether they can ask at all,
 * and if not, what specifically is in the way. The platform already computes
 * that — `evaluatePayoutEligibility` returns the exact blocking reason, and it
 * is the same gate a submitted request is re-checked against, never a rosier
 * estimate made for display.
 *
 * ## Why KYC is pulled out of the rejection list
 *
 * `kyc_not_verified` arrives late in the eligibility order, after buffer,
 * performance days, consistency, open positions and pending orders. So when it
 * *is* the blocking reason, every trading criterion has already been met: the
 * trader has earned the payout and only identity verification stands between
 * them and asking for it. That is a completely different message from "you
 * have not reached the buffer yet", and rendering both as one greyed-out form
 * is how a product loses someone at the most important moment it has.
 */

export type PayoutLifecycleState =
  /** Trading criteria not met yet. */
  | 'not_eligible'
  /** Criteria met. Identity verification is the only thing left. */
  | 'eligible_kyc_required'
  /** Identity submitted, waiting on review. */
  | 'kyc_pending'
  /** Criteria met, identity verified, no payout method on file. */
  | 'eligible_method_required'
  /** Everything is in place. The request can be made. */
  | 'request_ready'
  /** Request submitted, waiting to be looked at. */
  | 'submitted'
  /** Under review by WARIBA. */
  | 'review'
  /** More information requested from the trader. */
  | 'needs_information'
  /** Approved, not yet sent. */
  | 'approved'
  /** Being sent by the provider. */
  | 'processing'
  /** Money sent. */
  | 'paid'
  /** Refused. */
  | 'rejected';

export interface PayoutLifecycleView {
  state: PayoutLifecycleState;
  label: string;
  /** Says what is true and, when the trader can act, what to do. */
  description: string;
  tone: 'neutral' | 'progress' | 'attention' | 'success' | 'danger';
  /** The trader's next action, when they have one. */
  actionLabel: string | null;
  actionHref: string | null;
  /** True when the platform owes the next move. */
  awaitingPlatform: boolean;
  /** The identity-verification state, always resolved — the gate is never implicit. */
  kyc: KycView;
  /** The precise blocking reason, when the trader is not yet eligible. */
  blockingReason: string | null;
  /**
   * How much money is actually on the table, and what stands between the
   * trader and it.
   *
   * §14's first question is "am I eligible", but its third is "how much is
   * available" — and a page that answers the first two and not the third has
   * made the trader open a calculator. `null` when the cycle cannot be read.
   */
  cycle: PayoutCycleProgress | null;
}

export interface PayoutCycleProgress {
  cycleNumber: number;
  /** Withdrawable now: realised balance above the permanent buffer floor. */
  availableFormatted: string;
  /** The level itself, which never becomes withdrawable. */
  bufferFloorFormatted: string;
  /** Realised balance, so a trader below the level can still see how close. */
  realizedBalanceFormatted: string;
  /** How much of the buffer exists today, e.g. "250 USD". */
  bufferBuiltFormatted: string;
  /** How much the policy asks for in total, e.g. "1 000 USD". */
  bufferRequiredFormatted: string;
  /** 0-100 of the buffer *built*, measured from the nominal balance. */
  bufferProgressPercent: number;
  performanceDaysCompleted: number;
  performanceDaysRequired: number;
}

/**
 * The trader-facing sentence for each blocking reason.
 *
 * Every one of them names something the trader can either do or wait for. A
 * rejection code shown raw — `buffer_not_reached` — is the schema talking to a
 * person, which this codebase has already had to fix once.
 */
export const PAYOUT_BLOCKING_REASON: Record<PayoutRejectionCode, string> = {
  account_not_active: 'Ce compte n’est pas actif.',
  no_active_cycle: 'Aucun cycle en cours — votre dossier est chez WARIBA Review.',
  buffer_not_reached:
    'Votre solde n’a pas encore dépassé le seuil du buffer permanent. Seule la partie au-dessus est disponible.',
  performance_days_incomplete: 'Il vous manque des Performance Days sur ce cycle.',
  consistency_non_compliant:
    'Votre meilleure journée dépasse la limite de consistance. Répartissez le profit sur d’autres journées.',
  open_position_blocks_payout: 'Fermez votre position ouverte avant de demander un payout.',
  pending_order_blocks_payout: 'Annulez votre ordre en attente avant de demander un payout.',
  kyc_not_verified: 'Votre identité doit être vérifiée.',
  payout_method_not_configured: 'Aucune méthode de paiement n’est enregistrée pour ce compte.',
  invalid_requested_amount: 'Le montant demandé doit être positif.',
  no_cap_for_account_size: 'Aucun plafond de payout n’est publié pour cette taille de compte.',
  integrity_hold:
    'Une vérification de cohérence financière est en cours. Les opérations sensibles sont suspendues.',
};

const REQUEST_STATE: Record<string, PayoutLifecycleState> = {
  pending_review: 'review',
  needs_information: 'needs_information',
  approved: 'approved',
  processing: 'processing',
  paid: 'paid',
  rejected: 'rejected',
};

/** Request statuses that mean "this cycle's payout is finished, one way or another". */
const SETTLED = new Set(['paid', 'rejected', 'cancelled', 'reversed', 'failed']);

export interface BuildPayoutLifecycleParams {
  accountId: string;
  /** `trading_accounts.kyc_sandbox_verified`. */
  kycVerified: boolean;
}

export async function buildPayoutLifecycle(
  db: Db,
  params: BuildPayoutLifecycleParams,
): Promise<PayoutLifecycleView> {
  /*
   * Eligibility can legitimately be unevaluable.
   *
   * `evaluateCycleProgress` throws when no cycle has been opened — correct of
   * it, since inventing one would be inventing a payout position. But a payout
   * page that 500s because a row does not exist yet is worse than one that
   * says so: the trader is left unable to tell a missing cycle from a broken
   * platform. So the failure becomes a state, with the honest sentence.
   */
  const [eligibility, requests, progress] = await Promise.all([
    evaluatePayoutEligibility(db, params.accountId).catch(
      () => ({ eligible: false, rejectionCode: 'no_active_cycle' }) as const,
    ),
    loadPayoutRequestsForAccount(db, params.accountId).catch(() => []),
    // Same reasoning as the eligibility call: no cycle is a state, not a 500.
    evaluateCycleProgress(db, params.accountId).catch(() => null),
  ]);

  /*
   * A1 — how much of the buffer has been *built*, measured from the nominal
   * balance. `realizedBalance / bufferFloor` put an untraded account at 91 %,
   * which is the shape of a nearly-finished job rather than of one that has
   * not started.
   */
  const buffer = progress
    ? computeBufferBuildProgress({
        realizedBalance: progress.realizedBalance,
        nominalBalance: progress.nominalBalance,
        bufferFloor: progress.bufferFloor,
      })
    : null;

  const cycle: PayoutCycleProgress | null =
    progress && buffer
      ? {
          cycleNumber: progress.cycleNumber,
          availableFormatted: formatUsd(progress.eligibleExcess),
          bufferFloorFormatted: formatUsd(progress.bufferFloor),
          realizedBalanceFormatted: formatUsd(progress.realizedBalance),
          bufferBuiltFormatted: formatUsd(buffer.builtAmount),
          bufferRequiredFormatted: formatUsd(buffer.requiredAmount),
          bufferProgressPercent: buffer.percent,
          performanceDaysCompleted: progress.performanceDaysCompleted,
          performanceDaysRequired: progress.performanceDaysRequired,
        }
      : null;

  const kyc = kycView(deriveKycState({ verified: params.kycVerified }));

  /*
   * An open request outranks eligibility.
   *
   * Once something has been asked for, "you are eligible" is no longer the
   * answer to the trader's question — "where is my money" is. The most recent
   * unsettled request is therefore what the page reports on.
   */
  const open = requests.find((request) => !SETTLED.has(request.status));
  if (open) return { ...fromRequestStatus(open.status, kyc), cycle };

  if (eligibility.eligible) {
    return {
      state: 'request_ready',
      label: 'Payout disponible',
      description: 'Vous pouvez demander votre payout.',
      tone: 'success',
      actionLabel: 'Demander un payout',
      actionHref: null,
      awaitingPlatform: false,
      kyc,
      blockingReason: null,
      cycle,
    };
  }

  const reason = PAYOUT_BLOCKING_REASON[eligibility.rejectionCode];

  if (eligibility.rejectionCode === 'kyc_not_verified') {
    /*
     * The moment §15 exists for. Every trading criterion is met; the trader
     * has genuinely earned this. Telling them "not eligible" here would be
     * both demoralising and false.
     */
    return {
      state: 'eligible_kyc_required',
      label: 'Vérifiez votre identité',
      description:
        'Vous remplissez les conditions de payout. Vérifiez votre identité pour pouvoir en faire la demande.',
      tone: 'attention',
      actionLabel: kyc.actionLabel,
      actionHref: '/verification-identite',
      awaitingPlatform: false,
      kyc,
      blockingReason: reason,
      cycle,
    };
  }

  if (eligibility.rejectionCode === 'payout_method_not_configured') {
    return {
      state: 'eligible_method_required',
      label: 'Méthode de paiement requise',
      description:
        'Vous remplissez les conditions de payout. Enregistrez une méthode de paiement pour recevoir les fonds.',
      tone: 'attention',
      actionLabel: 'Ajouter une méthode',
      actionHref: '/facturation',
      awaitingPlatform: false,
      kyc,
      blockingReason: reason,
      cycle,
    };
  }

  const platformOwned =
    eligibility.rejectionCode === 'integrity_hold' ||
    eligibility.rejectionCode === 'no_active_cycle';

  return {
    state: 'not_eligible',
    label: 'Payout indisponible',
    description: reason,
    tone: platformOwned ? 'progress' : 'neutral',
    actionLabel: null,
    actionHref: null,
    awaitingPlatform: platformOwned,
    kyc,
    blockingReason: reason,
    cycle,
  };
}

function formatUsd(amount: string): string {
  return `${new Decimal(amount)
    .toDecimalPlaces(2)
    .toNumber()
    .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

function fromRequestStatus(status: string, kyc: KycView): PayoutLifecycleView {
  const state = REQUEST_STATE[status] ?? 'submitted';

  const copy: Record<
    PayoutLifecycleState,
    { label: string; description: string; tone: PayoutLifecycleView['tone']; waiting: boolean }
  > = {
    submitted: {
      label: 'Demande envoyée',
      description: 'Votre demande a été enregistrée.',
      tone: 'progress',
      waiting: true,
    },
    review: {
      label: 'En cours de revue',
      description: 'Votre demande de payout est en cours d’examen.',
      tone: 'progress',
      waiting: true,
    },
    needs_information: {
      label: 'Information requise',
      description: 'Une information supplémentaire est nécessaire pour traiter votre payout.',
      tone: 'attention',
      waiting: false,
    },
    approved: {
      label: 'Payout approuvé',
      description: 'Votre payout est approuvé et sera versé prochainement.',
      tone: 'success',
      waiting: true,
    },
    processing: {
      label: 'Versement en cours',
      description: 'Votre payout est en cours de versement.',
      tone: 'progress',
      waiting: true,
    },
    paid: {
      label: 'Payout versé',
      description: 'Votre payout a été versé.',
      tone: 'success',
      waiting: false,
    },
    rejected: {
      label: 'Payout refusé',
      description: 'Votre demande n’a pas été acceptée. Le détail est disponible ci-dessous.',
      tone: 'danger',
      waiting: false,
    },
    // Unreachable from a request status; present so the record stays exhaustive.
    not_eligible: { label: '', description: '', tone: 'neutral', waiting: false },
    eligible_kyc_required: { label: '', description: '', tone: 'attention', waiting: false },
    kyc_pending: { label: '', description: '', tone: 'progress', waiting: true },
    eligible_method_required: { label: '', description: '', tone: 'attention', waiting: false },
    request_ready: { label: '', description: '', tone: 'success', waiting: false },
  };

  const entry = copy[state];
  return {
    state,
    label: entry.label,
    description: entry.description,
    tone: entry.tone,
    actionLabel: state === 'needs_information' ? 'Contacter le support' : null,
    actionHref: state === 'needs_information' ? '/support' : null,
    awaitingPlatform: entry.waiting,
    kyc,
    blockingReason: null,
    cycle: null,
  };
}

export type { KycState, KycView };
