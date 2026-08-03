import { describe, expect, it } from 'vitest';
import {
  assertPurchaseOrderTransition,
  assertEvaluationAccountTransition,
  assertTradeOrderTransition,
  assertPositionTransition,
  InvalidTransitionError,
  PURCHASE_ORDER_TERMINAL_STATUSES,
  EVALUATION_ACCOUNT_TERMINAL_STATUSES,
  TRADE_ORDER_TERMINAL_STATUSES,
  POSITION_TERMINAL_STATUSES,
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
    expect(() => assertPurchaseOrderTransition('created', 'fulfilled')).toThrow(
      InvalidTransitionError,
    );
  });

  it('rejects any transition out of a terminal status except fulfilled->refunded', () => {
    expect(() => assertPurchaseOrderTransition('cancelled', 'pending_payment')).toThrow(
      InvalidTransitionError,
    );
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
    expect(() => assertEvaluationAccountTransition('breached', 'active')).toThrow(
      InvalidTransitionError,
    );
  });

  it('rejects skipping straight to passed without pass_pending', () => {
    expect(() => assertEvaluationAccountTransition('active', 'passed')).toThrow(
      InvalidTransitionError,
    );
  });

  it('terminal statuses match the RULESET.json source of truth', () => {
    expect(EVALUATION_ACCOUNT_TERMINAL_STATUSES).toEqual(['passed', 'breached', 'closed']);
  });
});

describe('trade order state machine', () => {
  it('allows the full happy path', () => {
    expect(() => assertTradeOrderTransition('received', 'validated')).not.toThrow();
    expect(() => assertTradeOrderTransition('validated', 'accepted')).not.toThrow();
    expect(() => assertTradeOrderTransition('accepted', 'filled')).not.toThrow();
  });

  it('allows rejection from any non-terminal state', () => {
    expect(() => assertTradeOrderTransition('received', 'rejected')).not.toThrow();
    expect(() => assertTradeOrderTransition('validated', 'rejected')).not.toThrow();
    expect(() => assertTradeOrderTransition('accepted', 'rejected')).not.toThrow();
  });

  it('rejects skipping straight from received to filled', () => {
    expect(() => assertTradeOrderTransition('received', 'filled')).toThrow(InvalidTransitionError);
  });

  it('rejects any transition out of a terminal status', () => {
    expect(() => assertTradeOrderTransition('filled', 'accepted')).toThrow(InvalidTransitionError);
    expect(() => assertTradeOrderTransition('rejected', 'received')).toThrow(
      InvalidTransitionError,
    );
    expect(() => assertTradeOrderTransition('cancelled', 'validated')).toThrow(
      InvalidTransitionError,
    );
  });

  it('terminal statuses match the RULESET.json source of truth', () => {
    expect(TRADE_ORDER_TERMINAL_STATUSES).toEqual(['filled', 'rejected', 'cancelled']);
  });
});

describe('position state machine', () => {
  it('allows closing an open position', () => {
    expect(() => assertPositionTransition('open', 'closed')).not.toThrow();
  });

  it('rejects reopening a closed position', () => {
    expect(() => assertPositionTransition('closed', 'open')).toThrow(InvalidTransitionError);
  });

  it('terminal statuses match the RULESET.json source of truth', () => {
    expect(POSITION_TERMINAL_STATUSES).toEqual(['closed']);
  });
});
