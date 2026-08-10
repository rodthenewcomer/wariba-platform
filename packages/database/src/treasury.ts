import Decimal from 'decimal.js';
import { computeReserveCoverageRatio, resolveReserveZone, type ReserveZone } from '@wariba/domain';
import type { Db } from './client';

export type TreasuryReserveEntryType = 'deposit' | 'withdrawal' | 'adjustment';

export interface RecordTreasuryReserveEntryParams {
  entryType: TreasuryReserveEntryType;
  /** Always a positive magnitude — sign is applied here from entryType, so callers never have to remember the convention. */
  amount: string;
  reason: string;
  createdBy: string;
  now?: Date;
}

/**
 * TREASURY-001 — a real, staff-entered figure (Control, Phase G): no
 * payment processor exists in this build for this to be derived from.
 * Signed the same way app.trading_ledger_entries already is (a debit-style
 * entry stores its own negative amount) — `withdrawal` is stored negative
 * here so `loadCurrentReserve`'s sum is the whole story, no per-row sign
 * logic needed at read time.
 */
export async function recordTreasuryReserveEntry(
  trx: Db,
  params: RecordTreasuryReserveEntryParams,
): Promise<void> {
  const magnitude = new Decimal(params.amount);
  if (!magnitude.isFinite() || !magnitude.greaterThan(0)) {
    throw new Error('Treasury reserve entry amount must be positive.');
  }
  if (params.reason.trim().length === 0) throw new Error('Treasury reserve reason is required.');
  const signedAmount =
    params.entryType === 'withdrawal' ? magnitude.negated().toFixed(2) : magnitude.toFixed(2);
  await trx
    .insertInto('app.treasury_reserve_entries')
    .values({
      entry_type: params.entryType,
      amount: signedAmount,
      reason: params.reason.trim(),
      created_by: params.createdBy,
      occurred_at: params.now ?? new Date(),
    })
    .execute();
}

export async function loadCurrentReserve(trx: Db): Promise<string> {
  const rows = await trx.selectFrom('app.treasury_reserve_entries').select('amount').execute();
  return rows.reduce((sum, row) => sum.plus(row.amount), new Decimal(0)).toFixed(2);
}

/**
 * Deliberately narrower than a full actuarial projection (Phase E's own
 * scenario engine handles "what might become eligible later" as a
 * separate, explicit what-if tool) — this is the concrete, already-known
 * near-term obligation: every payout request not yet paid or terminally
 * closed. pending_review/needs_information use their *requested* amount
 * (the conservative, not-yet-clamped figure — protective for reserve
 * purposes, since approval can only reduce it via the cap/excess clamp,
 * never increase it); approved/processing use the *approved* amount,
 * already known precisely.
 */
export async function computeProjected30DayPayouts(trx: Db): Promise<string> {
  const pending = await trx
    .selectFrom('app.payout_requests')
    .select('requested_gross_base')
    .where('status', 'in', ['pending_review', 'needs_information'])
    .execute();
  const approved = await trx
    .selectFrom('app.payout_requests')
    .select('approved_gross_base')
    .where('status', 'in', ['approved', 'processing'])
    .execute();
  const pendingSum = pending.reduce(
    (sum, row) => sum.plus(row.requested_gross_base),
    new Decimal(0),
  );
  const approvedSum = approved.reduce(
    (sum, row) => sum.plus(row.approved_gross_base ?? '0'),
    new Decimal(0),
  );
  return pendingSum.plus(approvedSum).toFixed(2);
}

export interface ReserveStatus {
  availableReserve: string;
  projectedPayoutsNext30Days: string;
  coverageRatio: string | null;
  zone: ReserveZone;
}

export async function evaluateReserveStatus(trx: Db): Promise<ReserveStatus> {
  const [availableReserve, projectedPayoutsNext30Days] = await Promise.all([
    loadCurrentReserve(trx),
    computeProjected30DayPayouts(trx),
  ]);
  const coverageRatio = computeReserveCoverageRatio({
    availableReserve,
    projectedPayoutsNext30Days,
  });
  return {
    availableReserve,
    projectedPayoutsNext30Days,
    coverageRatio,
    zone: resolveReserveZone(coverageRatio),
  };
}
