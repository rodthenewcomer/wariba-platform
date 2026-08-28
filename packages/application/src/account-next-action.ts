import type { CanonicalReasonCode } from '@wariba/policies';

/**
 * Phase 3.4.4 §48 — one server-side answer to "what should this trader do
 * next", instead of a decision tree per surface.
 *
 * ## Why this is not a frontend concern
 *
 * The Hub, the account list, the account card and WariX all want to show the
 * single most useful next step. Each one derived it from whatever subset of
 * the account it happened to hold, so a FLEX account awaiting activation could
 * read "Continuez à trader" on one surface and "Action requise" on another —
 * both computed correctly from incomplete facts. The fix is not a shared
 * helper the client calls; it is that the server, which holds every fact,
 * decides once.
 *
 * ## Why an enum and not a sentence
 *
 * The kind is semantic and stays in English, like every other code that
 * crosses the boundary. Copy is chosen by the surface that renders it — a
 * dashboard headline, a list badge and a 320 px card do not want the same
 * words for the same state — and lives in the presentation layer. Shipping a
 * French sentence from here would make the read model the arbiter of tone.
 */
export type AccountNextActionKind =
  | 'continue_trading'
  | 'daily_pause'
  | 'await_finalization'
  | 'pass_review'
  | 'activate_performance'
  | 'activation_expired'
  | 'performance_preparing'
  | 'open_warix'
  | 'acknowledge_rules'
  | 'build_buffer'
  | 'complete_performance_days'
  | 'improve_best_day'
  | 'complete_kyc'
  | 'add_payout_method'
  | 'request_payout'
  | 'payout_under_review'
  | 'wariba_review'
  | 'account_breached'
  | 'account_inactive'
  | 'awaiting_activation';

export interface AccountNextAction {
  kind: AccountNextActionKind;
  /**
   * Whether this asks something of the trader right now.
   *
   * `continue_trading` and the informational terminal states are not actions;
   * everything a surface would badge "Action requise" is. Carried explicitly
   * so a list does not re-derive it by matching on kind.
   */
  requiresTraderAction: boolean;
  /** The canonical code behind this state, where one exists. Never a synonym. */
  reasonCode: CanonicalReasonCode | null;
}

/**
 * Every fact the decision needs, and nothing else.
 *
 * A struct rather than an account row: the ordering below is a product rule
 * worth testing directly against invented states, including combinations the
 * database cannot currently produce but a future policy could.
 */
export interface AccountNextActionFacts {
  status:
    | 'pending_activation'
    | 'active'
    | 'soft_locked'
    | 'pass_pending'
    | 'inactive'
    | 'passed'
    | 'breached'
    | 'closed';
  phase: 'evaluation' | 'performance';
  /** True once the deciding day has closed and the pass is with review. */
  awaitingPassReview: boolean;
  /** FLEX only: the obligation standing between a passed Evaluation and its Performance account. */
  flexActivation: 'not_applicable' | 'due' | 'paid' | 'fulfilled' | 'expired';
  /** A successor Performance account exists and is reachable. */
  performanceAccountExists: boolean;
  /** First-entry Performance rules have been acknowledged (Phase 3.3.1). */
  performanceRulesAcknowledged: boolean;
  /** Performance only — null on an Evaluation account. */
  cycle: {
    bufferReached: boolean;
    performanceDaysCompleted: number;
    performanceDaysRequired: number;
    bestDayCompliant: boolean;
    /** Financially eligible: every trading condition met, identity aside. */
    financiallyEligible: boolean;
    /** A request already sits with WARIBA. */
    payoutUnderReview: boolean;
    /** The account has finished its published cycles and entered review. */
    inWaribaReview: boolean;
  } | null;
  kycVerified: boolean;
  payoutMethodConfigured: boolean;
}

/**
 * The first true condition wins, and the order is the product's priority.
 *
 * Terminal states outrank everything — an account that is over has no next
 * step, and offering one would be a lie. Lifecycle blocks outrank progress,
 * because a FLEX trader whose activation is due cannot act on "build your
 * reserve". Payout readiness outranks "continue trading", because it is the
 * only branch where the platform is waiting on the trader rather than the
 * other way round. `continue_trading` is last by construction: it is what is
 * true when nothing else is.
 */
export function deriveAccountNextAction(facts: AccountNextActionFacts): AccountNextAction {
  const action = (
    kind: AccountNextActionKind,
    requiresTraderAction: boolean,
    reasonCode: CanonicalReasonCode | null = null,
  ): AccountNextAction => ({ kind, requiresTraderAction, reasonCode });

  if (facts.status === 'breached') return action('account_breached', false, 'ACCOUNT_BREACHED');
  if (facts.status === 'closed') return action('account_breached', false, null);
  if (facts.status === 'inactive') return action('account_inactive', true, null);
  if (facts.status === 'pending_activation') return action('awaiting_activation', false, null);

  // The FLEX obligation sits between a passed Evaluation and a Performance
  // account that does not exist yet. It is checked before `passed` handling so
  // a FLEX account never falls through to ONE's "your account is ready" path.
  if (facts.flexActivation === 'expired') {
    return action('activation_expired', false, 'FLEX_ACTIVATION_EXPIRED');
  }
  if (facts.flexActivation === 'due') {
    return action('activate_performance', true, 'FLEX_ACTIVATION_REQUIRED');
  }
  if (facts.flexActivation === 'paid' && !facts.performanceAccountExists) {
    return action('performance_preparing', false, null);
  }

  if (facts.status === 'pass_pending') {
    return facts.awaitingPassReview
      ? action('pass_review', false, null)
      : action('await_finalization', false, null);
  }

  if (facts.status === 'passed') {
    if (!facts.performanceAccountExists) return action('performance_preparing', false, null);
    if (!facts.performanceRulesAcknowledged) return action('acknowledge_rules', true, null);
    return action('open_warix', true, null);
  }

  if (facts.status === 'soft_locked') {
    return action('daily_pause', false, 'DAILY_LOSS_SOFT_LOCKED');
  }

  const cycle = facts.cycle;
  if (facts.phase === 'performance' && cycle) {
    if (cycle.inWaribaReview) return action('wariba_review', false, 'PAYOUT_REVIEW_AFTER_FIFTH');
    if (cycle.payoutUnderReview) return action('payout_under_review', false, null);
    if (cycle.financiallyEligible) {
      // Identity and destination are the trader's two remaining steps, in the
      // order the payout flow asks for them.
      if (!facts.kycVerified) return action('complete_kyc', true, 'KYC_REQUIRED');
      if (!facts.payoutMethodConfigured) {
        return action('add_payout_method', true, 'PAYOUT_RAIL_UNAVAILABLE_FOR_COUNTRY');
      }
      return action('request_payout', true, null);
    }
    // Not yet eligible: name the binding condition rather than a generic
    // "keep going". Days first — it is the one that takes real time.
    if (cycle.performanceDaysCompleted < cycle.performanceDaysRequired) {
      return action('complete_performance_days', false, 'PERFORMANCE_DAYS_INSUFFICIENT');
    }
    if (!cycle.bufferReached) return action('build_buffer', false, 'PAYOUT_BUFFER_NOT_REACHED');
    if (!cycle.bestDayCompliant) {
      return action('improve_best_day', false, 'BEST_DAY_NOT_YET_COMPLIANT');
    }
  }

  return action('continue_trading', false, null);
}
