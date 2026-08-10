import { randomUUID } from 'node:crypto';
import {
  activateEvaluationAccount,
  activatePerformanceAccountInTransaction,
  closePosition,
  createDbClient,
  createPayoutRequestInTransaction,
  finalizeDailyBoundaryForAccount,
  openPosition,
  type Db,
} from '@wariba/database';
import { createAuthFixtureUser, deleteAuthFixtureUser } from './supabase-auth-fixture';

export interface PayoutFixtureEnvironment {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export interface PayoutAccountFixture {
  userId: string;
  email: string;
  password: string;
  accountId: string;
  accountPublicId: string;
  evaluationAccountId: string;
  purchaseOrderId: string;
  payoutRequestId: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function marketsWithEurusd(market: {
  bid: string;
  ask: string;
  timestamp: string;
  sequence: string;
}) {
  return {
    EURUSD: market,
    GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: market.timestamp, sequence: '900' },
    USDJPY: { bid: '150.100', ask: '150.120', timestamp: market.timestamp, sequence: '900' },
    XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: market.timestamp, sequence: '900' },
    NAS100: { bid: '18000.0', ask: '18002.0', timestamp: market.timestamp, sequence: '900' },
  };
}

async function realizeEligibleDay(db: Db, accountId: string, dayStart: Date): Promise<void> {
  const openMarket = {
    bid: '1.09995',
    ask: '1.10000',
    timestamp: dayStart.toISOString(),
    sequence: '1',
  };
  const opened = await openPosition(db, {
    accountId,
    idempotencyKey: randomUUID(),
    symbol: 'EURUSD',
    side: 'buy',
    quantity: '0.60',
    market: openMarket,
    marketBySymbol: marketsWithEurusd(openMarket),
    now: dayStart,
  });
  if (!opened.position)
    throw new Error(`Payout fixture failed to open a position for ${accountId}.`);

  const closeAt = new Date(dayStart.getTime() + 61_000);
  const closeMarket = {
    bid: '1.10900',
    ask: '1.10905',
    timestamp: closeAt.toISOString(),
    sequence: '2',
  };
  const closed = await closePosition(db, {
    accountId,
    idempotencyKey: randomUUID(),
    positionId: opened.position.id,
    mode: 'full',
    market: closeMarket,
    marketBySymbol: marketsWithEurusd(closeMarket),
    now: closeAt,
  });
  if (closed.fill?.realizedPnl !== '537.60') {
    throw new Error(
      `Payout fixture expected 537.60 realized PnL for ${accountId}, received ${closed.fill?.realizedPnl ?? 'no fill'}.`,
    );
  }
  await finalizeDailyBoundaryForAccount(db, {
    accountId,
    clock: () => new Date(dayStart.getTime() + DAY_MS),
  });
}

async function deleteAccountRows(db: Db, accountId: string): Promise<void> {
  const positions = await db
    .selectFrom('app.positions')
    .select('id')
    .where('account_id', '=', accountId)
    .execute();
  const payoutRequests = await db
    .selectFrom('app.payout_requests')
    .select('id')
    .where('account_id', '=', accountId)
    .execute();

  await db
    .updateTable('app.trading_accounts')
    .set({
      integrity_hold: false,
      integrity_hold_reason: null,
      integrity_hold_set_at: null,
      integrity_hold_incident_id: null,
    })
    .where('id', '=', accountId)
    .execute();
  await db
    .deleteFrom('app.account_reconciliation_runs')
    .where('account_id', '=', accountId)
    .execute();
  await db.deleteFrom('app.operations_incidents').where('account_id', '=', accountId).execute();

  await db.deleteFrom('app.position_reduction_queue').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.pending_orders').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.payout_requests').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.fills').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.trade_orders').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.positions').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.risk_violations').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', accountId).execute();
  await db
    .deleteFrom('app.account_state_transitions')
    .where('account_id', '=', accountId)
    .execute();
  await db.deleteFrom('app.performance_review_cases').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.performance_cycles').where('account_id', '=', accountId).execute();
  for (const position of positions) {
    await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', position.id).execute();
  }
  for (const payoutRequest of payoutRequests) {
    await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', payoutRequest.id).execute();
  }
  await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', accountId).execute();
  await db.deleteFrom('app.trading_accounts').where('id', '=', accountId).execute();
}

export async function seedPayoutAccount(
  environment: PayoutFixtureEnvironment,
  options: { createPendingRequest?: boolean } = {},
): Promise<PayoutAccountFixture> {
  const db = createDbClient(environment.databaseUrl);
  const email = `e2e-payout-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`;
  const password = randomUUID();
  const userId = await createAuthFixtureUser({
    supabaseUrl: environment.supabaseUrl,
    serviceRoleKey: environment.supabaseServiceRoleKey,
    email,
    password,
  });

  try {
    await db
      .insertInto('app.user_profiles')
      .values({
        user_id: userId,
        first_name: 'Trader',
        last_name: 'Performance',
        country: 'CI',
        language: 'fr',
      })
      .execute();
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
    const purchaseOrder = await db
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
    const evaluationAccount = await activateEvaluationAccount(db, {
      purchaseOrderId: purchaseOrder.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    const performanceAccount = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluationAccount.id,
      userId,
      nominalBalance: productVersion.nominal_balance,
      currency: productVersion.nominal_currency,
    });
    await db
      .updateTable('app.trading_accounts')
      .set({ kyc_sandbox_verified: true, payout_method_sandbox_configured: true })
      .where('id', '=', performanceAccount.id)
      .execute();

    const firstDay = new Date();
    firstDay.setUTCHours(12, 0, 0, 0);
    for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
      await realizeEligibleDay(
        db,
        performanceAccount.id,
        new Date(firstDay.getTime() + dayIndex * DAY_MS),
      );
    }

    let payoutRequestId: string | null = null;
    if (options.createPendingRequest) {
      const request = await createPayoutRequestInTransaction(db, {
        accountId: performanceAccount.id,
        idempotencyKey: randomUUID(),
        requestedNetTraderCash: '500.00',
        now: new Date(),
      });
      if (request.status === 'rejected') {
        throw new Error(
          `Payout fixture request failed for ${performanceAccount.id}: ${request.rejectionCode}.`,
        );
      }
      payoutRequestId = request.request.id;
    }

    return {
      userId,
      email,
      password,
      accountId: performanceAccount.id,
      accountPublicId: performanceAccount.publicId,
      evaluationAccountId: evaluationAccount.id,
      purchaseOrderId: purchaseOrder.id,
      payoutRequestId,
    };
  } finally {
    await db.destroy();
  }
}

export async function deletePayoutAccount(
  environment: PayoutFixtureEnvironment,
  fixture: PayoutAccountFixture,
): Promise<void> {
  const db = createDbClient(environment.databaseUrl);
  try {
    const alerts = await db
      .selectFrom('app.price_alerts')
      .select('id')
      .where('user_id', '=', fixture.userId)
      .execute();
    for (const alert of alerts) {
      await db.deleteFrom('app.alert_notifications').where('alert_id', '=', alert.id).execute();
    }
    await db.deleteFrom('app.price_alerts').where('user_id', '=', fixture.userId).execute();
    await deleteAccountRows(db, fixture.accountId);
    await deleteAccountRows(db, fixture.evaluationAccountId);
    await db
      .deleteFrom('app.payment_events')
      .where('purchase_order_id', '=', fixture.purchaseOrderId)
      .execute();
    await db.deleteFrom('app.purchase_orders').where('id', '=', fixture.purchaseOrderId).execute();
    await db.deleteFrom('app.user_consents').where('user_id', '=', fixture.userId).execute();
  } finally {
    await db.destroy();
  }
  await deleteAuthFixtureUser({
    supabaseUrl: environment.supabaseUrl,
    serviceRoleKey: environment.supabaseServiceRoleKey,
    userId: fixture.userId,
  });
}
