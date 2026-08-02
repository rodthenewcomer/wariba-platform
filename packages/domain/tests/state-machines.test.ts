import { describe, expect, it } from 'vitest';
import {
  assertPurchaseOrderTransition,
  assertEvaluationAccountTransition,
  InvalidTransitionError,
  PURCHASE_ORDER_TERMINAL_STATUSES,
  EVALUATION_ACCOUNT_TERMINAL_STATUSES,
} from '../src/state-machines';

describe('purchase order state machine', () => {
  it('allows the full happy path', () => {
    expect(() => assertPurchaseOrderTransition('created', 'pending_payment')).not.toThrow();
    expect(() => assertPurchaseOrderTransition('pending_payment', 'paid')).not.toThrow();
    expect(() => assertPurchaseOrderTransition('paid', 'fulfilled')).not.toThrow();
  });

  it('allows retry from payment_failed back to pending_payment', () => {
    expect(() => assertPurchaseOrderTransition('payment_failed', 'pending_payment')).not.toThrow();
  });

  it('rejects skipping straight from created to fulfilled', () => {
    expect(() => assertPurchaseOrderTransition('created', 'fulfilled')).toThrow(InvalidTransitionError);
  });

  it('rejects any transition out of a terminal status except fulfilled->refunded', () => {
    expect(() => assertPurchaseOrderTransition('cancelled', 'pending_payment')).toThrow(InvalidTransitionError);
    expect(() => assertPurchaseOrderTransition('refunded', 'paid')).toThrow(InvalidTransitionError);
    expect(() => assertPurchaseOrderTransition('fulfilled', 'refunded')).not.toThrow();
  });

  it('terminal statuses match the RULESET.json source of truth', () => {
    expect(PURCHASE_ORDER_TERMINAL_STATUSES).toEqual(['fulfilled', 'cancelled', 'refunded']);
  });
});

describe('evaluation account state machine', () => {
  it('allows activation from pending_activation', () => {
    expect(() => assertEvaluationAccountTransition('pending_activation', 'active')).not.toThrow();
  });

  it('allows soft lock and recovery', () => {
    expect(() => assertEvaluationAccountTransition('active', 'soft_locked')).not.toThrow();
    expect(() => assertEvaluationAccountTransition('soft_locked', 'active')).not.toThrow();
  });

  it('rejects reactivating a breached account', () => {
    expect(() => assertEvaluationAccountTransition('breached', 'active')).toThrow(InvalidTransitionError);
  });

  it('rejects skipping straight to passed without pass_pending', () => {
    expect(() => assertEvaluationAccountTransition('active', 'passed')).toThrow(InvalidTransitionError);
  });

  it('terminal statuses match the RULESET.json source of truth', () => {
    expect(EVALUATION_ACCOUNT_TERMINAL_STATUSES).toEqual(['passed', 'breached', 'closed']);
  });
});
