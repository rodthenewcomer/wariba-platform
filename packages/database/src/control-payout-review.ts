import { sql } from 'kysely';
import type { Db } from './client';
import type { PayoutProviderStatus, PayoutRequestStatus } from './schema';

/**
 * Prompt 09 milestone 4 — the payout review surface.
 *
 * This adds searching, paging and evidence around the payout engine. It
 * computes no payout arithmetic: every monetary figure here is read back
 * from what the engine already persisted — the approval snapshot, the
 * approved amounts, the ledger debit, the reversal entry. Recomputing
 * eligibility for display would create a second answer that could disagree
 * with the authoritative one, which in a payout review is the one thing an
 * operator must never see.
 *
 * Read-only. The existing Server Actions remain the only write path, each
 * on its own finance/compliance authority.
 */
export type PayoutDetailSection = 'payout' | 'audit_evidence' | 'reconciliation_evidence';

export interface ControlPayoutFilters {
  /** Narrowed to the real column unions so an unknown value cannot reach SQL. */
  status?: PayoutRequestStatus;
  /** Matches the account public id or the trader's name. */
  query?: string;
  cycleNumber?: number;
  nominalBalance?: string;
  kycVerified?: boolean;
  payoutMethodConfigured?: boolean;
  providerStatus?: PayoutProviderStatus;
  requestedFrom?: Date;
  requestedTo?: Date;
}

export interface ControlPayoutRow {
  id: string;
  accountId: string;
  accountPublicId: string;
  nominalBalance: string;
  traderFirstName: string | null;
  traderLastName: string | null;
  cycleNumber: number;
  status: string;
  requestedNetTraderCash: string;
  capApplied: string;
  traderSplitRate: string;
  approvedGrossBase: string | null;
  traderNetCash: string | null;
  waribaShare: string | null;
  provider: string | null;
  providerStatus: string | null;
  kycVerified: boolean;
  payoutMethodConfigured: boolean;
  integrityHold: boolean;
  requestedAt: Date;
  reversedAt: Date | null;
}

export interface ControlPayoutPage {
  payouts: readonly ControlPayoutRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const CONTROL_PAYOUTS_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function searchControlPayouts(
  db: Db,
  params: { filters?: ControlPayoutFilters; page?: number; pageSize?: number } = {},
): Promise<ControlPayoutPage> {
  const filters = params.filters ?? {};
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? CONTROL_PAYOUTS_PAGE_SIZE),
  );

  let base = db
    .selectFrom('app.payout_requests')
    .innerJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.payout_requests.account_id')
    .leftJoin('app.user_profiles', 'app.user_profiles.user_id', 'app.trading_accounts.user_id');

  const trimmed = filters.query?.trim();
  if (trimmed) {
    // Escaped: a `%` in the search box means that character, not everything.
    const pattern = `%${trimmed.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    base = base.where((eb) =>
      eb.or([
        eb('app.trading_accounts.public_id', 'ilike', pattern),
        eb(sql<string>`coalesce(${eb.ref('app.user_profiles.first_name')}, '')`, 'ilike', pattern),
        eb(sql<string>`coalesce(${eb.ref('app.user_profiles.last_name')}, '')`, 'ilike', pattern),
      ]),
    );
  }
  if (filters.status) base = base.where('app.payout_requests.status', '=', filters.status);
  if (filters.cycleNumber !== undefined) {
    base = base.where('app.payout_requests.cycle_number', '=', filters.cycleNumber);
  }
  if (filters.nominalBalance) {
    base = base.where('app.trading_accounts.nominal_balance', '=', filters.nominalBalance);
  }
  if (filters.kycVerified !== undefined) {
    base = base.where('app.trading_accounts.kyc_sandbox_verified', '=', filters.kycVerified);
  }
  if (filters.payoutMethodConfigured !== undefined) {
    base = base.where(
      'app.trading_accounts.payout_method_sandbox_configured',
      '=',
      filters.payoutMethodConfigured,
    );
  }
  if (filters.providerStatus) {
    base = base.where('app.payout_requests.provider_status', '=', filters.providerStatus);
  }
  if (filters.requestedFrom) {
    base = base.where('app.payout_requests.requested_at', '>=', filters.requestedFrom);
  }
  if (filters.requestedTo) {
    base = base.where('app.payout_requests.requested_at', '<=', filters.requestedTo);
  }

  const [rows, totals] = await Promise.all([
    base
      .select([
        'app.payout_requests.id',
        'app.payout_requests.account_id',
        'app.trading_accounts.public_id',
        'app.trading_accounts.nominal_balance',
        'app.user_profiles.first_name',
        'app.user_profiles.last_name',
        'app.payout_requests.cycle_number',
        'app.payout_requests.status',
        'app.payout_requests.requested_net_trader_cash',
        'app.payout_requests.cap_applied',
        'app.payout_requests.trader_split_rate',
        'app.payout_requests.approved_gross_base',
        'app.payout_requests.trader_net_cash',
        'app.payout_requests.wariba_share',
        'app.payout_requests.provider',
        'app.payout_requests.provider_status',
        'app.trading_accounts.kyc_sandbox_verified',
        'app.trading_accounts.payout_method_sandbox_configured',
        'app.trading_accounts.integrity_hold',
        'app.payout_requests.requested_at',
        'app.payout_requests.reversed_at',
      ])
      .orderBy('app.payout_requests.requested_at', 'desc')
      .orderBy('app.payout_requests.id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute(),
    base.select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
  ]);

  return {
    payouts: rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      accountPublicId: row.public_id,
      nominalBalance: row.nominal_balance,
      traderFirstName: row.first_name,
      traderLastName: row.last_name,
      cycleNumber: row.cycle_number,
      status: row.status,
      requestedNetTraderCash: row.requested_net_trader_cash,
      capApplied: row.cap_applied,
      traderSplitRate: row.trader_split_rate,
      approvedGrossBase: row.approved_gross_base,
      traderNetCash: row.trader_net_cash,
      waribaShare: row.wariba_share,
      provider: row.provider,
      providerStatus: row.provider_status,
      kycVerified: row.kyc_sandbox_verified,
      payoutMethodConfigured: row.payout_method_sandbox_configured,
      integrityHold: row.integrity_hold,
      requestedAt: row.requested_at,
      reversedAt: row.reversed_at,
    })),
    total: Number(totals?.count ?? 0),
    page,
    pageSize,
  };
}

export interface PayoutLifecycleEvent {
  stage: string;
  at: Date;
  actor: string | null;
  detail: string | null;
}

export interface ControlPayoutDetail {
  request: {
    id: string;
    accountId: string;
    accountPublicId: string;
    cycleNumber: number;
    status: string;
    requestedNetTraderCash: string;
    requestedGrossBase: string;
    currency: string;
    requestedAt: Date;
    calculationTimestamp: Date | null;
  };
  /** The immutable snapshot the engine wrote at request time. Never recomputed. */
  eligibilitySnapshot: unknown;
  approval: {
    capApplied: string;
    traderSplitRate: string;
    bufferFloorAtRequest: string;
    eligibleExcessAtRequest: string;
    approvedGrossBase: string | null;
    traderNetCash: string | null;
    waribaShare: string | null;
    rejectionCode: string | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
  };
  gates: {
    kycVerified: boolean;
    payoutMethodConfigured: boolean;
    integrityHold: boolean;
    integrityHoldReason: string | null;
    /** payout_pending on the cycle is what freezes new exposure. */
    payoutFreezeActive: boolean;
    cycleStatus: string | null;
  };
  provider: {
    provider: string | null;
    providerReference: string | null;
    providerStatus: string | null;
    providerIdempotencyKey: string | null;
    submittedAt: Date | null;
    reconciledAt: Date | null;
    reconciledBy: string | null;
    submissionResult: unknown;
    reconciliationResult: unknown;
  };
  reversal: {
    reversedAt: Date | null;
    reversedBy: string | null;
    reversalReason: string | null;
    reversalEvidence: unknown;
    reversalLedgerEntryId: string | null;
  };
  lifecycle: readonly PayoutLifecycleEvent[];
  /** Ledger entries the engine wrote for this payout — debit and any reversal. */
  ledgerEntries: readonly {
    id: string;
    entryType: string;
    amount: string;
    reversalOf: string | null;
    occurredAt: Date;
  }[];
  auditEvidence?: {
    events: readonly {
      id: string;
      action: string;
      role: string | null;
      reason: string | null;
      correlationId: string | null;
      occurredAt: Date;
    }[];
  };
  reconciliationEvidence?: {
    runs: readonly {
      id: string;
      status: string;
      storedAccountBalance: string;
      reconstructedAccountBalance: string;
      executedAt: Date;
    }[];
  };
}

export async function loadControlPayoutDetail(
  db: Db,
  params: { payoutRequestId: string; sections: ReadonlySet<PayoutDetailSection> },
): Promise<ControlPayoutDetail | null> {
  const { payoutRequestId, sections } = params;
  if (!sections.has('payout')) return null;

  const row = await db
    .selectFrom('app.payout_requests')
    .innerJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.payout_requests.account_id')
    .leftJoin('app.performance_cycles', 'app.performance_cycles.id', 'app.payout_requests.cycle_id')
    .selectAll('app.payout_requests')
    .select([
      'app.trading_accounts.public_id',
      'app.trading_accounts.kyc_sandbox_verified',
      'app.trading_accounts.payout_method_sandbox_configured',
      'app.trading_accounts.integrity_hold',
      'app.trading_accounts.integrity_hold_reason',
      'app.performance_cycles.status as cycle_status',
    ])
    .where('app.payout_requests.id', '=', payoutRequestId)
    .executeTakeFirst();
  if (!row) return null;

  const ledgerEntries = await db
    .selectFrom('app.trading_ledger_entries')
    .select(['id', 'entry_type', 'amount', 'reversal_of', 'occurred_at'])
    .where('reference_id', '=', payoutRequestId)
    .orderBy('occurred_at', 'asc')
    .execute();

  // Assembled from persisted timestamps only — no stage is inferred.
  const lifecycle: PayoutLifecycleEvent[] = [
    { stage: 'requested', at: row.requested_at, actor: null, detail: null },
  ];
  if (row.reviewed_at) {
    lifecycle.push({
      stage: row.status === 'rejected' ? 'rejected' : 'approved',
      at: row.reviewed_at,
      actor: row.reviewed_by,
      detail: row.rejection_code,
    });
  }
  if (row.provider_submitted_at) {
    lifecycle.push({
      stage: 'submitted_to_provider',
      at: row.provider_submitted_at,
      actor: null,
      detail: row.provider_reference,
    });
  }
  if (row.provider_reconciled_at) {
    lifecycle.push({
      stage: 'provider_reconciled',
      at: row.provider_reconciled_at,
      actor: row.provider_reconciled_by,
      detail: row.provider_status,
    });
  }
  if (row.paid_at) {
    lifecycle.push({ stage: 'paid', at: row.paid_at, actor: null, detail: null });
  }
  if (row.reversed_at) {
    lifecycle.push({
      stage: 'reversed',
      at: row.reversed_at,
      actor: row.reversed_by,
      detail: row.reversal_reason,
    });
  }

  const detail: ControlPayoutDetail = {
    request: {
      id: row.id,
      accountId: row.account_id,
      accountPublicId: row.public_id,
      cycleNumber: row.cycle_number,
      status: row.status,
      requestedNetTraderCash: row.requested_net_trader_cash,
      requestedGrossBase: row.requested_gross_base,
      currency: row.currency,
      requestedAt: row.requested_at,
      calculationTimestamp: row.calculation_timestamp,
    },
    eligibilitySnapshot: row.eligibility_snapshot,
    approval: {
      capApplied: row.cap_applied,
      traderSplitRate: row.trader_split_rate,
      bufferFloorAtRequest: row.buffer_floor_at_request,
      eligibleExcessAtRequest: row.eligible_excess_at_request,
      approvedGrossBase: row.approved_gross_base,
      traderNetCash: row.trader_net_cash,
      waribaShare: row.wariba_share,
      rejectionCode: row.rejection_code,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
    },
    gates: {
      kycVerified: row.kyc_sandbox_verified,
      payoutMethodConfigured: row.payout_method_sandbox_configured,
      integrityHold: row.integrity_hold,
      integrityHoldReason: row.integrity_hold_reason,
      payoutFreezeActive: row.cycle_status === 'payout_pending',
      cycleStatus: row.cycle_status,
    },
    provider: {
      provider: row.provider,
      providerReference: row.provider_reference,
      providerStatus: row.provider_status,
      providerIdempotencyKey: row.provider_idempotency_key,
      submittedAt: row.provider_submitted_at,
      reconciledAt: row.provider_reconciled_at,
      reconciledBy: row.provider_reconciled_by,
      submissionResult: row.provider_submission_result,
      reconciliationResult: row.provider_reconciliation_result,
    },
    reversal: {
      reversedAt: row.reversed_at,
      reversedBy: row.reversed_by,
      reversalReason: row.reversal_reason,
      reversalEvidence: row.reversal_evidence,
      reversalLedgerEntryId: row.reversal_ledger_entry_id,
    },
    lifecycle,
    ledgerEntries: ledgerEntries.map((entry) => ({
      id: entry.id,
      entryType: entry.entry_type,
      amount: entry.amount,
      reversalOf: entry.reversal_of,
      occurredAt: entry.occurred_at,
    })),
  };

  // Cross-domain evidence keeps its own authority: a link from a payout is
  // never a bridge into audit or reconciliation.
  if (sections.has('audit_evidence')) {
    const events = await db
      .selectFrom('audit.audit_events')
      .select(['id', 'action', 'role', 'reason', 'correlation_id', 'occurred_at'])
      .where('target_id', '=', payoutRequestId)
      .orderBy('occurred_at', 'desc')
      .limit(25)
      .execute();
    detail.auditEvidence = {
      events: events.map((event) => ({
        id: event.id,
        action: event.action,
        role: event.role,
        reason: event.reason,
        correlationId: event.correlation_id,
        occurredAt: event.occurred_at,
      })),
    };
  }

  if (sections.has('reconciliation_evidence')) {
    const runs = await db
      .selectFrom('app.account_reconciliation_runs')
      .select([
        'id',
        'status',
        'stored_account_balance',
        'reconstructed_account_balance',
        'executed_at',
      ])
      .where('account_id', '=', row.account_id)
      .orderBy('executed_at', 'desc')
      .limit(10)
      .execute();
    detail.reconciliationEvidence = {
      runs: runs.map((run) => ({
        id: run.id,
        status: run.status,
        storedAccountBalance: run.stored_account_balance,
        reconstructedAccountBalance: run.reconstructed_account_balance,
        executedAt: run.executed_at,
      })),
    };
  }

  return detail;
}
