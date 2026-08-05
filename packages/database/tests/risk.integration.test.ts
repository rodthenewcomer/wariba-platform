import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import { activateEvaluationAccount } from '../src/activation';
import { openPosition, closePosition } from '../src/trading';
import { evaluateAndApplyAccountRisk } from '../src/risk';
import { finalizeDailyBoundaryForAccount } from '../src/daily-finalization';

/**
 * Real integration tests against the live hosted database for Prompt 05's
 * risk engine (DLL soft lock, Maximum Loss hard breach + forced close-all,
 * multi-day evaluation pass). Requires DATABASE_URL (via .env.local, gitignored).
 *
 * Each test uses its own dedicated fresh account (not shared across cases)
 * — account-level risk state is now real and persists across trades within
 * an account's lifetime, so sharing one account across independent P&L
 * scenarios would make them interfere with each other.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const NOW = new Date();
const FRESH_TICK = NOW.toISOString();
const ALL_MARKETS = {
  EURUSD: { bid: '1.08450', ask: '1.08460', timestamp: FRESH_TICK, sequence: '900' },
  GBPUSD: { bid: '1.26000', ask: '1.26020', timestamp: FRESH_TICK, sequence: '900' },
  USDJPY: { bid: '150.100', ask: '150.120', timestamp: FRESH_TICK, sequence: '900' },
  XAUUSD: { bid: '2000.00', ask: '2000.30', timestamp: FRESH_TICK, sequence: '900' },
  NAS100: { bid: '18000.0', ask: '18002.0', timestamp: FRESH_TICK, sequence: '900' },
};

/**
 * The risk engine's equity/unrealized-PnL calc prices every open position
 * against `marketBySymbol`, independent of whatever `market` a specific
 * fill used — so any test that opens/closes EURUSD at a price other than
 * ALL_MARKETS' fixed default must override the EURUSD entry to match,
 * or the engine will "see" a large phantom unrealized gain/loss from the
 * gap between the two.
 */
function marketsWithEurusd(market: {
  bid: string;
  ask: string;
  timestamp: string;
  sequence: string;
}) {
  return { ...ALL_MARKETS, EURUSD: market };
}

describeIfDb('risk engine — real database', () => {
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

  const createActiveAccount = async (
    label: string,
  ): Promise<{ userId: string; accountId: string }> => {
    const userId = await createTestUser(
      `risk-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@wariba-test.invalid`,
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
    return { userId, accountId: account.id };
  };

  beforeAll(async () => {
    db = createDbClient(DATABASE_URL as string);
  }, 15000);

  afterAll(async () => {
    for (const id of cleanupAccountIds) {
      const positions = await db
        .selectFrom('app.positions')
        .select('id')
        .where('account_id', '=', id)
        .execute();
      for (const p of positions) {
        await db.deleteFrom('app.fills').where('position_id', '=', p.id).execute();
      }
      await db.deleteFrom('app.trade_orders').where('account_id', '=', id).execute();
      await db.deleteFrom('app.positions').where('account_id', '=', id).execute();
      await db.deleteFrom('app.trading_ledger_entries').where('account_id', '=', id).execute();
      for (const p of positions) {
        await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', p.id).execute();
      }
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', id).execute();
      await db.deleteFrom('app.risk_violations').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_daily_snapshots').where('account_id', '=', id).execute();
      await db.deleteFrom('app.account_state_transitions').where('account_id', '=', id).execute();
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

  it('a loss exceeding the 3% Daily Loss Limit soft-locks the account without breaching it', async () => {
    const { accountId } = await createActiveAccount('dll');

    // Keep a small NAS100 position open (separate exposure bucket from
    // EURUSD) — it must survive the soft lock untouched, since soft lock
    // never force-closes anything, only Maximum Loss does.
    await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'NAS100',
      side: 'buy',
      quantity: '0.1',
      market: ALL_MARKETS.NAS100,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    // 10K tier's aggregate Forex exposure cap is 0.60 lots (Rules v1.1) —
    // 0.50 lot stays comfortably within it.
    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '1' };
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.50',
      market: openMarket,
      marketBySymbol: marketsWithEurusd(openMarket),
      now: NOW,
    });
    expect(open.position?.averageOpenPrice).toBe('1.10002');

    // 80 pip drop on 0.5 lots realizes -402 PnL, -7 commission = -409 net:
    // crosses the $300 DLL floor but stays far above the $9000 Maximum Loss floor.
    const closeMarket = { bid: '1.09200', ask: '1.09205', timestamp: FRESH_TICK, sequence: '2' };
    const close = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: closeMarket,
      marketBySymbol: marketsWithEurusd(closeMarket),
      now: NOW,
    });
    expect(close.fill?.realizedPnl).toBe('-402.00');

    const account = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(account.status).toBe('soft_locked');

    const transition = await db
      .selectFrom('app.account_state_transitions')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('to_status', '=', 'soft_locked')
      .executeTakeFirstOrThrow();
    expect(transition.from_status).toBe('active');
    expect(transition.reason).toBe('daily_loss_limit_reached');

    const violation = await db
      .selectFrom('app.risk_violations')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('rule_code', '=', 'RISK_DAILY_LOSS_LOCK')
      .executeTakeFirstOrThrow();
    expect(violation.consequence).toBe('soft_lock');
    expect(violation.severity).toBe('warning');

    // New exposure is blocked while soft-locked.
    const blockedOpen = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      side: 'buy',
      quantity: '0.10',
      market: ALL_MARKETS.XAUUSD,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    expect(blockedOpen.order.status).toBe('rejected');
    expect(blockedOpen.order.rejectionCode).toBe('account_not_active');

    // Reducing/closing exposure is still allowed while soft-locked.
    const companionPosition = await db
      .selectFrom('app.positions')
      .select('id')
      .where('account_id', '=', accountId)
      .where('symbol', '=', 'NAS100')
      .where('status', '=', 'open')
      .executeTakeFirstOrThrow();
    const allowedClose = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: companionPosition.id,
      mode: 'full',
      market: ALL_MARKETS.NAS100,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    expect(allowedClose.order.status).toBe('filled');
    // 60s: this scenario's own several real round trips (two opens, a
    // close, three reads, plus a rejection — insertRejectedOrder now also
    // bumps trading_accounts.version under the account lock, packages/
    // database/src/trading.ts — so slightly heavier than before) came in
    // as high as 45s when run alongside the rest of the integration suite
    // (more pg.Pool contention than in isolation) — matching the 60s budget
    // trading.integration.test.ts already uses for its own heaviest cases.
  }, 60000);

  it('a loss exceeding the 10% Maximum Loss floor hard-breaches the account and force-closes every remaining open position', async () => {
    const { accountId } = await createActiveAccount('maxloss');

    // A second, untouched position (separate exposure bucket) — must be
    // force-closed by the breach.
    const survivorOpen = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'NAS100',
      side: 'buy',
      quantity: '0.1',
      market: ALL_MARKETS.NAS100,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });

    // 0.60 lots is the 10K tier's full aggregate Forex exposure cap (Rules v1.1).
    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '3' };
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.60',
      market: openMarket,
      marketBySymbol: marketsWithEurusd(openMarket),
      now: NOW,
    });

    // 220 pip drop on 0.6 lots realizes -1322.40 PnL, -8.40 commission =
    // -1330.80 net: equity ~8669, below the $9000 initial Maximum Loss floor.
    const closeMarket = { bid: '1.07800', ask: '1.07805', timestamp: FRESH_TICK, sequence: '4' };
    const close = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: closeMarket,
      marketBySymbol: marketsWithEurusd(closeMarket),
      now: NOW,
    });
    expect(close.fill?.realizedPnl).toBe('-1322.40');

    const account = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(account.status).toBe('breached');

    const transition = await db
      .selectFrom('app.account_state_transitions')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('to_status', '=', 'breached')
      .executeTakeFirstOrThrow();
    expect(transition.reason).toBe('maximum_loss_breach');

    const violation = await db
      .selectFrom('app.risk_violations')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('rule_code', '=', 'RISK_MAXIMUM_LOSS_BREACH')
      .executeTakeFirstOrThrow();
    expect(violation.consequence).toBe('hard_breach');
    expect(violation.severity).toBe('critical');

    // The untouched NAS100 position was force-closed by the breach cascade.
    const survivorPosition = await db
      .selectFrom('app.positions')
      .select(['status', 'closed_at'])
      .where('id', '=', survivorOpen.position?.id as string)
      .executeTakeFirstOrThrow();
    expect(survivorPosition.status).toBe('closed');
    expect(survivorPosition.closed_at).not.toBeNull();

    const stillOpen = await db
      .selectFrom('app.positions')
      .select('id')
      .where('account_id', '=', accountId)
      .where('status', '=', 'open')
      .execute();
    expect(stillOpen).toHaveLength(0);

    // Breached is terminal — no further exposure of any kind.
    const blockedOpen = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'XAUUSD',
      side: 'buy',
      quantity: '0.10',
      market: ALL_MARKETS.XAUUSD,
      marketBySymbol: ALL_MARKETS,
      now: NOW,
    });
    expect(blockedOpen.order.status).toBe('rejected');
    expect(blockedOpen.order.rejectionCode).toBe('account_not_active');
    // 60s — same reasoning as the Daily Loss Limit test above.
  }, 60000);

  it('reaching the 10% target with Best Day compliant profit spread across two finalized days passes the evaluation', async () => {
    const { accountId } = await createActiveAccount('pass');
    const dayTwo = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
    const dayThree = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000);
    const dayTwoTick = dayTwo.toISOString();

    // Day 1: realize 537.60 PnL - 8.40 commission = 529.20 net profit, using
    // the 10K tier's full 0.60-lot aggregate Forex exposure cap.
    const openMarketDay1 = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '5' };
    const openDay1 = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.60',
      market: openMarketDay1,
      marketBySymbol: marketsWithEurusd(openMarketDay1),
      now: NOW,
    });
    const closeMarketDay1 = {
      bid: '1.10900',
      ask: '1.10905',
      timestamp: FRESH_TICK,
      sequence: '6',
    };
    const closeDay1 = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: openDay1.position?.id as string,
      mode: 'full',
      market: closeMarketDay1,
      marketBySymbol: marketsWithEurusd(closeMarketDay1),
      now: NOW,
    });
    expect(closeDay1.fill?.realizedPnl).toBe('537.60');

    const finalized = await finalizeDailyBoundaryForAccount(db, {
      accountId,
      clock: () => dayTwo,
    });
    expect(finalized.alreadyUpToDate).toBe(false);
    expect(finalized.finalizedTradingDay).not.toBeNull();

    // Day 2: an identical trade realizes the same 529.20 net profit — total
    // 1058.40 (>= the 1000 target), Best Day ratio exactly 529.20/1058.40 = 0.50.
    const openMarketDay2 = { bid: '1.09995', ask: '1.10000', timestamp: dayTwoTick, sequence: '7' };
    const openDay2 = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.60',
      market: openMarketDay2,
      marketBySymbol: marketsWithEurusd(openMarketDay2),
      now: dayTwo,
    });
    const closeMarketDay2 = {
      bid: '1.10900',
      ask: '1.10905',
      timestamp: dayTwoTick,
      sequence: '8',
    };
    const closeDay2 = await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: openDay2.position?.id as string,
      mode: 'full',
      market: closeMarketDay2,
      marketBySymbol: marketsWithEurusd(closeMarketDay2),
      now: dayTwo,
    });
    expect(closeDay2.fill?.realizedPnl).toBe('537.60');

    // Day 2's own close-triggered evaluation only sees day 1 as a finalized
    // profitable day (day 2 itself isn't finalized until the next boundary
    // crossing) — Best Day ratio is 529.20/529.20 = 1.00, non-compliant, so
    // the account is correctly still just 'active' here, not pass-eligible yet.
    const afterDay2 = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(afterDay2.status).toBe('active');

    const finalizedDay2 = await finalizeDailyBoundaryForAccount(db, {
      accountId,
      clock: () => dayThree,
    });
    expect(finalizedDay2.alreadyUpToDate).toBe(false);

    // Now both days are finalized: Best Day ratio is 529.20/1058.40 = 0.50,
    // exactly compliant, and realized profit (1058.40) clears the 1000 target.
    const firstEvaluation = await evaluateAndApplyAccountRisk(db, {
      accountId,
      now: dayThree,
      marketBySymbol: ALL_MARKETS,
      triggerEventType: 'daily_finalization',
      triggerEventId: randomUUID(),
    });
    expect(firstEvaluation.previousStatus).toBe('active');
    expect(firstEvaluation.newStatus).toBe('pass_pending');
    expect(firstEvaluation.result.bestDay.ratio).toBe('0.5000');
    expect(firstEvaluation.result.eligibility.passEligible).toBe(true);

    // The next trigger (in production, the daily worker's next cycle)
    // auto-finalizes — V1 has no manual review gate to wait on.
    const secondEvaluation = await evaluateAndApplyAccountRisk(db, {
      accountId,
      now: dayThree,
      marketBySymbol: ALL_MARKETS,
      triggerEventType: 'manual_review',
      triggerEventId: randomUUID(),
    });
    expect(secondEvaluation.previousStatus).toBe('pass_pending');
    expect(secondEvaluation.newStatus).toBe('passed');
    expect(secondEvaluation.result.bestDay.ratio).toBe('0.5000');
    expect(secondEvaluation.result.eligibility.passEligible).toBe(true);

    const finalAccount = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(finalAccount.status).toBe('passed');

    const passTransition = await db
      .selectFrom('app.account_state_transitions')
      .selectAll()
      .where('account_id', '=', accountId)
      .where('to_status', '=', 'passed')
      .executeTakeFirstOrThrow();
    expect(passTransition.from_status).toBe('pass_pending');
    expect(passTransition.reason).toBe('evaluation_pass_finalized');
    // 55s: two finalized trading days' worth of trades/finalization calls —
    // this scenario doesn't touch a rejection path, so this budget is
    // purely this environment's own real, confirmed latency, not related to
    // any Prompt 07 change.
  }, 55000);

  it('is idempotent — retrying the same triggerEventId writes no duplicate violation or transition', async () => {
    const { accountId } = await createActiveAccount('idempotency');

    const openMarket = { bid: '1.09995', ask: '1.10000', timestamp: FRESH_TICK, sequence: '9' };
    const open = await openPosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      symbol: 'EURUSD',
      side: 'buy',
      quantity: '0.50',
      market: openMarket,
      marketBySymbol: marketsWithEurusd(openMarket),
      now: NOW,
    });
    const closeMarket = { bid: '1.09200', ask: '1.09205', timestamp: FRESH_TICK, sequence: '10' };
    await closePosition(db, {
      accountId,
      idempotencyKey: randomUUID(),
      positionId: open.position?.id as string,
      mode: 'full',
      market: closeMarket,
      marketBySymbol: marketsWithEurusd(closeMarket),
      now: NOW,
    });

    const account = await db
      .selectFrom('app.trading_accounts')
      .select('status')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(account.status).toBe('soft_locked');

    const violationsBefore = await db
      .selectFrom('app.risk_violations')
      .select('id')
      .where('account_id', '=', accountId)
      .execute();
    expect(violationsBefore).toHaveLength(1);

    const sharedTriggerId = randomUUID();
    await evaluateAndApplyAccountRisk(db, {
      accountId,
      now: NOW,
      marketBySymbol: marketsWithEurusd(closeMarket),
      triggerEventType: 'manual_review',
      triggerEventId: sharedTriggerId,
    });
    await evaluateAndApplyAccountRisk(db, {
      accountId,
      now: NOW,
      marketBySymbol: marketsWithEurusd(closeMarket),
      triggerEventType: 'manual_review',
      triggerEventId: sharedTriggerId,
    });

    // Still soft-locked (already-soft-locked re-evaluations produce a fresh
    // evidence row per distinct trigger event — but the two calls above
    // share one triggerEventId, so together they add at most one more row).
    const violationsAfter = await db
      .selectFrom('app.risk_violations')
      .select('id')
      .where('account_id', '=', accountId)
      .execute();
    expect(violationsAfter.length).toBe(violationsBefore.length + 1);

    const transitions = await db
      .selectFrom('app.account_state_transitions')
      .select('id')
      .where('account_id', '=', accountId)
      .execute();
    expect(transitions).toHaveLength(2); // pending_activation->active (at activation), active->soft_locked
  }, 30000);
});
