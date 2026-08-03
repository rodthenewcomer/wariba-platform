import {
  openPosition,
  closePosition,
  closeAllPositions,
  modifyPositionRisk,
  type Db,
  type TradeCommandResult,
  type MarketSnapshot,
  type TradableSymbol,
} from '@wariba/database';
import type { SubmitOrderMessage, CloseAllMessage, OrderResultMessage } from '@wariba/contracts';
import type { SandboxMarketDataProvider } from '@wariba/adapters';
import type { LoadedSymbolSpec } from './market';
import { toOrderDTO, toPositionDTO, toFillDTO } from './dto-mappers';

export type OrderRejectionReason = 'not_owner';

/**
 * TRD-013/Engineering Constitution §37: the market snapshot is read from
 * the in-memory simulator *before* the DB transaction opens (never inside
 * it) — this is that read, translated into the MarketSnapshot shape
 * packages/database expects.
 */
function readMarketSnapshot(
  market: SandboxMarketDataProvider,
  symbol: TradableSymbol,
): MarketSnapshot {
  const tick = market.getSnapshot(symbol);
  return {
    bid: tick.bid,
    ask: tick.ask,
    timestamp: tick.timestamp,
    sequence: String(tick.sequence),
  };
}

export async function verifyAccountOwnership(
  db: Db,
  accountId: string,
  userId: string,
): Promise<boolean> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select('id')
    .where('id', '=', accountId)
    .where('user_id', '=', userId)
    .executeTakeFirst();
  return Boolean(account);
}

/**
 * Used only to pick which market tick to read for a close/modify command.
 * If the position doesn't exist, this arbitrary choice is never actually
 * used for pricing — the DB transaction checks existence under lock before
 * touching the market snapshot at all, and correctly rejects with
 * position_not_found regardless of what tick was read here.
 */
async function symbolForPosition(db: Db, positionId: string): Promise<TradableSymbol> {
  const row = await db
    .selectFrom('app.positions')
    .select('symbol')
    .where('id', '=', positionId)
    .executeTakeFirst();
  return row?.symbol ?? 'EURUSD';
}

function buildResultMessage(
  accountId: string,
  idempotencyKey: string,
  orderType: SubmitOrderMessage['orderType'],
  result: TradeCommandResult,
): OrderResultMessage {
  return {
    type: 'order_result',
    idempotencyKey,
    status: result.order.status,
    rejectionCode: result.order.rejectionCode,
    order: toOrderDTO({
      accountId,
      orderId: result.order.orderId,
      orderType,
      symbol: result.position?.symbol ?? null,
      side: result.position?.side ?? null,
      positionId: result.position?.id ?? null,
      requestedQuantity: result.fill?.quantity ?? null,
      filledQuantity: result.fill?.quantity ?? '0',
      outcome: result.order,
      receivedAt: result.fill?.occurredAt ?? new Date(),
      completedAt: result.fill?.occurredAt ?? null,
    }),
    position: result.position ? toPositionDTO(accountId, result.position) : null,
    fill:
      result.fill && result.position
        ? toFillDTO(
            result.order.orderId,
            result.fill,
            result.position.id,
            result.position.symbol,
            result.position.side,
            orderType === 'market_open' ? 'open' : 'close',
          )
        : null,
  };
}

export async function handleSubmitOrder(
  db: Db,
  market: SandboxMarketDataProvider,
  userId: string,
  msg: SubmitOrderMessage,
): Promise<{ result: TradeCommandResult; message: OrderResultMessage } | OrderRejectionReason> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }

  const now = new Date();

  if (msg.orderType === 'market_open') {
    const result = await openPosition(db, {
      accountId: msg.accountId,
      idempotencyKey: msg.idempotencyKey,
      symbol: msg.symbol,
      side: msg.side,
      quantity: msg.quantity,
      ...(msg.stopLoss !== undefined && { stopLoss: msg.stopLoss }),
      ...(msg.takeProfit !== undefined && { takeProfit: msg.takeProfit }),
      market: readMarketSnapshot(market, msg.symbol),
      now,
    });
    return {
      result,
      message: buildResultMessage(msg.accountId, msg.idempotencyKey, 'market_open', result),
    };
  }

  if (msg.orderType === 'partial_close') {
    const symbol = await symbolForPosition(db, msg.positionId);
    const result = await closePosition(db, {
      accountId: msg.accountId,
      idempotencyKey: msg.idempotencyKey,
      positionId: msg.positionId,
      mode: 'partial',
      quantity: msg.quantity,
      market: readMarketSnapshot(market, symbol),
      now,
    });
    return {
      result,
      message: buildResultMessage(msg.accountId, msg.idempotencyKey, 'partial_close', result),
    };
  }

  if (msg.orderType === 'full_close') {
    const symbol = await symbolForPosition(db, msg.positionId);
    const result = await closePosition(db, {
      accountId: msg.accountId,
      idempotencyKey: msg.idempotencyKey,
      positionId: msg.positionId,
      mode: 'full',
      market: readMarketSnapshot(market, symbol),
      now,
    });
    return {
      result,
      message: buildResultMessage(msg.accountId, msg.idempotencyKey, 'full_close', result),
    };
  }

  // modify_sl / modify_tp
  const result = await modifyPositionRisk(db, {
    accountId: msg.accountId,
    idempotencyKey: msg.idempotencyKey,
    positionId: msg.positionId,
    field: msg.orderType === 'modify_sl' ? 'stop_loss' : 'take_profit',
    value: msg.orderType === 'modify_sl' ? msg.stopLoss : msg.takeProfit,
    now,
  });
  return {
    result,
    message: buildResultMessage(msg.accountId, msg.idempotencyKey, msg.orderType, result),
  };
}

export async function handleCloseAll(
  db: Db,
  market: SandboxMarketDataProvider,
  symbolSpecs: Record<TradableSymbol, LoadedSymbolSpec>,
  userId: string,
  msg: CloseAllMessage,
): Promise<
  { results: TradeCommandResult[]; messages: OrderResultMessage[] } | OrderRejectionReason
> {
  if (!(await verifyAccountOwnership(db, msg.accountId, userId))) {
    return 'not_owner';
  }
  const now = new Date();
  const marketBySymbol = {} as Record<TradableSymbol, MarketSnapshot>;
  for (const symbol of Object.keys(symbolSpecs) as TradableSymbol[]) {
    marketBySymbol[symbol] = readMarketSnapshot(market, symbol);
  }
  const results = await closeAllPositions(db, {
    accountId: msg.accountId,
    idempotencyKeyPrefix: msg.idempotencyKey,
    marketBySymbol,
    now,
  });
  const messages = results.map((r) =>
    buildResultMessage(msg.accountId, msg.idempotencyKey, 'full_close', r),
  );
  return { results, messages };
}
