import { randomUUID } from 'node:crypto';
import { activateEvaluationAccount, createDbClient, type Db } from '@wariba/database';
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
 * Nothing here fabricates *financial* data. Balances, fills and snapshots are
 * whatever the real activation path wrote. What is posed is the account's
 * status — a column a WARIBA operator can also set from Control.
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

    const account = await seedActivatedAccount(db, userId);

    if (state !== 'evaluation_new') {
      const pose = POSE[state];
      await db
        .updateTable('app.trading_accounts')
        .set({
          status: pose.status as never,
          ...(pose.programType ? { program_type: pose.programType } : {}),
          ...(pose.kycVerified === undefined ? {} : { kyc_sandbox_verified: pose.kycVerified }),
          ...(pose.payoutMethod === undefined
            ? {}
            : { payout_method_sandbox_configured: pose.payoutMethod }),
        })
        .where('id', '=', account.id)
        .execute();

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
          .set({ status: 'finalized' as never })
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
          const nominal = row.nominal_balance;
          await db
            .insertInto('app.account_daily_snapshots')
            .values({
              account_id: account.id,
              trading_day: today,
              policy_version_id: row.policy_version_id,
              status: 'finalized' as never,
              sod_balance: nominal,
              sod_equity: nominal,
              program_sod_balance: nominal,
              daily_reference: nominal,
              maximum_loss_floor_before: '0.00',
              eod_balance: nominal,
              eod_equity: nominal,
              program_eod_balance: nominal,
              maximum_loss_floor_after: '0.00',
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
      .deleteFrom('app.staff_action_rate_limits')
      .where('actor_id', '=', fixture.userId)
      .execute();

    if (fixture.accountId) {
      // Children first: nothing here relies on cascade behaviour that a
      // migration could later change.
      for (const table of [
        'app.risk_violations',
        'app.account_state_transitions',
        'app.account_daily_snapshots',
        'app.trading_ledger_entries',
      ] as const) {
        await db.deleteFrom(table).where('account_id', '=', fixture.accountId).execute();
      }
      await db.deleteFrom('app.trading_accounts').where('id', '=', fixture.accountId).execute();
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
