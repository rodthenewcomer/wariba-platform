import Decimal from 'decimal.js';
import {
  evaluateCycleProgress,
  evaluatePayoutEligibility,
  loadPayoutRequestsForAccount,
  type Db,
  type PayoutRejectionCode,
} from '@wariba/database';
import type { AccountConsistencyView, AccountMissionNextAction } from './mission-view';

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
  buffer_not_reached: 'Le solde éligible n’a pas encore dépassé le plancher du buffer permanent.',
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

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        new Decimal(progress.realizedBalance).dividedBy(progress.bufferFloor).times(100).toNumber(),
      ),
    ),
  );

  const conditions: AccountPerformanceMissionCondition[] = [
    {
      label: 'Buffer permanent atteint',
      detail: progress.bufferReached
        ? `Excédent éligible : ${formatUsd(progress.eligibleExcess)}`
        : `Plancher : ${formatUsd(progress.bufferFloor)}`,
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
    progressPercent,
    conditions,
    nextAction: eligibility.eligible
      ? { label: 'Demander un payout', href: '/trade#payout' }
      : null,
    consistency,
    payoutEligible: eligibility.eligible,
    blockingSummary: eligibility.eligible ? null : REJECTION_LABEL[eligibility.rejectionCode],
    recentPayouts: payoutRequests.map((request) => ({
      statusLabel: PAYOUT_STATUS_LABEL[request.status] ?? request.status,
      cycleNumber: request.cycleNumber,
      amountFormatted: request.traderNetCash ? formatUsd(request.traderNetCash) : null,
      dateLabel: request.requestedAt.toLocaleDateString('fr-FR'),
    })),
  };
}
