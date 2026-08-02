/**
 * @wariba/domain — Business domain modules: identity, commerce, trading, policy-risk, performance-payout, support, operations.
 *
 * Prompt 03 (Identity, Commerce & Activation) adds Money, the purchase-order
 * and evaluation-account state machines, and DomainError. Trading/policy-risk/
 * performance-payout domain logic lands in later prompts.
 */

export const PACKAGE_NAME = '@wariba/domain';

export { Money } from './money.js';
export { DomainError } from './errors.js';
export {
  assertPurchaseOrderTransition,
  assertEvaluationAccountTransition,
  InvalidTransitionError,
  PURCHASE_ORDER_TERMINAL_STATUSES,
  EVALUATION_ACCOUNT_TERMINAL_STATUSES,
  type PurchaseOrderStatus,
  type EvaluationAccountStatus,
} from './state-machines.js';
