import { describe, expect, it } from 'vitest';
import { summarizeOrders } from '../src/billing-view';
import type { BillingOrder, OrderDisplayStatus } from '../src/billing-view';

/**
 * §21's counts. They live in the application layer for the same reason the
 * journal's totals do: a count rendered beside a total computed elsewhere is
 * a pair that can disagree, and `apps/web` deliberately does no arithmetic
 * over money.
 */
function order(status: OrderDisplayStatus): BillingOrder {
  return {
    id: `order-${status}-${Math.random()}`,
    productLabel: 'WARIBA ONE 10K',
    amountFormatted: '39 900,00 XOF',
    currency: 'XOF',
    status,
    statusLabel: status,
    statusTone: 'neutral',
    dateLabel: '22 août 2026',
    createdAt: '2026-08-22T10:00:00.000Z',
    receiptId: null,
    receiptDateLabel: null,
    paymentProvider: null,
  };
}

describe('summarizeOrders', () => {
  it('counts an empty history as zero, not as absent', () => {
    // The page renders "Commandes 0" for a real user who has bought nothing —
    // that is an authoritative zero, unlike a fabricated 0 % win rate.
    expect(summarizeOrders([])).toEqual({
      orderCount: 0,
      paidCount: 0,
      fulfilledCount: 0,
      refundedCount: 0,
      failedCount: 0,
    });
  });

  it('separates paid from fulfilled', () => {
    /*
     * They mean different things to a trader: paid is money taken, fulfilled
     * is an account they can actually trade. An order sits at paid while
     * activation runs, and collapsing the two hides the state someone opens
     * this page to check.
     */
    const summary = summarizeOrders([order('paid'), order('fulfilled'), order('fulfilled')]);
    expect(summary.paidCount).toBe(1);
    expect(summary.fulfilledCount).toBe(2);
    expect(summary.orderCount).toBe(3);
  });

  it('counts refunds and failures separately', () => {
    const summary = summarizeOrders([
      order('refunded'),
      order('payment_failed'),
      order('payment_failed'),
      order('fulfilled'),
    ]);
    expect(summary.refundedCount).toBe(1);
    expect(summary.failedCount).toBe(2);
    expect(summary.fulfilledCount).toBe(1);
  });

  it('does not count intermediate states as purchases', () => {
    // `created` and `pending_payment` are neither paid nor failed — they are
    // in flight, and reporting them as either would misstate the record.
    const summary = summarizeOrders([order('created'), order('pending_payment')]);
    expect(summary.orderCount).toBe(2);
    expect(summary.paidCount).toBe(0);
    expect(summary.fulfilledCount).toBe(0);
    expect(summary.failedCount).toBe(0);
  });
});
