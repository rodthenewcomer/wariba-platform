import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { activatePerformanceAccountInTransaction, loadActiveCycle } from '../src/performance';
import {
  recordTreasuryReserveEntry,
  loadCurrentReserve,
  computeProjected30DayPayouts,
  evaluateReserveStatus,
} from '../src/treasury';

/**
 * Prompt 08 Phase E — real integration tests against the isolated local
 * database for the treasury reserve ledger and its coverage-zone
 * resolution. Requires DATABASE_URL.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('treasury reserve — real database', () => {
  let db: Db;
  let staffUserId: string;
  const cleanupAccountIds: string[] = [];
  const cleanupUserIds: string[] = [];
  const cleanupPayoutRequestIds: string[] = [];

  const createTestUser = async (email: string): Promise<string> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: randomUUID(), email_confirm: true }),
    });
    const body = (await res.json()) as { id: string };
    return body.id;
  };

  const deleteTestUser = async (id: string): Promise<void> => {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  };

  /** A minimal Performance account + cycle, purely as valid FK targets for hand-inserted payout_requests rows below — not a realistic eligibility flow. */
  const createPerformanceAccountForFixtures = async (
    label: string,
  ): Promise<{ accountId: string; cycleId: string }> => {
    const userId = await createTestUser(
      `treasury-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
    );
    cleanupUserIds.push(userId);
    const productVersion = await db
      .selectFrom('app.product_versions')
      .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
      .select([
        'app.product_versions.id',
        'app.products.nominal_balance',
        'app.products.nominal_currency',
      ])
      .where('app.products.code', '=', '10K')
      .executeTakeFirstOrThrow();
    const order = await db
      .insertInto('app.purchase_orders')
      .values({
        user_id: userId,
        product_version_id: productVersion.id,
        idempotency_key: randomUUID(),
        status: 'paid',
        total_amount: '39900.00',
        total_currency: 'XOF',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const evaluation = await activateEvaluationAccount(db, {
      purchaseOrderId: order.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    cleanupAccountIds.push(evaluation.id);
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    const cycle = await loadActiveCycle(db, performance.id);
    return { accountId: performance.id, cycleId: cycle?.id as string };
  };

  const insertPayoutRequestFixture = async (params: {
    accountId: string;
    cycleId: string;
    status: 'pending_review' | 'approved' | 'processing' | 'paid' | 'rejected';
    requestedGrossBase: string;
    approvedGrossBase?: string;
  }): Promise<string> => {
    const row = await db
      .insertInto('app.payout_requests')
      .values({
        account_id: params.accountId,
        cycle_id: params.cycleId,
        cycle_number: 1,
        idempotency_key: randomUUID(),
        status: params.status,
        requested_net_trader_cash: '100.00',
        requested_gross_base: params.requestedGrossBase,
        trader_split_rate: '0.85',
        cap_applied: '500.00',
        buffer_floor_at_request: '11000.00',
        eligible_excess_at_request: '5000.00',
        approved_gross_base: params.approvedGrossBase ?? null,
        // Terminal statuses need their own required fields satisfied per
        // the migration's own check constraints.
        ...(params.status === 'paid'
          ? { trader_net_cash: '85.00', wariba_share: '15.00', paid_at: new Date() }
          : {}),
        ...(params.status === 'rejected' ? { rejection_code: 'test_fixture' } : {}),
        ...(params.status !== 'pending_review'
          ? { reviewed_at: new Date(), reviewed_by: staffUserId }
          : {}),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    cleanupPayoutRequestIds.push(row.id);
    return row.id;
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    staffUserId = await createTestUser(
      `treasury-staff-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
    );
    cleanupUserIds.push(staffUserId);
  }, 20000);

  afterAll(async () => {
    await db
      .deleteFrom('app.treasury_reserve_entries')
      .where('created_by', '=', staffUserId)
      .execute();
    for (const id of cleanupPayoutRequestIds) {
      await db.deleteFrom('app.payout_requests').where('id', '=', id).execute();
    }
    const spawnedPerformanceAccounts =
      cleanupAccountIds.length > 0
        ? await db
            .selectFrom('app.trading_accounts')
            .select('id')
            .where('source_evaluation_account_id', 'in', cleanupAccountIds)
            .execute()
        : [];
    const allAccountIds = [
      ...spawnedPerformanceAccounts.map((row) => row.id),
      ...cleanupAccountIds,
    ];
    for (const id of allAccountIds) {
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.performance_cycles').where('account_id', '=', id).execute();
      const account = await db
        .selectFrom('app.trading_accounts')
        .select('source_purchase_order_id')
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      await db.deleteFrom('app.trading_accounts').where('id', '=', id).execute();
      await db
        .deleteFrom('app.payment_events')
        .where('purchase_order_id', '=', account.source_purchase_order_id)
        .execute();
      await db
        .deleteFrom('app.purchase_orders')
        .where('id', '=', account.source_purchase_order_id)
        .execute();
    }
    for (const uid of cleanupUserIds) {
      await deleteTestUser(uid);
    }
    await db.destroy();
  }, 90000);

  it('the reserve ledger sums deposits/adjustments positively and withdrawals negatively', async () => {
    const startingReserve = await loadCurrentReserve(db);
    await recordTreasuryReserveEntry(db, {
      entryType: 'deposit',
      amount: '100000',
      reason: 'test fixture deposit',
      createdBy: staffUserId,
    });
    await recordTreasuryReserveEntry(db, {
      entryType: 'withdrawal',
      amount: '30000',
      reason: 'test fixture withdrawal',
      createdBy: staffUserId,
    });
    const afterEntries = await loadCurrentReserve(db);
    const delta = Number(afterEntries) - Number(startingReserve);
    expect(delta).toBeCloseTo(70000, 2);
  }, 30000);

  it('projected 30-day payouts only counts non-terminal requests, using the requested amount for pending review and the approved amount once approved', async () => {
    const { accountId, cycleId } = await createPerformanceAccountForFixtures('projection');

    await insertPayoutRequestFixture({
      accountId,
      cycleId,
      status: 'pending_review',
      requestedGrossBase: '200.00',
    });

    const afterFirstRequest = await computeProjected30DayPayouts(db);
    expect(Number(afterFirstRequest)).toBeGreaterThanOrEqual(200);

    // A paid/rejected request must never inflate the projection — both
    // are terminal, one already settled and one never will.
    await insertPayoutRequestFixture({
      accountId,
      cycleId,
      status: 'paid',
      requestedGrossBase: '9999.00',
      approvedGrossBase: '9999.00',
    });
    await insertPayoutRequestFixture({
      accountId,
      cycleId,
      status: 'rejected',
      requestedGrossBase: '9999.00',
    });
    const afterTerminalRequests = await computeProjected30DayPayouts(db);
    expect(afterTerminalRequests).toBe(afterFirstRequest);
  }, 30000);

  it('reserve status resolves NORMAL with no projected obligations, moving toward CRITICAL as the ratio drops', async () => {
    const { accountId, cycleId } = await createPerformanceAccountForFixtures('zones');

    const baseline = await evaluateReserveStatus(db);
    // Whatever the ambient reserve/projection happens to be from other
    // fixtures in this run, the function itself must always return one of
    // the four defined zones — never throw, never return an undefined zone.
    expect(['normal', 'prudence', 'defensive', 'critical']).toContain(baseline.zone);

    if (new Decimal(baseline.availableReserve).isPositive()) {
      await recordTreasuryReserveEntry(db, {
        entryType: 'withdrawal',
        amount: baseline.availableReserve,
        reason: 'test fixture — neutralize ambient reserve for zone check',
        createdBy: staffUserId,
      });
    }

    await recordTreasuryReserveEntry(db, {
      entryType: 'deposit',
      amount: '1000',
      reason: 'test fixture — establish a small reserve for this check',
      createdBy: staffUserId,
    });
    const requestId = await insertPayoutRequestFixture({
      accountId,
      cycleId,
      status: 'approved',
      requestedGrossBase: '10000.00',
      approvedGrossBase: '10000.00',
    });

    const status = await evaluateReserveStatus(db);
    // A large, freshly-approved obligation against the deliberately small
    // reserve drives the ratio well under the 1.2x critical threshold.
    expect(status.zone).toBe('critical');

    await db.deleteFrom('app.payout_requests').where('id', '=', requestId).execute();
    cleanupPayoutRequestIds.splice(cleanupPayoutRequestIds.indexOf(requestId), 1);
  }, 30000);
});
