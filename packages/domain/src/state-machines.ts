/**
 * State machines mirrored exactly from WARIBA_RULESET_v1.0.json `state_machines`
 * (purchase_order, evaluation_account, trade_order, position) — the
 * machine-readable source of truth. A transition not listed here is invalid
 * by construction; no code path can silently move an order or account into
 * an unlisted state.
 */

export type PurchaseOrderStatus =
  | 'created'
  | 'pending_payment'
  | 'paid'
  | 'payment_failed'
  | 'fulfilled'
  | 'cancelled'
  | 'refunded';

const PURCHASE_ORDER_TRANSITIONS: Record<PurchaseOrderStatus, readonly PurchaseOrderStatus[]> = {
  created: ['pending_payment', 'cancelled'],
  pending_payment: ['paid', 'payment_failed', 'cancelled'],
  payment_failed: ['pending_payment', 'cancelled'],
  paid: ['fulfilled', 'refunded'],
  fulfilled: ['refunded'],
  cancelled: [],
  refunded: [],
};

export type EvaluationAccountStatus =
  | 'pending_activation'
  | 'active'
  | 'soft_locked'
  | 'pass_pending'
  | 'inactive'
  | 'passed'
  | 'breached'
  | 'closed';

const EVALUATION_ACCOUNT_TRANSITIONS: Record<
  EvaluationAccountStatus,
  readonly EvaluationAccountStatus[]
> = {
  pending_activation: ['active', 'closed'],
  active: ['soft_locked', 'pass_pending', 'inactive', 'breached', 'closed'],
  soft_locked: ['active', 'breached', 'closed'],
  pass_pending: ['passed', 'active', 'breached'],
  inactive: ['active', 'closed'],
  passed: [],
  breached: [],
  closed: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly machine: string,
  ) {
    super(`Invalid ${machine} transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

function assertTransition<S extends string>(
  transitions: Record<S, readonly S[]>,
  machine: string,
  from: S,
  to: S,
): void {
  if (!transitions[from].includes(to)) {
    throw new InvalidTransitionError(from, to, machine);
  }
}

export function assertPurchaseOrderTransition(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): void {
  assertTransition(PURCHASE_ORDER_TRANSITIONS, 'purchase_order', from, to);
}

export function assertEvaluationAccountTransition(
  from: EvaluationAccountStatus,
  to: EvaluationAccountStatus,
): void {
  assertTransition(EVALUATION_ACCOUNT_TRANSITIONS, 'evaluation_account', from, to);
}

export const PURCHASE_ORDER_TERMINAL_STATUSES: readonly PurchaseOrderStatus[] = [
  'fulfilled',
  'cancelled',
  'refunded',
];

export const EVALUATION_ACCOUNT_TERMINAL_STATUSES: readonly EvaluationAccountStatus[] = [
  'passed',
  'breached',
  'closed',
];

/**
 * TRD-021: no order-level partial fills in V1 — a deterministic sandbox
 * market always has sufficient liquidity, so an accepted market order fills
 * completely in exactly one fill. 'partially_filled' is therefore not a
 * reachable status; it is deliberately absent rather than modeled-but-unused.
 */
export type TradeOrderStatus =
  'received' | 'validated' | 'accepted' | 'filled' | 'rejected' | 'cancelled';

const TRADE_ORDER_TRANSITIONS: Record<TradeOrderStatus, readonly TradeOrderStatus[]> = {
  received: ['validated', 'rejected', 'cancelled'],
  validated: ['accepted', 'rejected', 'cancelled'],
  accepted: ['filled', 'rejected', 'cancelled'],
  filled: [],
  rejected: [],
  cancelled: [],
};

export type PositionStatus = 'open' | 'closed';

const POSITION_TRANSITIONS: Record<PositionStatus, readonly PositionStatus[]> = {
  open: ['closed'],
  closed: [],
};

export function assertTradeOrderTransition(from: TradeOrderStatus, to: TradeOrderStatus): void {
  assertTransition(TRADE_ORDER_TRANSITIONS, 'trade_order', from, to);
}

export function assertPositionTransition(from: PositionStatus, to: PositionStatus): void {
  assertTransition(POSITION_TRANSITIONS, 'position', from, to);
}

export const TRADE_ORDER_TERMINAL_STATUSES: readonly TradeOrderStatus[] = [
  'filled',
  'rejected',
  'cancelled',
];

export const POSITION_TERMINAL_STATUSES: readonly PositionStatus[] = ['closed'];
