import Decimal from 'decimal.js';
import { quotedPrice, computeRealizedPnl } from '@wariba/domain';
import type { Db, TradableSymbol } from '@wariba/database';
import type { AccountSnapshot } from '@wariba/contracts';
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
    .select('version')
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

  return {
    accountId,
    balance,
    equity,
    accountSequence: Number(account.version),
    openPositions,
    recentOrders,
  };
}
