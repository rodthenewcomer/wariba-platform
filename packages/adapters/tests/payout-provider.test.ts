import { describe, expect, it } from 'vitest';
import {
  ManualPayoutProvider,
  MockPayoutProvider,
  type PayoutProvider,
} from '../src/payout-provider';

const SUBMISSION = {
  payoutRequestId: '8c88d9d1-d1e0-4986-9d5c-1ee11332e350',
  idempotencyKey: 'wariba-payout:8c88d9d1-d1e0-4986-9d5c-1ee11332e350',
  amount: '588.24',
  currency: 'USD',
};

function runProviderContract(provider: PayoutProvider, initialStatus: 'pending' | 'processing') {
  it('returns the same provider reference when submission is retried', async () => {
    const first = await provider.submit(SUBMISSION);
    const retry = await provider.submit(SUBMISSION);

    expect(first.provider).toBe(provider.providerName);
    expect(first.status).toBe(initialStatus);
    expect(first.providerReference).toBe(SUBMISSION.idempotencyKey);
    expect(retry).toEqual(first);
  });
}

describe('MockPayoutProvider', () => {
  runProviderContract(new MockPayoutProvider(), 'processing');

  it('reconciles a submitted sandbox transfer deterministically', async () => {
    const provider = new MockPayoutProvider();
    const submission = await provider.submit(SUBMISSION);
    const reconciliation = await provider.reconcile({
      providerReference: submission.providerReference,
      idempotencyKey: submission.idempotencyKey,
      reconciledAt: new Date('2026-08-07T12:00:00.000Z'),
    });

    expect(reconciliation.status).toBe('paid');
    expect(
      (
        await provider.getStatus({
          providerReference: submission.providerReference,
          idempotencyKey: submission.idempotencyKey,
        })
      ).status,
    ).toBe('paid');
  });
});

describe('ManualPayoutProvider', () => {
  runProviderContract(new ManualPayoutProvider(), 'pending');

  it('requires a finance-recorded outcome before it can reconcile', async () => {
    const provider = new ManualPayoutProvider();
    const submission = await provider.submit(SUBMISSION);

    await expect(
      provider.reconcile({
        providerReference: submission.providerReference,
        idempotencyKey: submission.idempotencyKey,
        reconciledAt: new Date('2026-08-07T12:00:00.000Z'),
      }),
    ).rejects.toThrow('operator outcome');

    const reconciliation = await provider.reconcile({
      providerReference: submission.providerReference,
      idempotencyKey: submission.idempotencyKey,
      reconciledAt: new Date('2026-08-07T12:00:00.000Z'),
      manualOutcome: 'paid',
    });
    expect(reconciliation.status).toBe('paid');
  });
});
