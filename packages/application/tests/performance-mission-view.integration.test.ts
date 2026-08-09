import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  activateEvaluationAccount,
  activatePerformanceAccountInTransaction,
  createDbClient,
  type Db,
} from '@wariba/database';
import { buildAccountPerformanceMissionView } from '../src/index';

/**
 * Prompt 08 Phase H — real integration tests against the live hosted
 * database for buildAccountPerformanceMissionView (Phase F), the
 * WARIBA_PERFORMANCE sibling of buildAccountMissionView's own tests in
 * hub-read-models.integration.test.ts. Requires DATABASE_URL (via
 * .env.local, gitignored). Reuses the direct-activation fixture pattern
 * from packages/database/tests/performance.integration.test.ts — this file
 * is about the view-builder's own mapping, not the cycle math it composes
 * (already covered there).
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('buildAccountPerformanceMissionView — real database', () => {
  let db: Db;
  const cleanupAccountIds: string[] = [];
  const cleanupUserIds: string[] = [];

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

  const createEvaluationAccount = async (
    label: string,
  ): Promise<{ userId: string; accountId: string; nominalBalance: string; currency: string }> => {
    const userId = await createTestUser(
      `perfmv-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
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
    const account = await activateEvaluationAccount(db, {
      purchaseOrderId: order.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    cleanupAccountIds.push(account.id);
    return {
      userId,
      accountId: account.id,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    };
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 15000);

  afterAll(async () => {
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
      await db.deleteFrom('app.trade_orders').where('account_id', '=', id).execute();
      await db.deleteFrom('app.positions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', id).execute();
      await db.deleteFrom('app.risk_violations').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.performance_cycles').where('account_id', '=', id).execute();
      await db.deleteFrom('app.performance_review_cases').where('account_id', '=', id).execute();
      await db.deleteFrom('app.payout_requests').where('account_id', '=', id).execute();
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
  }, 60000);

  it('a freshly activated account: buffer/days/consistency all unmet, not payout-eligible, no next action', async () => {
    const evaluation = await createEvaluationAccount('fresh');
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.accountId,
      userId: evaluation.userId,
      nominalBalance: evaluation.nominalBalance,
      currency: evaluation.currency,
    });

    const view = await buildAccountPerformanceMissionView(db, { accountId: performance.id });
    if (!view.available) throw new Error('expected an available view for a real active cycle');

    expect(view.variant).toBe('performance');
    expect(view.cycleNumber).toBe(1);
    // Not 0: realizedBalance starts at the account's nominal balance (not
    // zero), and the buffer floor is only nominalBalance * 1.10 (permanent
    // buffer rate 0.10) — a fresh account is already ~90.9% of the way to
    // the floor before a single trade, independent of account size.
    expect(view.progressPercent).toBe(91);
    expect(view.conditions).toHaveLength(3);
    expect(view.conditions.every((c) => c.met === false)).toBe(true);
    expect(view.payoutEligible).toBe(false);
    expect(view.blockingSummary).not.toBeNull();
    expect(view.nextAction).toBeNull();
    expect(view.state).toBe('active');
    expect(view.recentPayouts).toEqual([]);
  }, 30000);

  it('an account with no performance cycle at all returns available: false instead of throwing', async () => {
    const evaluation = await createEvaluationAccount('nocycle');
    // Deliberately not activated as Performance (no activatePerformanceAccountInTransaction
    // call, so app.performance_cycles has zero rows for it) — flipping just
    // program_type is enough since evaluateCycleProgress's loadActiveCycle
    // check runs before it ever loads/validates the policy.
    await db
      .updateTable('app.trading_accounts')
      .set({ program_type: 'WARIBA_PERFORMANCE' })
      .where('id', '=', evaluation.accountId)
      .execute();

    const view = await buildAccountPerformanceMissionView(db, {
      accountId: evaluation.accountId,
    });
    expect(view.available).toBe(false);
  }, 30000);
});
