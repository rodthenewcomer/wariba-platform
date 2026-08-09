export const PAYOUT_PROVIDER_NAMES = ['mock', 'manual'] as const;
export type PayoutProviderName = (typeof PAYOUT_PROVIDER_NAMES)[number];

export const PAYOUT_PROVIDER_STATUSES = [
  'pending',
  'processing',
  'paid',
  'failed',
  'returned',
] as const;
export type PayoutProviderStatus = (typeof PAYOUT_PROVIDER_STATUSES)[number];

export interface PayoutProviderSubmission {
  payoutRequestId: string;
  idempotencyKey: string;
  amount: string;
  currency: string;
}

export interface PayoutProviderSubmissionResult {
  provider: PayoutProviderName;
  providerReference: string;
  idempotencyKey: string;
  status: PayoutProviderStatus;
  submittedAt: Date;
}

export interface PayoutProviderStatusResult {
  provider: PayoutProviderName;
  providerReference: string;
  idempotencyKey: string;
  status: PayoutProviderStatus;
  observedAt: Date;
}

export interface PayoutProviderReconciliationInput {
  providerReference: string;
  idempotencyKey: string;
  reconciledAt: Date;
  manualOutcome?: Extract<PayoutProviderStatus, 'paid' | 'failed' | 'returned'>;
}

export interface PayoutProviderReconciliationResult extends PayoutProviderStatusResult {
  reconciledAt: Date;
}

export interface PayoutProvider {
  readonly providerName: PayoutProviderName;
  submit(input: PayoutProviderSubmission): Promise<PayoutProviderSubmissionResult>;
  getStatus(input: {
    providerReference: string;
    idempotencyKey: string;
  }): Promise<PayoutProviderStatusResult>;
  reconcile(input: PayoutProviderReconciliationInput): Promise<PayoutProviderReconciliationResult>;
}

interface ProviderRecord {
  providerReference: string;
  idempotencyKey: string;
  status: PayoutProviderStatus;
  observedAt: Date;
}

function providerReference(input: PayoutProviderSubmission): string {
  return 'wariba-payout:' + input.payoutRequestId;
}

export class MockPayoutProvider implements PayoutProvider {
  readonly providerName = 'mock' as const;
  private readonly records = new Map<string, ProviderRecord>();

  constructor(
    private readonly reconciliationStatus: Extract<
      PayoutProviderStatus,
      'paid' | 'failed' | 'returned'
    > = 'paid',
  ) {}

  async submit(input: PayoutProviderSubmission): Promise<PayoutProviderSubmissionResult> {
    const existing = this.records.get(input.idempotencyKey);
    if (existing) {
      return {
        provider: this.providerName,
        providerReference: existing.providerReference,
        idempotencyKey: existing.idempotencyKey,
        status: existing.status,
        submittedAt: existing.observedAt,
      };
    }

    const submittedAt = new Date();
    const record = {
      providerReference: providerReference(input),
      idempotencyKey: input.idempotencyKey,
      status: 'processing' as const,
      observedAt: submittedAt,
    };
    this.records.set(input.idempotencyKey, record);
    return {
      provider: this.providerName,
      providerReference: record.providerReference,
      idempotencyKey: record.idempotencyKey,
      status: record.status,
      submittedAt,
    };
  }

  async getStatus(input: {
    providerReference: string;
    idempotencyKey: string;
  }): Promise<PayoutProviderStatusResult> {
    const record = this.records.get(input.idempotencyKey);
    if (!record || record.providerReference !== input.providerReference) {
      throw new Error('Mock payout provider reference was not found.');
    }
    return {
      provider: this.providerName,
      providerReference: record.providerReference,
      idempotencyKey: record.idempotencyKey,
      status: record.status,
      observedAt: record.observedAt,
    };
  }

  async reconcile(
    input: PayoutProviderReconciliationInput,
  ): Promise<PayoutProviderReconciliationResult> {
    const status = await this.getStatus(input);
    const reconciledAt = input.reconciledAt;
    const record: ProviderRecord = {
      ...status,
      observedAt: reconciledAt,
      status: this.reconciliationStatus,
    };
    this.records.set(input.idempotencyKey, record);
    return {
      ...status,
      status: this.reconciliationStatus,
      observedAt: reconciledAt,
      reconciledAt,
    };
  }
}

export class ManualPayoutProvider implements PayoutProvider {
  readonly providerName = 'manual' as const;
  private readonly records = new Map<string, ProviderRecord>();

  async submit(input: PayoutProviderSubmission): Promise<PayoutProviderSubmissionResult> {
    const existing = this.records.get(input.idempotencyKey);
    if (existing) {
      return {
        provider: this.providerName,
        providerReference: existing.providerReference,
        idempotencyKey: existing.idempotencyKey,
        status: existing.status,
        submittedAt: existing.observedAt,
      };
    }

    const submittedAt = new Date();
    const record = {
      providerReference: providerReference(input),
      idempotencyKey: input.idempotencyKey,
      status: 'pending' as const,
      observedAt: submittedAt,
    };
    this.records.set(input.idempotencyKey, record);
    return {
      provider: this.providerName,
      providerReference: record.providerReference,
      idempotencyKey: record.idempotencyKey,
      status: record.status,
      submittedAt,
    };
  }

  async getStatus(input: {
    providerReference: string;
    idempotencyKey: string;
  }): Promise<PayoutProviderStatusResult> {
    const record = this.records.get(input.idempotencyKey);
    if (record && record.providerReference !== input.providerReference) {
      throw new Error('Manual payout provider reference does not match the idempotency key.');
    }
    const observedAt = record?.observedAt ?? new Date();
    return {
      provider: this.providerName,
      providerReference: input.providerReference,
      idempotencyKey: input.idempotencyKey,
      status: record?.status ?? 'pending',
      observedAt,
    };
  }

  async reconcile(
    input: PayoutProviderReconciliationInput,
  ): Promise<PayoutProviderReconciliationResult> {
    if (!input.manualOutcome) {
      throw new Error('Manual payout reconciliation requires an operator outcome.');
    }
    const status = await this.getStatus(input);
    const record: ProviderRecord = {
      providerReference: status.providerReference,
      idempotencyKey: status.idempotencyKey,
      status: input.manualOutcome,
      observedAt: input.reconciledAt,
    };
    this.records.set(input.idempotencyKey, record);
    return {
      provider: this.providerName,
      providerReference: record.providerReference,
      idempotencyKey: record.idempotencyKey,
      status: record.status,
      observedAt: record.observedAt,
      reconciledAt: input.reconciledAt,
    };
  }
}
