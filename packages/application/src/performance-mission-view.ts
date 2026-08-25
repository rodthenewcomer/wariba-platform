import Decimal from 'decimal.js';
import { computeBufferBuildProgress } from '@wariba/domain';
import {
  evaluateCycleProgress,
  evaluatePayoutEligibility,
  loadPayoutRequestsForAccount,
  type Db,
  type PayoutRejectionCode,
} from '@wariba/database';
import type { AccountConsistencyView, AccountMissionNextAction } from './mission-view';
import { traderLabel } from './account-status-labels';

// Same seven values as @wariba/ui's MissionState — kept as a local literal
// union (not imported from @wariba/ui) so this package doesn't take a
// dependency on the design system just for a type name; the two unions stay
// structurally interchangeable, which is what apps/web's Hub page needs to
// render both variants through the same <MissionProgress>.
export type AccountPerformanceMissionState =
  'active' | 'attention' | 'reached' | 'waiting' | 'passed' | 'breached' | 'frozen';

export interface AccountPerformanceMissionCondition {
  label: string;
  detail: string;
  met: boolean;
}

export interface AccountPerformancePayoutHistoryItem {
  statusLabel: string;
  cycleNumber: number;
  amountFormatted: string | null;
  dateLabel: string;
}

export interface AccountPerformanceMissionView {
  available: true;
  variant: 'performance';
  state: AccountPerformanceMissionState;
  cycleNumber: number;
  title: string;
  /**
   * What the bar underneath this mission is measuring.
   *
   * A Performance account has no profit objective — its policy says
   * `Objectif : non applicable` — so a UI that labels its progress "Objectif"
   * is describing a rule that does not exist on the account. The kind and the
   * label travel with the number so no surface has to guess.
   */
  progressKind: 'buffer';
  progressLabel: string;
  /** "250 / 1 000 USD" — the two figures the percentage came from. */
  progressDetail: string;
  progressPercent: number;
  conditions: AccountPerformanceMissionCondition[];
  nextAction: AccountMissionNextAction | null;
  consistency: AccountConsistencyView | null;
  payoutEligible: boolean;
  /** Every blocked condition above already carries its own detail — this is the one-line explanation for the CTA area when nextAction is null. */
  blockingSummary: string | null;
  recentPayouts: AccountPerformancePayoutHistoryItem[];
}

export interface AccountPerformanceMissionUnavailable {
  available: false;
  reason: string;
}

export interface BuildAccountPerformanceMissionViewParams {
  accountId: string;
}

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

const REJECTION_LABEL: Record<PayoutRejectionCode, string> = {
  account_not_active: 'Le compte n’est pas actif.',
  no_active_cycle: 'Aucun cycle actif — le dossier WARIBA Review est ouvert.',
  buffer_not_reached: 'Le solde éligible n’a pas encore dépassé le seuil du buffer permanent.',
  performance_days_incomplete: 'Il manque des Performance Days pour ce cycle.',
  consistency_non_compliant:
    'La meilleure journée dépasse 50 % du profit positif total — répartissez le profit sur d’autres journées.',
  open_position_blocks_payout: 'Une position est ouverte — fermez-la avant de demander un payout.',
  pending_order_blocks_payout:
    'Un ordre en attente est actif — annulez-le avant de demander un payout.',
  kyc_not_verified: 'Vérification d’identité sandbox non complétée.',
  payout_method_not_configured: 'Aucune méthode de payout sandbox configurée.',
  invalid_requested_amount: 'Le montant demandé doit être positif.',
  no_cap_for_account_size: 'Aucun plafond de payout n’est publié pour cette taille de compte.',
  integrity_hold:
    'Une anomalie de rapprochement financier bloque temporairement les opérations sensibles.',
};

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  pending_review: 'En revue',
  needs_information: 'Information requise',
  approved: 'Approuvé',
  rejected: 'Refusé',
  processing: 'En cours de versement',
  paid: 'Versé',
  failed: 'Échec du versement',
  cancelled: 'Annulé',
  reversed: 'Annulé par écriture compensatoire',
};

/**
 * Mirrors mission-view.ts's toMissionState exhaustive switch. 'closed' is
 * unreachable through evaluateCycleProgress in practice (loadActiveCycle
 * excludes closed cycles, so a successful call never carries that status)
 * but is handled rather than thrown on, since — unlike mission-view.ts's
 * pending/inactive/closed account states — nothing upstream filters it.
 */
function toMissionState(params: {
  cycleStatus: 'active' | 'payout_pending' | 'closed';
  payoutEligible: boolean;
  bufferReached: boolean;
}): AccountPerformanceMissionState {
  switch (params.cycleStatus) {
    case 'payout_pending':
      return 'waiting';
    case 'closed':
      return 'frozen';
    case 'active':
      if (params.payoutEligible) return 'reached';
      return params.bufferReached ? 'attention' : 'active';
  }
}

/**
 * Prompt 08 Phase F — WARIBA_PERFORMANCE's own mission view, the sibling of
 * mission-view.ts's WARIBA ONE one, shaped to render through the exact same
 * <MissionProgress>/<ConsistencyMeter> components. Composes Phase C's
 * cycle-scoped progress with Phase D's own eligibility check
 * (evaluatePayoutEligibility) — the exact same gate a payout request will
 * actually be re-evaluated against, never a rosier Hub-only estimate.
 */
export async function buildAccountPerformanceMissionView(
  db: Db,
  params: BuildAccountPerformanceMissionViewParams,
): Promise<AccountPerformanceMissionView | AccountPerformanceMissionUnavailable> {
  let progress;
  try {
    progress = await evaluateCycleProgress(db, params.accountId);
  } catch {
    return {
      available: false,
      reason:
        'Aucun cycle Performance actif — un dossier WARIBA Review a peut-être déjà été ouvert.',
    };
  }

  const eligibility = await evaluatePayoutEligibility(db, params.accountId);
  const payoutRequests = await loadPayoutRequestsForAccount(db, params.accountId);

  /*
   * Phase 3.3.2 A1 — buffer built, not balance over floor.
   *
   * This used to be `realizedBalance / bufferFloor`, which on an untouched
   * 10 000 USD account with an 11 000 USD floor rendered 91 % — a trader who
   * had placed no trade at all was shown as nearly finished. The buffer a
   * trader has built is the profit above nominal, and the honest number for a
   * new account is zero.
   */
  const buffer = computeBufferBuildProgress({
    realizedBalance: progress.realizedBalance,
    nominalBalance: progress.nominalBalance,
    bufferFloor: progress.bufferFloor,
  });

  const conditions: AccountPerformanceMissionCondition[] = [
    {
      label: 'Buffer permanent construit',
      detail: progress.bufferReached
        ? `Disponible : ${formatUsd(progress.eligibleExcess)}`
        : // A8 — "seuil du buffer" here, never "plancher". The floor a trader
          // must not fall through is the Maximum Loss one; this level only
          // decides which part of a gain can be requested.
          `${formatUsd(buffer.builtAmount)} / ${formatUsd(buffer.requiredAmount)}`,
      met: progress.bufferReached,
    },
    {
      label: 'Performance Days',
      detail: `${progress.performanceDaysCompleted} / ${progress.performanceDaysRequired} — seuil ${formatUsd(progress.performanceDayThreshold)}/jour`,
      met: progress.performanceDaysCompleted >= progress.performanceDaysRequired,
    },
    {
      label: 'Consistance',
      detail:
        progress.consistencyRatio === null
          ? 'Aucune journée positive pour l’instant'
          : `${Math.round(Number(progress.consistencyRatio) * 100)} % (limite ${Math.round(Number(progress.consistencyLimitRatio) * 100)} %)`,
      met: progress.consistencyCompliant,
    },
  ];

  let consistency: AccountConsistencyView | null = null;
  if (progress.consistencyRatio !== null) {
    consistency = {
      ratioPercent: Math.round(Number(progress.consistencyRatio) * 100),
      limitPercent: Math.round(Number(progress.consistencyLimitRatio) * 100),
      bestDayFormatted: formatUsd(progress.bestDayProfit),
      totalProfitFormatted: formatUsd(progress.positiveDaysProfitSum),
    };
    if (!progress.consistencyCompliant) {
      consistency.requiredProfitFormatted = formatUsd(
        Decimal.max(
          0,
          new Decimal(progress.bestDayProfit)
            .dividedBy(progress.consistencyLimitRatio)
            .minus(progress.positiveDaysProfitSum),
        ).toFixed(2),
      );
    }
  }

  return {
    available: true,
    variant: 'performance',
    state: toMissionState({
      cycleStatus: progress.cycleStatus,
      payoutEligible: eligibility.eligible,
      bufferReached: progress.bufferReached,
    }),
    cycleNumber: progress.cycleNumber,
    title: `Cycle de payout n°${progress.cycleNumber}`,
    progressKind: 'buffer',
    progressLabel: progress.bufferReached ? 'Buffer construit' : 'Buffer à construire',
    progressDetail: `${formatUsd(buffer.builtAmount)} / ${formatUsd(buffer.requiredAmount)}`,
    progressPercent: buffer.percent,
    conditions,
    nextAction: eligibility.eligible
      ? // W2 §16 — the Payout Center moved out of the WariX execution dock onto
        // its canonical route. Deep-linked to this account so the destination
        // does not have to guess which one the mission meant.
        { label: 'Demander un payout', href: `/payouts?account=${params.accountId}` }
      : null,
    consistency,
    payoutEligible: eligibility.eligible,
    blockingSummary: eligibility.eligible ? null : REJECTION_LABEL[eligibility.rejectionCode],
    recentPayouts: payoutRequests.map((request) => ({
      statusLabel: traderLabel(PAYOUT_STATUS_LABEL, request.status, 'En cours'),
      cycleNumber: request.cycleNumber,
      amountFormatted: request.traderNetCash ? formatUsd(request.traderNetCash) : null,
      dateLabel: request.requestedAt.toLocaleDateString('fr-FR'),
    })),
  };
}
