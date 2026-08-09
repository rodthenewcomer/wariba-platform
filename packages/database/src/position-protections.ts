import Decimal from 'decimal.js';
import { lockAccount } from './accounts';
import type { Db } from './client';
import { assertCurrentLeadershipInTransaction, type LeadershipToken } from './realtime-leadership';
import type { TradableSymbol } from './schema';
import {
  closePositionInTransaction,
  type MarketSnapshot,
  type TradeCommandResult,
} from './trading';

export type PositionProtectionTrigger = 'stop_loss' | 'take_profit';

export interface TriggeredPositionProtection {
  accountId: string;
  positionId: string;
  trigger: PositionProtectionTrigger;
  commandResult: TradeCommandResult;
}

export function resolvePositionProtectionTrigger(params: {
  side: 'buy' | 'sell';
  stopLoss: string | null;
  takeProfit: string | null;
  bid: string;
  ask: string;
}): PositionProtectionTrigger | null {
  const executablePrice = new Decimal(params.side === 'buy' ? params.bid : params.ask);
  if (
    params.stopLoss &&
    (params.side === 'buy'
      ? executablePrice.lessThanOrEqualTo(params.stopLoss)
      : executablePrice.greaterThanOrEqualTo(params.stopLoss))
  ) {
    return 'stop_loss';
  }
  if (
    params.takeProfit &&
    (params.side === 'buy'
      ? executablePrice.greaterThanOrEqualTo(params.takeProfit)
      : executablePrice.lessThanOrEqualTo(params.takeProfit))
  ) {
    return 'take_profit';
  }
  return null;
}

export async function triggerPositionProtections(
  db: Db,
  params: {
    symbol: TradableSymbol;
    market: MarketSnapshot;
    marketBySymbol: Record<TradableSymbol, MarketSnapshot>;
    now: Date;
    fencingToken?: LeadershipToken;
  },
): Promise<TriggeredPositionProtection[]> {
  const candidates = await db
    .selectFrom('app.positions')
    .select(['id', 'account_id'])
    .where('symbol', '=', params.symbol)
    .where('status', '=', 'open')
    .where((expression) =>
      expression.or([
        expression('stop_loss', 'is not', null),
        expression('take_profit', 'is not', null),
      ]),
    )
    .execute();

  const results: TriggeredPositionProtection[] = [];
  for (const candidate of candidates) {
    const result = await db.transaction().execute(async (trx) => {
      await lockAccount(trx, candidate.account_id);
      if (params.fencingToken) {
        await assertCurrentLeadershipInTransaction(trx, params.fencingToken);
      }
      const position = await trx
        .selectFrom('app.positions')
        .select(['id', 'account_id', 'side', 'stop_loss', 'take_profit', 'status'])
        .where('id', '=', candidate.id)
        .where('status', '=', 'open')
        .forUpdate()
        .executeTakeFirst();
      if (!position) return null;

      const trigger = resolvePositionProtectionTrigger({
        side: position.side,
        stopLoss: position.stop_loss,
        takeProfit: position.take_profit,
        bid: params.market.bid,
        ask: params.market.ask,
      });
      if (!trigger) return null;

      const commandResult = await closePositionInTransaction(trx, {
        accountId: position.account_id,
        idempotencyKey: `position-protection:${position.id}:${trigger}:${params.market.sequence}`,
        positionId: position.id,
        mode: 'full',
        market: params.market,
        marketBySymbol: params.marketBySymbol,
        now: params.now,
        ...(params.fencingToken ? { fencingToken: params.fencingToken } : {}),
      });
      return {
        accountId: position.account_id,
        positionId: position.id,
        trigger,
        commandResult,
      };
    });
    if (result) results.push(result);
  }
  return results;
}
