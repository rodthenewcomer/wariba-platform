import { sql } from 'kysely';
import type { Db } from './client';
import { evaluateReserveStatus, type ReserveStatus } from './treasury';

/**
 * Prompt 09 milestone 4 — Treasury operator visibility.
 *
 * The reserve engine is untouched: coverage ratio and zone come from
 * `evaluateReserveStatus`, never recomputed here. A second reserve-zone
 * calculator in Control could disagree with the one that actually gates
 * commercial behaviour, and the operator would have no way to tell which
 * was binding.
 *
 * On composition, the honest answer is that the model has one bucket.
 * `app.treasury_reserve_entries` records deposits, withdrawals and
 * adjustments against the payout reserve — there is no operating-funds,
 * tax-separated or unsettled-funds category in the schema. Rather than
 * invent those buckets and render zeroes that look like real balances,
 * this reports what exists and names what does not.
 *
 * The three concepts kept deliberately apart:
 *
 * - **Reserve** — real cash WARIBA holds, summed from ledgered entries.
 * - **Projected liability** — what the engine expects to pay out over the
 *   next 30 days. Not cash, and not deducted from reserve.
 * - **Simulated trader balances** — nominal balances on sandbox accounts.
 *   Not WARIBA money at all, and reported separately precisely so it can
 *   never be mistaken for one.
 */
export type TreasuryBucket = 'payout_reserve';

export interface TreasuryComposition {
  bucket: TreasuryBucket;
  label: string;
  amount: string;
  deposits: string;
  withdrawals: string;
  adjustments: string;
}

export interface TreasuryHistoryEntry {
  id: string;
  entryType: string;
  amount: string;
  currency: string;
  reason: string;
  createdBy: string | null;
  occurredAt: Date;
}

export interface TreasuryLiabilities {
  /** From the canonical engine — a projection, never treated as cash. */
  projectedPayoutsNext30Days: string;
  /** Approved-but-unsettled payouts: a known, already-committed obligation. */
  committedUnsettledPayouts: string;
  openPayoutRequestCount: number;
}

export interface TreasuryNonReserve {
  /**
   * Sum of nominal balances on active simulated accounts. Reported so an
   * operator can see it is excluded — it is not WARIBA cash and is never
   * added to any reserve total.
   */
  simulatedTraderNominal: string;
  simulatedAccountCount: number;
}

export interface TreasuryCockpit {
  status: ReserveStatus;
  composition: readonly TreasuryComposition[];
  /** Buckets the data model does not represent, named rather than faked. */
  unrepresentedBuckets: readonly string[];
  liabilities: TreasuryLiabilities;
  nonReserve: TreasuryNonReserve;
  history: readonly TreasuryHistoryEntry[];
  openReserveAlerts: readonly {
    incidentCode: string;
    severity: string;
    openedAt: Date;
    evidence: unknown;
  }[];
  calculatedAt: Date;
}

const NON_TERMINAL_PAYOUT_STATUSES = ['approved', 'processing'] as const;
const RESERVE_ALERT_CODES = ['TREASURY_RESERVE_PRUDENCE', 'TREASURY_RESERVE_DEFENSIVE'] as const;

export async function loadTreasuryCockpit(db: Db, historyLimit = 50): Promise<TreasuryCockpit> {
  const [status, buckets, history, committed, simulated, alerts, now] = await Promise.all([
    // Canonical engine output — coverage ratio and zone are not recomputed.
    evaluateReserveStatus(db),
    db
      .selectFrom('app.treasury_reserve_entries')
      .select((eb) => [
        sql<string>`coalesce(sum(amount) filter (where entry_type = 'deposit'), 0)`.as('deposits'),
        sql<string>`coalesce(sum(amount) filter (where entry_type = 'withdrawal'), 0)`.as(
          'withdrawals',
        ),
        sql<string>`coalesce(sum(amount) filter (where entry_type = 'adjustment'), 0)`.as(
          'adjustments',
        ),
        eb.fn.countAll().as('count'),
      ])
      .executeTakeFirst(),
    db
      .selectFrom('app.treasury_reserve_entries')
      .select(['id', 'entry_type', 'amount', 'currency', 'reason', 'created_by', 'occurred_at'])
      .orderBy('occurred_at', 'desc')
      .limit(historyLimit)
      .execute(),
    db
      .selectFrom('app.payout_requests')
      .select((eb) => [
        sql<string>`coalesce(sum(coalesce(approved_gross_base, requested_gross_base)), 0)`.as(
          'committed',
        ),
        eb.fn.countAll().as('count'),
      ])
      .where('status', 'in', [...NON_TERMINAL_PAYOUT_STATUSES])
      .executeTakeFirst(),
    db
      .selectFrom('app.trading_accounts')
      .select((eb) => [
        sql<string>`coalesce(sum(nominal_balance), 0)`.as('nominal'),
        eb.fn.countAll().as('count'),
      ])
      .where('status', '=', 'active')
      .executeTakeFirst(),
    db
      .selectFrom('app.operations_incidents')
      .select(['incident_code', 'severity', 'opened_at', 'evidence'])
      .where('status', '=', 'open')
      .where('incident_code', 'in', [...RESERVE_ALERT_CODES])
      .orderBy('opened_at', 'desc')
      .execute(),
    db.selectNoFrom((eb) => eb.fn<Date>('now').as('now')).executeTakeFirstOrThrow(),
  ]);

  return {
    status,
    composition: [
      {
        bucket: 'payout_reserve',
        label: 'Réserve de payout',
        amount: status.availableReserve,
        deposits: buckets?.deposits ?? '0',
        withdrawals: buckets?.withdrawals ?? '0',
        adjustments: buckets?.adjustments ?? '0',
      },
    ],
    // Named explicitly so their absence reads as "not modelled" rather than
    // "zero balance".
    unrepresentedBuckets: ['Fonds opérationnels', 'Fonds séparés fiscalement', 'Fonds non réglés'],
    liabilities: {
      projectedPayoutsNext30Days: status.projectedPayoutsNext30Days,
      committedUnsettledPayouts: committed?.committed ?? '0',
      openPayoutRequestCount: Number(committed?.count ?? 0),
    },
    nonReserve: {
      simulatedTraderNominal: simulated?.nominal ?? '0',
      simulatedAccountCount: Number(simulated?.count ?? 0),
    },
    history: history.map((entry) => ({
      id: entry.id,
      entryType: entry.entry_type,
      amount: entry.amount,
      currency: entry.currency,
      reason: entry.reason,
      createdBy: entry.created_by,
      occurredAt: entry.occurred_at,
    })),
    openReserveAlerts: alerts.map((alert) => ({
      incidentCode: alert.incident_code,
      severity: alert.severity,
      openedAt: alert.opened_at,
      evidence: alert.evidence,
    })),
    calculatedAt: now.now,
  };
}
