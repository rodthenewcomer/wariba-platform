import { randomUUID } from 'node:crypto';
import {
  acknowledgePerformanceRules,
  activateEvaluationAccount,
  activatePerformanceAccountInTransaction,
  createDbClient,
  type Db,
} from '@wariba/database';
import Decimal from 'decimal.js';
import { createAuthFixtureUser, deleteAuthFixtureUser } from './supabase-auth-fixture';

/**
 * Accounts posed in each lifecycle state, for visual and E2E audit.
 *
 * ## Why this exists
 *
 * The Hub's composition changes by lifecycle state — an evaluation, an account
 * under review and a funded one are three different pages. Without a way to
 * put an account into each state on demand, those pages can only be reviewed
 * by waiting for a real trader to reach them, which means in practice they are
 * never reviewed at all and ship broken.
 *
 * ## What it deliberately does that production must never do
 *
 * It writes `trading_accounts.status` directly, bypassing
 * `assertEvaluationAccountTransition`. That is the point: a fixture that had to
 * walk the real state machine would need a passing evaluation, a finalised
 * session and a review run to photograph one banner.
 *
 * Three things keep that from leaking into production:
 *
 * - it lives in `@wariba/test-utils`, which no application package depends on;
 * - every account it creates is owned by a synthetic user whose address ends in
 *   `@wariba-test.invalid`, a reserved TLD that can never receive mail;
 * - `deleteLifecycleFixture` removes the user and its accounts, and the
 *   Playwright fixtures call it from a `finally`.
 *
 * Most states only pose lifecycle metadata. The two target-reached evidence
 * states also write a deterministic, internally coherent 10% test history so
 * screenshots never claim "objectif atteint" beside 0% progress. Those rows
 * remain synthetic test evidence: no production package imports test-utils,
 * and no operator command can write them or decide a pass.
 */

export type LifecycleFixtureState =
  | 'no_account'
  | 'evaluation_new'
  | 'objective_reached'
  | 'under_review'
  | 'passed'
  | 'funded_preparing'
  | 'funded_active'
  | 'payout_eligible_kyc_required'
  | 'payout_ready'
  | 'breached'
  | 'soft_locked'
  | 'inactive';

export interface LifecycleFixture {
  state: LifecycleFixtureState;
  userId: string;
  email: string;
  password: string;
  /** `null` for `no_account`. */
  accountId: string | null;
  accountPublicId: string | null;
}

export interface LifecycleFixtureEnvironment {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

/** How each state is posed once the account exists. */
const POSE: Record<
  Exclude<LifecycleFixtureState, 'no_account' | 'evaluation_new'>,
  {
    status: string;
    programType?: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE';
    kycVerified?: boolean;
    payoutMethod?: boolean;
    /** Finalise today's snapshot, which is what separates review from waiting. */
    finalizeToday?: boolean;
  }
> = {
  objective_reached: { status: 'pass_pending', finalizeToday: false },
  under_review: { status: 'pass_pending', finalizeToday: true },
  passed: { status: 'passed' },
  funded_preparing: { status: 'pending_activation', programType: 'WARIBA_PERFORMANCE' },
  funded_active: { status: 'active', programType: 'WARIBA_PERFORMANCE' },
  payout_eligible_kyc_required: {
    status: 'active',
    programType: 'WARIBA_PERFORMANCE',
    kycVerified: false,
    payoutMethod: true,
  },
  payout_ready: {
    status: 'active',
    programType: 'WARIBA_PERFORMANCE',
    kycVerified: true,
    payoutMethod: true,
  },
  breached: { status: 'breached' },
  soft_locked: { status: 'soft_locked' },
  inactive: { status: 'inactive' },
};

async function seedActivatedAccount(db: Db, userId: string) {
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

  const row = await db
    .selectFrom('app.trading_accounts')
    .select('public_id')
    .where('id', '=', account.id)
    .executeTakeFirstOrThrow();

  return { id: account.id, publicId: row.public_id };
}

async function seedTargetReachedFinancialHistory(db: Db, accountId: string): Promise<void> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select(['nominal_balance', 'policy_version_id'])
    .where('id', '=', accountId)
    .executeTakeFirstOrThrow();
  const nominal = new Decimal(account.nominal_balance);
  const maximumLossBudget = nominal.times('0.10');
  const halfTarget = nominal.times('0.05');
  const target = halfTarget.times(2);
  const firstBalance = nominal.plus(halfTarget);
  const targetBalance = nominal.plus(target);
  const firstFloor = firstBalance.minus(maximumLossBudget);
  const finalFloor = targetBalance.minus(maximumLossBudget);
  const now = new Date();
  const day = (offset: number): string => {
    const value = new Date(now);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  const instant = (offset: number): Date => {
    const value = new Date(now);
    value.setUTCDate(value.getUTCDate() + offset);
    return value;
  };

  await db
    .updateTable('app.trading_accounts')
    .set({ activated_at: instant(-3) })
    .where('id', '=', accountId)
    .execute();
  await db
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: accountId,
      entry_type: 'realized_pnl',
      amount: target.toFixed(2),
      reference_type: 'lifecycle_evidence_fixture',
      reference_id: randomUUID(),
      occurred_at: instant(-1),
    })
    .execute();
  await db
    .insertInto('app.account_daily_snapshots')
    .values([
      {
        account_id: accountId,
        trading_day: day(-2),
        policy_version_id: account.policy_version_id,
        status: 'finalized' as never,
        sod_balance: nominal.toFixed(2),
        sod_equity: nominal.toFixed(2),
        program_sod_balance: nominal.toFixed(2),
        daily_reference: nominal.toFixed(2),
        maximum_loss_floor_before: nominal.minus(maximumLossBudget).toFixed(2),
        eod_balance: firstBalance.toFixed(2),
        eod_equity: firstBalance.toFixed(2),
        program_eod_balance: firstBalance.toFixed(2),
        maximum_loss_floor_after: firstFloor.toFixed(2),
        highest_eod_balance_after: firstBalance.toFixed(2),
        highest_program_eod_balance_after: firstBalance.toFixed(2),
        realized_net_profit_for_day: halfTarget.toFixed(2),
        eligible_realized_net_profit_for_day: halfTarget.toFixed(2),
        finalized_at: instant(-2),
      },
      {
        account_id: accountId,
        trading_day: day(-1),
        policy_version_id: account.policy_version_id,
        status: 'finalized' as never,
        sod_balance: firstBalance.toFixed(2),
        sod_equity: firstBalance.toFixed(2),
        program_sod_balance: firstBalance.toFixed(2),
        daily_reference: firstBalance.toFixed(2),
        maximum_loss_floor_before: firstFloor.toFixed(2),
        eod_balance: targetBalance.toFixed(2),
        eod_equity: targetBalance.toFixed(2),
        program_eod_balance: targetBalance.toFixed(2),
        maximum_loss_floor_after: finalFloor.toFixed(2),
        highest_eod_balance_after: targetBalance.toFixed(2),
        highest_program_eod_balance_after: targetBalance.toFixed(2),
        realized_net_profit_for_day: halfTarget.toFixed(2),
        eligible_realized_net_profit_for_day: halfTarget.toFixed(2),
        finalized_at: instant(-1),
      },
    ])
    .execute();
}

export async function seedLifecycleFixture(
  env: LifecycleFixtureEnvironment,
  state: LifecycleFixtureState,
): Promise<LifecycleFixture> {
  const db = createDbClient(env.databaseUrl);
  // `.invalid` is reserved by RFC 2606 and can never resolve, so a fixture
  // user is incapable of receiving mail even if something tried to send it.
  const email = `e2e-lifecycle-${state}-${Date.now()}-${randomUUID().slice(0, 6)}@wariba-test.invalid`;
  const password = randomUUID();
  const userId = await createAuthFixtureUser({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey,
    email,
    password,
  });

  try {
    if (state === 'no_account') {
      return { state, userId, email, password, accountId: null, accountPublicId: null };
    }

    let account = await seedActivatedAccount(db, userId);

    if (state !== 'evaluation_new') {
      const pose = POSE[state];

      /*
       * A Performance account is a *child*, and posing one by flipping
       * `program_type` produced an account that cannot exist.
       *
       * The flipped row kept its `source_purchase_order_id` and had no
       * `source_evaluation_account_id`, which is the shape the schema's own
       * `trading_accounts_source_exactly_one` rules out and which UX-HUB-011
       * and PERF-020 both describe. The Hub refused to trade it and said so —
       * correctly — so every funded state photographed the fail-closed guard
       * instead of the dashboard, and one suite ended up asserting that guard
       * as though it were the product.
       *
       * So the parent is passed and the real provisioning command creates the
       * child, exactly as production does. The rules acknowledgement goes with
       * it: a funded account that has not accepted them is not yet trading,
       * which is a different state from the ones posed here.
       */
      if (pose.programType === 'WARIBA_PERFORMANCE') {
        await db
          .updateTable('app.trading_accounts')
          .set({ status: 'passed' })
          .where('id', '=', account.id)
          .execute();
        const performance = await activatePerformanceAccountInTransaction(db, {
          evaluationAccountId: account.id,
        });
        await acknowledgePerformanceRules(db, {
          userId,
          accountId: performance.id,
          correlationId: randomUUID(),
          now: new Date(),
        });
        account = { id: performance.id, publicId: performance.publicId };
      }

      await db
        .updateTable('app.trading_accounts')
        .set({
          status: pose.status as never,
          ...(pose.programType && pose.programType !== 'WARIBA_PERFORMANCE'
            ? { program_type: pose.programType }
            : {}),
          ...(pose.kycVerified === undefined ? {} : { kyc_sandbox_verified: pose.kycVerified }),
          ...(pose.payoutMethod === undefined
            ? {}
            : { payout_method_sandbox_configured: pose.payoutMethod }),
        })
        .where('id', '=', account.id)
        .execute();

      if (state === 'objective_reached' || state === 'under_review') {
        // Test/evidence-only financial history consistent with the posed
        // lifecycle: two 5% finalized days reach the 10% objective while the
        // Best Day ratio remains exactly 50%. No production path imports this
        // package, and the regular risk engine still owns the decision.
        await seedTargetReachedFinancialHistory(db, account.id);
        await db
          .insertInto('app.account_state_transitions')
          .values({
            account_id: account.id,
            from_status: 'active',
            to_status: 'pass_pending',
            reason: 'profit_target_reached',
            occurred_at: new Date(Date.now() - 1_000),
          })
          .execute();
      }

      if (pose.finalizeToday) {
        /*
         * Marking today's session closed is what moves the account from
         * "objective reached, session still open" to "under review". Both are
         * `pass_pending` in the database; the snapshot is the discriminator.
         *
         * A freshly activated account may have no row for today yet, so one is
         * inserted when the update matches nothing. It carries zeros — a
         * session in which nothing was traded, which is exactly what this
         * account's day was. No profit, no loss and no history are fabricated.
         */
        const today = new Date().toISOString().slice(0, 10);
        const updated = await db
          .updateTable('app.account_daily_snapshots')
          .set({ status: 'finalized' as never, finalized_at: new Date() })
          .where('account_id', '=', account.id)
          .where('trading_day', '=', today as never)
          .executeTakeFirst();

        if (!updated.numUpdatedRows || updated.numUpdatedRows === 0n) {
          const row = await db
            .selectFrom('app.trading_accounts')
            .select(['nominal_balance', 'policy_version_id'])
            .where('id', '=', account.id)
            .executeTakeFirstOrThrow();

          /*
           * Every balance column is the account's own nominal and every profit
           * column is zero: a session in which nothing was traded, which is
           * exactly what this account's day was. The maximum-loss floor is
           * carried forward unchanged, because nothing happened to ratchet it.
           */
          const nominal = new Decimal(row.nominal_balance);
          const balance = nominal.times('1.10');
          const maximumLossFloor = balance.minus(nominal.times('0.10'));
          await db
            .insertInto('app.account_daily_snapshots')
            .values({
              account_id: account.id,
              trading_day: today,
              policy_version_id: row.policy_version_id,
              status: 'finalized' as never,
              sod_balance: balance.toFixed(2),
              sod_equity: balance.toFixed(2),
              program_sod_balance: balance.toFixed(2),
              daily_reference: balance.toFixed(2),
              maximum_loss_floor_before: maximumLossFloor.toFixed(2),
              eod_balance: balance.toFixed(2),
              eod_equity: balance.toFixed(2),
              program_eod_balance: balance.toFixed(2),
              maximum_loss_floor_after: maximumLossFloor.toFixed(2),
              highest_eod_balance_after: balance.toFixed(2),
              highest_program_eod_balance_after: balance.toFixed(2),
              realized_net_profit_for_day: '0.00',
              eligible_realized_net_profit_for_day: '0.00',
              finalized_at: new Date(),
            })
            .onConflict((oc) =>
              oc
                .columns(['account_id', 'trading_day'])
                .doUpdateSet({ status: 'finalized' as never }),
            )
            .execute();
        }
      }
    }

    return {
      state,
      userId,
      email,
      password,
      accountId: account.id,
      accountPublicId: account.publicId,
    };
  } finally {
    await db.destroy();
  }
}

/** Removes the synthetic user and everything hanging off it. */
export async function deleteLifecycleFixture(
  env: LifecycleFixtureEnvironment,
  fixture: LifecycleFixture,
): Promise<void> {
  const db = createDbClient(env.databaseUrl);
  try {
    /*
     * Phase 3.2 rows first, and before the account.
     *
     * A support ticket references both the user and (optionally) the account,
     * so leaving one behind turns teardown into a foreign-key error and leaves
     * a synthetic user in the database. Contestations go before tickets
     * (they reference one); `app.ticket_messages` is not named at all —
     * deleting the ticket cascades to it, which is exactly the case its
     * append-only trigger permits.
     */
    await db.deleteFrom('app.contestations').where('user_id', '=', fixture.userId).execute();
    await db.deleteFrom('app.support_tickets').where('user_id', '=', fixture.userId).execute();
    await db
      .deleteFrom('app.identity_review_cases')
      .where('user_id', '=', fixture.userId)
      .execute();
    await db
      .deleteFrom('app.staff_action_rate_limits')
      .where('actor_id', '=', fixture.userId)
      .execute();

    /*
     * Every account this user owns, newest first.
     *
     * A funded fixture is now a real parent/child pair, so naming one account
     * and looking for children *of* it is no longer the right shape: the
     * fixture's own `accountId` is the child, and the passed evaluation it
     * points at would be left behind for the purchase-order delete below to
     * trip over. Creation order descending removes a child before the parent
     * it references, whatever the fixture happens to name.
     */
    const owned = await db
      .selectFrom('app.trading_accounts')
      .select('id')
      .where('user_id', '=', fixture.userId)
      .orderBy('created_at', 'desc')
      .execute();

    for (const account of owned) {
      // Children of the account row first: nothing here relies on cascade
      // behaviour that a migration could later change.
      await db
        .deleteFrom('app.performance_rule_acknowledgements')
        .where('account_id', '=', account.id)
        .execute();
      await db.deleteFrom('app.performance_cycles').where('account_id', '=', account.id).execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', account.id).execute();
      await db.deleteFrom('app.risk_violations').where('account_id', '=', account.id).execute();
      await db
        .deleteFrom('app.account_state_transitions')
        .where('account_id', '=', account.id)
        .execute();
      // Opening WariX materializes the current daily snapshot even when no
      // order is submitted. It belongs to this synthetic account and must be
      // removed before the account foreign key can be deleted.
      await db
        .deleteFrom('app.account_daily_snapshots')
        .where('account_id', '=', account.id)
        .execute();
      await db
        .deleteFrom('app.trading_ledger_entries')
        .where('account_id', '=', account.id)
        .execute();
      await db.deleteFrom('app.trading_accounts').where('id', '=', account.id).execute();
    }
    await db.deleteFrom('app.purchase_orders').where('user_id', '=', fixture.userId).execute();
    await db.deleteFrom('app.user_profiles').where('user_id', '=', fixture.userId).execute();
  } finally {
    await db.destroy();
  }

  await deleteAuthFixtureUser({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey,
    userId: fixture.userId,
  });
}
