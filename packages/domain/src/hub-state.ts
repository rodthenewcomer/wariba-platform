import Decimal from 'decimal.js';
import type { EvaluationAccountStatus } from './state-machines';

/**
 * The Hub's 9 server-derivable display states (Prompt Pack §9 ÉTATS
 * OBLIGATOIRES). `no account`, `loading`, `error`, `offline` and `stale` are
 * deliberately not modeled here — they come from whether an account exists
 * at all, from Next.js's own loading.tsx/error.tsx boundaries, and from
 * client-side connectivity, never from this pure function.
 */
export type HubDisplayState =
  | 'pending_activation'
  | 'active'
  | 'attention'
  | 'soft_locked'
  | 'target_waiting'
  | 'passed'
  | 'breached'
  | 'inactive'
  | 'closed';

export interface HubAttentionSignal {
  /** Today's Daily Loss Limit floor (fixed for the day) and how much of it is used. */
  dailyLossFloor: string;
  dailyLossUsed: string;
  /** USD remaining above the current (ratcheting) Maximum Loss floor. */
  maximumLossRemaining: string;
  /** nominalBalance × maximumLossRate — fixed total risk budget, unaffected by floor ratcheting. */
  maximumLossBudget: string;
}

const ATTENTION_DAILY_LOSS_USED_RATIO = '0.7';
const ATTENTION_MAXIMUM_LOSS_REMAINING_RATIO = '0.3';

/**
 * UI-only warning-zone threshold between "normal" and "soft lock" — not a
 * new financial rule, just a presentation zone over numbers the risk engine
 * (@wariba/policies) already computes. Ratios documented in DECISION_LOG.md.
 */
export function isInAttentionZone(signal: HubAttentionSignal): boolean {
  const dailyLossFloor = new Decimal(signal.dailyLossFloor);
  const dailyLossRatioUsed = dailyLossFloor.isZero()
    ? new Decimal(0)
    : new Decimal(signal.dailyLossUsed).dividedBy(dailyLossFloor);
  if (dailyLossRatioUsed.greaterThanOrEqualTo(ATTENTION_DAILY_LOSS_USED_RATIO)) return true;

  const maximumLossBudget = new Decimal(signal.maximumLossBudget);
  if (maximumLossBudget.isZero()) return false;
  const remainingRatio = new Decimal(signal.maximumLossRemaining).dividedBy(maximumLossBudget);
  return remainingRatio.lessThanOrEqualTo(ATTENTION_MAXIMUM_LOSS_REMAINING_RATIO);
}

export interface DeriveHubDisplayStateParams {
  accountStatus: EvaluationAccountStatus;
  attention: HubAttentionSignal;
}

/**
 * Maps the 8-value DB status (packages/domain/src/state-machines.ts) plus a
 * risk signal into the Hub's display state. `pass_pending` becomes
 * `target_waiting` (UX §21.6 — objective reached, conditions remain);
 * `active` splits into `active`/`attention` since the DB has no
 * intermediate warning status of its own.
 */
export function deriveHubDisplayState(params: DeriveHubDisplayStateParams): HubDisplayState {
  const { accountStatus, attention } = params;

  switch (accountStatus) {
    case 'pending_activation':
      return 'pending_activation';
    case 'inactive':
      return 'inactive';
    case 'closed':
      return 'closed';
    case 'passed':
      return 'passed';
    case 'breached':
      return 'breached';
    case 'soft_locked':
      return 'soft_locked';
    case 'pass_pending':
      return 'target_waiting';
    case 'active':
      return isInAttentionZone(attention) ? 'attention' : 'active';
    default: {
      const exhaustive: never = accountStatus;
      throw new Error(`deriveHubDisplayState: unhandled account status ${String(exhaustive)}`);
    }
  }
}

/** Breached and closed accounts stay browsable but never actionable (UX §25.2). */
export function isHubStateReadOnly(state: HubDisplayState): boolean {
  return state === 'breached' || state === 'closed';
}
