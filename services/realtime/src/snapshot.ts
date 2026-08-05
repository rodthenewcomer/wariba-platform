import Decimal from 'decimal.js';
import { quotedPrice, computeRealizedPnl } from '@wariba/domain';
import {
  loadPolicyById,
  evaluateAccountRisk,
  type Db,
  type TradableSymbol,
  type DailySnapshotInput,
} from '@wariba/database';
import type { AccountRisk, AccountSnapshot } from '@wariba/contracts';
import type { SandboxMarketDataProvider } from '@wariba/adapters';
import type { LoadedSymbolSpec } from './market';
import { toPositionDTO, toOrderDTO } from './dto-mappers';

/**
 * Full account state — used both for the initial subscribe (System
 * Architecture §62-64: "full snapshot + explicit sequence reset" is the V1
 * resync strategy) and for reconnects. Balance is the ledger sum (TRD-011:
 * append-only, so balance is always a reconciliable projection of it, never
 * a separately-stored counter that could drift). Equity adds unrealized PnL
 * from the live market snapshot — a paper calculation using the same
 * close-side price rule as an actual close (TRD-007/008), without slippage
 * since nothing is actually being filled.
 */
export async function buildAccountSnapshot(
  db: Db,
  accountId: string,
  market: SandboxMarketDataProvider,
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>,
): Promise<AccountSnapshot> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select(['version', 'status', 'nominal_balance', 'policy_version_id'])
    .where('id', '=', accountId)
    .executeTakeFirstOrThrow();

  const ledgerEntries = await db
    .selectFrom('app.trading_ledger_entries')
    .select('amount')
    .where('account_id', '=', accountId)
    .execute();
  const balance = ledgerEntries.reduce((sum, e) => sum.plus(e.amount), new Decimal(0)).toFixed(2);

  const openPositionRows = await db
    .selectFrom('app.positions')
    .selectAll()
    .where('account_id', '=', accountId)
    .where('status', '=', 'open')
    .execute();

  let unrealizedTotal = new Decimal(0);
  const openPositions = openPositionRows.map((row) => {
    const tick = market.getSnapshot(row.symbol);
    const closePrice = quotedPrice({
      bid: tick.bid,
      ask: tick.ask,
      positionSide: row.side,
      action: 'close',
    });
    const unrealized = computeRealizedPnl({
      openPrice: row.average_open_price,
      closePrice,
      quantity: row.open_quantity,
      contractSize: symbolSpecs[row.symbol].contractSize,
      positionSide: row.side,
    });
    unrealizedTotal = unrealizedTotal.plus(unrealized);
    return toPositionDTO(accountId, {
      id: row.id,
      symbol: row.symbol,
      side: row.side,
      openQuantity: row.open_quantity,
      averageOpenPrice: row.average_open_price,
      realizedPnl: row.realized_pnl,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      status: row.status,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
    });
  });

  const equity = new Decimal(balance).plus(unrealizedTotal).toFixed(2);

  const recentOrderRows = await db
    .selectFrom('app.trade_orders')
    .selectAll()
    .where('account_id', '=', accountId)
    .orderBy('received_at', 'desc')
    .limit(20)
    .execute();

  const recentOrders = recentOrderRows.map((row) =>
    toOrderDTO({
      accountId,
      orderId: row.id,
      idempotencyKey: row.idempotency_key,
      orderType: row.order_type,
      symbol: row.symbol,
      side: row.side,
      positionId: row.position_id,
      requestedQuantity: row.requested_quantity,
      filledQuantity: row.filled_quantity,
      outcome: {
        orderId: row.id,
        status: row.status === 'filled' ? 'filled' : 'rejected',
        rejectionCode: row.rejection_code,
        accountSequence: row.account_sequence,
        alreadyExisted: true,
      },
      receivedAt: row.received_at,
      completedAt: row.completed_at,
    }),
  );

  const risk = await buildAccountRisk(
    db,
    accountId,
    account,
    balance,
    equity,
    openPositionRows.length,
  );

  return {
    accountId,
    balance,
    equity,
    accountSequence: Number(account.version),
    openPositions,
    recentOrders,
    risk,
  };
}

function toDailySnapshotInput(row: {
  trading_day: string;
  status: 'open' | 'finalized';
  daily_reference: string;
  maximum_loss_floor_before: string;
  eod_balance: string | null;
  maximum_loss_floor_after: string | null;
  realized_net_profit_for_day: string | null;
}): DailySnapshotInput {
  return {
    tradingDay: row.trading_day,
    status: row.status,
    dailyReference: row.daily_reference,
    maximumLossFloorBefore: row.maximum_loss_floor_before,
    eodBalance: row.eod_balance,
    maximumLossFloorAfter: row.maximum_loss_floor_after,
    realizedNetProfitForDay: row.realized_net_profit_for_day,
  };
}

/**
 * Read-only — never writes. Prices every open position with the same live
 * market snapshot the rest of this function already used, so the risk view
 * shown to the trader always matches the equity shown alongside it. Returns
 * null only before the account's first-ever trade, when no daily snapshot
 * exists yet to evaluate against (one gets created lazily by risk.ts on
 * that first trade, or by the daily worker — see packages/database).
 */
async function buildAccountRisk(
  db: Db,
  accountId: string,
  account: { status: string; nominal_balance: string; policy_version_id: string },
  balance: string,
  equity: string,
  openPositionCount: number,
): Promise<AccountRisk | null> {
  const today = await db
    .selectFrom('app.account_daily_snapshots')
    .selectAll()
    .where('account_id', '=', accountId)
    .orderBy('trading_day', 'desc')
    .executeTakeFirst();
  if (!today) return null;

  const historicalSnapshots = await db
    .selectFrom('app.account_daily_snapshots')
    .select([
      'trading_day',
      'status',
      'daily_reference',
      'maximum_loss_floor_before',
      'eod_balance',
      'maximum_loss_floor_after',
      'realized_net_profit_for_day',
    ])
    .where('account_id', '=', accountId)
    .where('trading_day', '<', today.trading_day)
    .orderBy('trading_day', 'asc')
    .execute();

  const policy = await loadPolicyById(db, account.policy_version_id);

  const result = evaluateAccountRisk({
    clock: { now: () => new Date() },
    account: {
      id: accountId,
      status: account.status as Parameters<typeof evaluateAccountRisk>[0]['account']['status'],
      nominalBalance: account.nominal_balance,
    },
    policy: policy.parameters,
    currentBalance: balance,
    currentUnrealizedPnl: new Decimal(equity).minus(balance).toFixed(2),
    openPositionCount,
    pendingOrderCount: 0,
    dailySnapshots: [...historicalSnapshots.map(toDailySnapshotInput), toDailySnapshotInput(today)],
  });

  // `status` is the actual persisted, enforced status — the one trading.ts's
  // guards check — never the engine's live-computed `recommendedStatus`,
  // which could differ from what's actually in effect until the next
  // trade-triggered or daily-worker-triggered evaluation applies it. Every
  // other field here IS that live, fully-priced preview (useful for e.g.
  // an early soft-lock warning), just never mistaken for the applied status.
  return {
    status: account.status as AccountRisk['status'],
    target: result.target,
    dailyLoss: result.dailyLoss,
    maximumLoss: result.maximumLoss,
    bestDay: result.bestDay,
    eligibility: {
      passEligible: result.eligibility.passEligible,
      blockingReasons: [...result.eligibility.blockingReasons],
    },
  };
}
