import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import type { Db, TradableSymbol, OrderSide } from '@wariba/database';
import { computeCommission, computeProfitEligibility, computeRealizedPnl } from '@wariba/domain';

/**
 * A trading record, written the way the engine would have written it.
 *
 * ## Why this exists
 *
 * Phase 2 built real performance analytics and a real journal, and then
 * photographed both empty — because `app.fills` on the development database
 * contained zero rows and always had. Every KPI, every chart, every table on
 * those two surfaces was correct-by-construction and unverified-by-observation.
 * A read model nobody has ever seen render with data is not a finished feature.
 *
 * ## What this is, precisely
 *
 * Synthetic QA evidence. It is **not** production financial data, it is never
 * imported by production code, and no real user can reach it. Every account it
 * touches belongs to an `@wariba-test.invalid` user, and `deleteTradingRecord`
 * removes every row it wrote.
 *
 * ## Why it does not simply INSERT numbers
 *
 * A fixture that types `realized_pnl = '184.00'` proves the UI can render the
 * string "184". It proves nothing about whether the analytics agree with the
 * ledger, whether the balance follows from the fills, or whether a
 * short-duration profit is excluded from the program-eligible balance the way
 * the rulebook says.
 *
 * So the prices are the inputs and everything else is *computed by the same
 * domain functions the live close path calls* — `computeRealizedPnl`,
 * `computeCommission`, `computeProfitEligibility`. The ledger entries are the
 * same two entries `closePositionLocked` writes. The consequence is that
 * `loadAccountBalanceProjection` summing this ledger returns a balance which
 * genuinely follows from these trades, and a KPI that disagrees with it is a
 * real bug rather than a fixture artefact.
 *
 * One trade is deliberately held for under sixty seconds at a profit, so the
 * short-duration eligibility rule has something to exclude and the surfaces
 * that report eligible-vs-realised have a case where the two differ.
 */

/** One round trip, as a human would describe it. */
interface ScriptedTrade {
  /** Days before the anchor day this trade opened and closed. */
  daysAgo: number;
  /** Minutes past 13:00 UTC the position opened. */
  openMinute: number;
  symbol: TradableSymbol;
  side: OrderSide;
  quantity: string;
  openPrice: string;
  closePrice: string;
  /** How long it was held. Under 60_000 makes a profit short-duration. */
  holdMs: number;
}

/**
 * The record.
 *
 * Chosen to exercise every branch the two surfaces have, not to flatter the
 * trader: three symbols, both directions, five finalised sessions, a losing
 * day among the winning ones, durations spanning four of the five buckets
 * `performance-analytics` defines, and one sub-minute winner the eligibility
 * rule must exclude.
 *
 * Hand-written rather than generated. A seeded random walk would produce a
 * different record for every reviewer who changed the seed, and a screenshot
 * that cannot be reproduced is not evidence.
 */
const SCRIPT: readonly ScriptedTrade[] = [
  // Day 1 — a measured start: one win, one loss, net positive.
  {
    daysAgo: 6,
    openMinute: 15,
    symbol: 'NAS100',
    side: 'buy',
    quantity: '2.00',
    openPrice: '20150.0',
    closePrice: '20242.0',
    holdMs: 22 * 60_000,
  },
  {
    daysAgo: 6,
    openMinute: 95,
    symbol: 'XAUUSD',
    side: 'sell',
    quantity: '0.50',
    openPrice: '2412.50',
    closePrice: '2419.80',
    holdMs: 41 * 60_000,
  },

  // Day 2 — the losing session. A record with no bad day is not a record.
  {
    daysAgo: 5,
    openMinute: 30,
    symbol: 'EURUSD',
    side: 'buy',
    quantity: '1.00',
    openPrice: '1.08420',
    closePrice: '1.08195',
    holdMs: 3 * 3_600_000,
  },
  {
    daysAgo: 5,
    openMinute: 220,
    symbol: 'NAS100',
    side: 'sell',
    quantity: '1.00',
    openPrice: '20310.0',
    closePrice: '20358.0',
    holdMs: 12 * 60_000,
  },

  // Day 3 — the best day. Large enough to matter to the consistency ratio,
  // deliberately not large enough to breach the 40 % limit on its own.
  {
    daysAgo: 4,
    openMinute: 10,
    symbol: 'NAS100',
    side: 'buy',
    quantity: '3.00',
    openPrice: '20180.0',
    closePrice: '20298.0',
    holdMs: 55 * 60_000,
  },
  {
    daysAgo: 4,
    openMinute: 140,
    symbol: 'XAUUSD',
    side: 'buy',
    quantity: '1.00',
    openPrice: '2401.20',
    closePrice: '2408.60',
    holdMs: 4 * 3_600_000,
  },

  // Day 4 — the scalp. Held 38 seconds at a profit, so the eligibility rule
  // must exclude it from the program-eligible balance while the trader still
  // sees it in their realised P&L. The pair of figures only differs because
  // this trade exists.
  {
    daysAgo: 3,
    openMinute: 45,
    symbol: 'NAS100',
    side: 'buy',
    quantity: '1.00',
    openPrice: '20240.0',
    closePrice: '20276.0',
    holdMs: 38_000,
  },
  {
    daysAgo: 3,
    openMinute: 190,
    symbol: 'EURUSD',
    side: 'sell',
    quantity: '1.50',
    openPrice: '1.08610',
    closePrice: '1.08455',
    holdMs: 96 * 60_000,
  },

  // Day 5 — closing on a modest win, so the current streak is positive and
  // the equity curve does not end on its high.
  {
    daysAgo: 2,
    openMinute: 60,
    symbol: 'XAUUSD',
    side: 'buy',
    quantity: '0.75',
    openPrice: '2398.40',
    closePrice: '2405.10',
    holdMs: 2 * 3_600_000,
  },
  {
    daysAgo: 2,
    openMinute: 205,
    symbol: 'NAS100',
    side: 'sell',
    quantity: '1.00',
    openPrice: '20355.0',
    closePrice: '20331.0',
    holdMs: 8 * 60_000,
  },
  {
    daysAgo: 2,
    openMinute: 300,
    symbol: 'EURUSD',
    side: 'buy',
    quantity: '1.00',
    openPrice: '1.08300',
    closePrice: '1.08258',
    holdMs: 27 * 60_000,
  },
];

export interface TradingRecordFixture {
  accountId: string;
  /** Closed round trips written. */
  tradeCount: number;
  /** Finalised sessions written. */
  sessionCount: number;
  /** Balance implied by the ledger after the record, to two decimals. */
  finalBalance: string;
  /** Net realised P&L across every close fill. */
  netRealizedPnl: string;
}

interface SymbolSpecRow {
  symbol: TradableSymbol;
  contract_size: string;
  commission_per_lot: string;
  spread_points: string;
  slippage_points: string;
  price_precision: number;
}

/** UTC midnight, `daysAgo` days before `anchor`. */
function dayStart(anchor: Date, daysAgo: number): Date {
  const day = new Date(anchor);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - daysAgo);
  return day;
}

function tradingDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Writes the record above onto an existing activated account.
 *
 * The account must already exist and be active — this seeds a *trading record*,
 * not an account. Pair it with `createFixtureAccount`.
 */
export async function seedTradingRecord(
  db: Db,
  params: { accountId: string; now: Date },
): Promise<TradingRecordFixture> {
  const { accountId, now } = params;

  const specRows = await db
    .selectFrom('app.symbol_specs')
    .select([
      'symbol',
      'contract_size',
      'commission_per_lot',
      'spread_points',
      'slippage_points',
      'price_precision',
    ])
    .execute();

  const specs = new Map<string, SymbolSpecRow>();
  for (const row of specRows) specs.set(row.symbol, row as SymbolSpecRow);

  const account = await db
    .selectFrom('app.trading_accounts')
    .select(['nominal_balance', 'policy_version_id'])
    .where('id', '=', accountId)
    .executeTakeFirstOrThrow(
      () => new Error(`seedTradingRecord: account ${accountId} not found.`),
    );

  const maximumLossRate = new Decimal('0.08');
  let sequence = 1;
  let netRealized = new Decimal(0);

  /** Realised net P&L per UTC day, so the snapshots below agree with the fills. */
  const perDay = new Map<string, Decimal>();

  for (const trade of SCRIPT) {
    const spec = specs.get(trade.symbol);
    if (!spec) throw new Error(`seedTradingRecord: no symbol spec for ${trade.symbol}.`);

    const openedAt = new Date(dayStart(now, trade.daysAgo).getTime() + trade.openMinute * 60_000);
    const closedAt = new Date(openedAt.getTime() + trade.holdMs);

    // Same domain functions the live close path calls — see the module note.
    const realizedPnl = computeRealizedPnl({
      openPrice: trade.openPrice,
      closePrice: trade.closePrice,
      quantity: trade.quantity,
      contractSize: spec.contract_size,
      positionSide: trade.side,
    });
    const commission = computeCommission({
      quantity: trade.quantity,
      commissionPerLot: spec.commission_per_lot,
    });
    const eligibility = computeProfitEligibility({
      realizedPnl,
      // Both legs' commission — the open leg's is allocated to the close, the
      // same way closePositionLocked allocates it.
      allocatedFees: new Decimal(commission).times(2).toFixed(2),
      openedAt,
      closedAt,
    });

    const position = await db
      .insertInto('app.positions')
      .values({
        account_id: accountId,
        symbol: trade.symbol,
        side: trade.side,
        opening_quantity: trade.quantity,
        open_quantity: '0.00',
        average_open_price: trade.openPrice,
        realized_pnl: realizedPnl,
        status: 'closed',
        account_sequence: String(sequence),
        opened_at: openedAt,
        closed_at: closedAt,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const openOrder = await db
      .insertInto('app.trade_orders')
      .values({
        account_id: accountId,
        idempotency_key: randomUUID(),
        order_type: 'market_open',
        symbol: trade.symbol,
        side: trade.side,
        position_id: position.id,
        requested_quantity: trade.quantity,
        filled_quantity: trade.quantity,
        status: 'filled',
        account_sequence: String(sequence),
        received_at: openedAt,
        accepted_at: openedAt,
        completed_at: openedAt,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const openFill = await db
      .insertInto('app.fills')
      .values({
        order_id: openOrder.id,
        account_id: accountId,
        position_id: position.id,
        symbol: trade.symbol,
        side: trade.side,
        fill_type: 'open',
        quantity: trade.quantity,
        price: trade.openPrice,
        spread_points: spec.spread_points,
        slippage_points: spec.slippage_points,
        commission,
        realized_pnl: '0.00',
        market_sequence: String(sequence),
        account_sequence: String(sequence),
        occurred_at: openedAt,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    if (!new Decimal(commission).isZero()) {
      await db
        .insertInto('app.trading_ledger_entries')
        .values({
          account_id: accountId,
          entry_type: 'commission',
          amount: `-${commission}`,
          reference_type: 'fill',
          reference_id: openFill.id,
          occurred_at: openedAt,
        })
        .execute();
    }

    sequence += 1;

    const closeOrder = await db
      .insertInto('app.trade_orders')
      .values({
        account_id: accountId,
        idempotency_key: randomUUID(),
        order_type: 'full_close',
        symbol: trade.symbol,
        side: trade.side,
        position_id: position.id,
        requested_quantity: trade.quantity,
        filled_quantity: trade.quantity,
        status: 'filled',
        account_sequence: String(sequence),
        received_at: closedAt,
        accepted_at: closedAt,
        completed_at: closedAt,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const closeFill = await db
      .insertInto('app.fills')
      .values({
        order_id: closeOrder.id,
        account_id: accountId,
        position_id: position.id,
        symbol: trade.symbol,
        side: trade.side,
        fill_type: 'close',
        quantity: trade.quantity,
        price: trade.closePrice,
        spread_points: spec.spread_points,
        slippage_points: spec.slippage_points,
        commission,
        realized_pnl: realizedPnl,
        market_sequence: String(sequence),
        account_sequence: String(sequence),
        occurred_at: closedAt,
        opening_fill_id: openFill.id,
        duration_ms: String(eligibility.durationMs),
        is_short_duration_profit: eligibility.isShortDurationProfit,
        eligible_realized_pnl: eligibility.eligibleRealizedPnl,
        ineligible_short_duration_profit: eligibility.ineligibleShortDurationProfit,
        allocated_open_commission: commission,
        net_realized_pnl: eligibility.netRealizedPnl,
        eligibility_reason: eligibility.eligibilityReason,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await db
      .insertInto('app.trading_ledger_entries')
      .values({
        account_id: accountId,
        entry_type: 'realized_pnl',
        amount: realizedPnl,
        reference_type: 'fill',
        reference_id: closeFill.id,
        occurred_at: closedAt,
      })
      .execute();

    if (!new Decimal(commission).isZero()) {
      await db
        .insertInto('app.trading_ledger_entries')
        .values({
          account_id: accountId,
          entry_type: 'commission',
          amount: `-${commission}`,
          reference_type: 'fill',
          reference_id: closeFill.id,
          occurred_at: closedAt,
        })
        .execute();
    }

    sequence += 1;

    const day = tradingDay(closedAt);
    perDay.set(day, (perDay.get(day) ?? new Decimal(0)).plus(eligibility.netRealizedPnl));
    netRealized = netRealized.plus(eligibility.netRealizedPnl);
  }

  /*
   * Snapshots, in the order the finalisation job would have written them.
   *
   * The balance walks forward day by day from the nominal, so `sod_balance`
   * of each session is the `eod_balance` of the one before it — the property
   * the evolution chart depends on and the one a hand-typed fixture breaks
   * first. The maximum-loss floor ratchets upward on new highs and never
   * decreases, matching `maximum_loss_floor_never_decreases`.
   */
  const nominal = new Decimal(account.nominal_balance);
  let balance = nominal;
  let floor = nominal.minus(nominal.times(maximumLossRate));
  let highestEod = nominal;

  const days = [...perDay.keys()].sort();
  for (const day of days) {
    const dayPnl = perDay.get(day) ?? new Decimal(0);
    const sod = balance;
    const eod = balance.plus(dayPnl);
    const floorBefore = floor;

    highestEod = Decimal.max(highestEod, eod);
    floor = Decimal.max(floor, highestEod.minus(nominal.times(maximumLossRate)));

    await db
      .insertInto('app.account_daily_snapshots')
      .values({
        account_id: accountId,
        trading_day: day,
        policy_version_id: account.policy_version_id,
        status: 'finalized',
        sod_balance: sod.toFixed(2),
        sod_equity: sod.toFixed(2),
        program_sod_balance: sod.toFixed(2),
        daily_reference: sod.toFixed(2),
        maximum_loss_floor_before: floorBefore.toFixed(2),
        eod_balance: eod.toFixed(2),
        // Written as a copy of the balance, exactly as daily-finalization.ts
        // does — there is no historical price feed to mark open positions at
        // the boundary, and a fixture that invented a different figure here
        // would be seeding the fake equity series the phase forbids.
        eod_equity: eod.toFixed(2),
        program_eod_balance: eod.toFixed(2),
        maximum_loss_floor_after: floor.toFixed(2),
        highest_eod_balance_after: highestEod.toFixed(2),
        highest_program_eod_balance_after: highestEod.toFixed(2),
        realized_net_profit_for_day: dayPnl.toFixed(2),
        eligible_realized_net_profit_for_day: dayPnl.toFixed(2),
        finalized_at: new Date(`${day}T23:59:59.000Z`),
      })
      .onConflict((oc) => oc.columns(['account_id', 'trading_day']).doNothing())
      .execute();

    balance = eod;
  }

  return {
    accountId,
    tradeCount: SCRIPT.length,
    sessionCount: days.length,
    finalBalance: balance.toFixed(2),
    netRealizedPnl: netRealized.toFixed(2),
  };
}

/**
 * Removes everything `seedTradingRecord` wrote, in foreign-key order.
 *
 * Scoped to the account, so it is safe to call on an account that also has
 * rows written by another fixture — it removes the record, not the account.
 */
export async function deleteTradingRecord(db: Db, accountId: string): Promise<void> {
  await db
    .deleteFrom('app.trading_ledger_entries')
    .where('account_id', '=', accountId)
    .where('entry_type', 'in', ['realized_pnl', 'commission'])
    .execute();
  await db.deleteFrom('app.fills').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.trade_orders').where('account_id', '=', accountId).execute();
  await db.deleteFrom('app.positions').where('account_id', '=', accountId).execute();
  await db
    .deleteFrom('app.account_daily_snapshots')
    .where('account_id', '=', accountId)
    .execute();
}
