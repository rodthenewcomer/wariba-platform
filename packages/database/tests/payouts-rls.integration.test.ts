import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { activatePerformanceAccountInTransaction, loadActiveCycle } from '../src/performance';
import { acknowledgePerformanceRules } from '../src/performance-onboarding';

/**
 * Appendix 08-A — payout row-level-security regression.
 *
 * The acceptance audit observed that payout data is currently unreachable
 * from the browser for a structural reason rather than a policy reason:
 * `app.payout_requests` has RLS enabled *and* no grant at all to
 * `authenticated`/`anon`. That is stricter than a policy, but it is also
 * invisible — a future migration that adds a well-meaning `grant select`
 * would silently expose every trader's payout history with no policy to
 * constrain it, and no test would fail.
 *
 * This file pins the observable guarantee (trader A can never read trader
 * B's payout row, nobody can write one from a browser, anon sees nothing)
 * so that such a migration breaks here first. It deliberately asserts the
 * *outcome* rather than the mechanism, so replacing the no-grant posture
 * with real owner-scoped policies later keeps these tests meaningful.
 *
 * Same SET LOCAL ROLE + request.jwt.claims technique as the other RLS
 * suites — see trading-rls.integration.test.ts for why.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

async function asRole<T>(
  db: Db,
  role: 'authenticated' | 'anon',
  userId: string | null,
  fn: (trx: Db) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('role', ${role}, true)`.execute(trx);
    if (userId) {
      const claims = JSON.stringify({ sub: userId, role });
      await sql`select set_config('request.jwt.claims', ${claims}, true)`.execute(trx);
    }
    return fn(trx);
  });
}

describeIfDb('payout requests — row level security (real database)', () => {
  let db: Db;
  let userA: string;
  let userB: string;
  let payoutA: string;
  let payoutB: string;
  let acknowledgementA: string;
  let acknowledgementB: string;
  const cleanupUserIds: string[] = [];
  const cleanupAccountIds: string[] = [];

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
    const id = ((await res.json()) as { id: string }).id;
    cleanupUserIds.push(id);
    return id;
  };

  /** A performance account with one pending payout request, created server-side. */
  const createPayoutFor = async (
    userId: string,
  ): Promise<{ payoutId: string; acknowledgementId: string }> => {
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
    await db
      .updateTable('app.trading_accounts')
      .set({ status: 'passed' })
      .where('id', '=', evaluation.id)
      .execute();
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.id,
    });
    cleanupAccountIds.push(performance.id);
    const acknowledgement = await acknowledgePerformanceRules(db, {
      userId,
      accountId: performance.id,
      correlationId: randomUUID(),
      now: new Date(),
    });
    const cycle = await loadActiveCycle(db, performance.id);
    const request = await db
      .insertInto('app.payout_requests')
      .values({
        account_id: performance.id,
        cycle_id: cycle?.id as string,
        cycle_number: cycle?.cycleNumber as number,
        idempotency_key: randomUUID(),
        requested_net_trader_cash: '500.00',
        requested_gross_base: '588.24',
        trader_split_rate: '0.85',
        cap_applied: '500.00',
        buffer_floor_at_request: '11000.00',
        eligible_excess_at_request: '2688.00',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return { payoutId: request.id, acknowledgementId: acknowledgement.id };
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
    userA = await createTestUser(`payout-rls-a-${randomUUID()}@wariba-test.invalid`);
    userB = await createTestUser(`payout-rls-b-${randomUUID()}@wariba-test.invalid`);
    const fixtureA = await createPayoutFor(userA);
    const fixtureB = await createPayoutFor(userB);
    payoutA = fixtureA.payoutId;
    payoutB = fixtureB.payoutId;
    acknowledgementA = fixtureA.acknowledgementId;
    acknowledgementB = fixtureB.acknowledgementId;
  }, 60000);

  afterAll(async () => {
    for (const id of cleanupAccountIds) {
      await db.deleteFrom('app.payout_requests').where('account_id', '=', id).execute();
      await db
        .deleteFrom('app.performance_rule_acknowledgements')
        .where('account_id', '=', id)
        .execute();
      await db.deleteFrom('app.performance_cycles').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', id).execute();
    }
    for (const id of [...cleanupAccountIds].reverse()) {
      const account = await db
        .selectFrom('app.trading_accounts')
        .select('source_purchase_order_id')
        .where('id', '=', id)
        .executeTakeFirst();
      await db.deleteFrom('app.trading_accounts').where('id', '=', id).execute();
      if (account?.source_purchase_order_id) {
        await db
          .deleteFrom('app.purchase_orders')
          .where('id', '=', account.source_purchase_order_id)
          .execute();
      }
    }
    for (const id of cleanupUserIds) {
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    }
    await db.destroy();
  }, 60000);

  it('trader A cannot read trader B’s payout request', async () => {
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.payout_requests').select('id').where('id', '=', payoutB).execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('a trader cannot even read their own payout request from the browser role', async () => {
    // Payout history reaches the trader through the server (service role),
    // never through PostgREST. If this ever starts succeeding, an
    // owner-scoped policy must exist — see this file's header.
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.payout_requests').select('id').where('id', '=', payoutA).execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('an unscoped select as an authenticated trader leaks nothing', async () => {
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx.selectFrom('app.payout_requests').select('id').execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('a trader cannot INSERT a payout request', async () => {
    await expect(
      asRole(db, 'authenticated', userA, async (trx) => {
        const cycle = await db
          .selectFrom('app.payout_requests')
          .select(['account_id', 'cycle_id', 'cycle_number'])
          .where('id', '=', payoutA)
          .executeTakeFirstOrThrow();
        return trx
          .insertInto('app.payout_requests')
          .values({
            account_id: cycle.account_id,
            cycle_id: cycle.cycle_id,
            cycle_number: cycle.cycle_number,
            idempotency_key: randomUUID(),
            requested_net_trader_cash: '999.00',
            requested_gross_base: '1175.29',
            trader_split_rate: '0.85',
            cap_applied: '500.00',
            buffer_floor_at_request: '11000.00',
            eligible_excess_at_request: '2688.00',
          })
          .execute();
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it('a trader cannot UPDATE a payout request into an approved state', async () => {
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx
          .updateTable('app.payout_requests')
          .set({ status: 'approved', approved_gross_base: '588.24' })
          .where('id', '=', payoutA)
          .execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('a trader cannot DELETE a payout request', async () => {
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx.deleteFrom('app.payout_requests').where('id', '=', payoutA).execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('the anon role has no grant at all', async () => {
    await expect(
      asRole(db, 'anon', null, (trx) =>
        trx.selectFrom('app.payout_requests').select('id').execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('Performance acknowledgement evidence is unreadable and immutable from browser roles', async () => {
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx
          .selectFrom('app.performance_rule_acknowledgements')
          .select('id')
          .where('id', 'in', [acknowledgementA, acknowledgementB])
          .execute(),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(db, 'authenticated', userA, (trx) =>
        trx
          .updateTable('app.performance_rule_acknowledgements')
          .set({ source: 'performance_onboarding' })
          .where('id', '=', acknowledgementA)
          .execute(),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(db, 'anon', null, (trx) =>
        trx.selectFrom('app.performance_rule_acknowledgements').select('id').execute(),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('the authorized server path still reads both rows, proving these are real rows', async () => {
    const rows = await db
      .selectFrom('app.payout_requests')
      .select(['id', 'status'])
      .where('id', 'in', [payoutA, payoutB])
      .orderBy('id')
      .execute();
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.status).toBe('pending_review');
  });
});
