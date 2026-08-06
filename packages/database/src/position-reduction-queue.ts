import { isPartialCloseQuantityValid, isStale } from '@wariba/domain';
import { loadSymbolSpec } from './accounts';
import type { Db } from './client';
import type { PositionReductionQueueStatus, TradableSymbol } from './schema';
import { closePosition, type MarketSnapshot, type TradeCommandResult } from './trading';

/**
 * Prompt 7 Appendix 07-C §12/§16 — QueuePositionReductionDuringOutage and
 * its execution/cancellation. Reducing risk (partial or full close) must
 * stay possible even when this position's market data is STALE, but a
 * reduction can never execute against a stale price — trading.ts already
 * enforces that unconditionally for the immediate path. This module is the
 * *deferred* path: record exactly what was requested and when, execute it
 * exactly once, the moment this symbol's market data is fresh again, always
 * through the same closePosition() transaction (and the same idempotency
 * key) the immediate path uses — this module never touches balance,
 * positions or fills directly, only the queue's own lifecycle.
 */

const REJECTION = {
  POSITION_NOT_FOUND: 'position_not_found',
  POSITION_ALREADY_CLOSED: 'position_already_closed',
  UNKNOWN_SYMBOL_SPEC: 'unknown_symbol_spec',
  INVALID_QUANTITY: 'invalid_quantity',
  MARKET_NOT_STALE: 'market_not_stale',
  QUEUE_ENTRY_NOT_FOUND: 'queue_entry_not_found',
  QUEUE_ENTRY_ALREADY_SETTLED: 'queue_entry_already_settled',
} as const;

export interface QueuedReductionSummary {
  id: string;
  positionId: string;
  symbol: TradableSymbol;
  mode: 'partial' | 'full';
  requestedQuantity: string | null;
  status: PositionReductionQueueStatus;
  queuedAt: Date;
  executedAt: Date | null;
  cancelledAt: Date | null;
  executionOrderId: string | null;
  failureReason: string | null;
}

interface QueueRow {
  id: string;
  position_id: string;
  mode: 'partial' | 'full';
  requested_quantity: string | null;
  status: PositionReductionQueueStatus;
  queued_at: Date;
  executed_at: Date | null;
  cancelled_at: Date | null;
  execution_order_id: string | null;
  failure_reason: string | null;
}

function toSummary(row: QueueRow, symbol: TradableSymbol): QueuedReductionSummary {
  return {
    id: row.id,
    positionId: row.position_id,
    symbol,
    mode: row.mode,
    requestedQuantity: row.requested_quantity,
    status: row.status,
    queuedAt: row.queued_at,
    executedAt: row.executed_at,
    cancelledAt: row.cancelled_at,
    executionOrderId: row.execution_order_id,
    failureReason: row.failure_reason,
  };
}

export interface QueuePositionReductionParams {
  accountId: string;
  idempotencyKey: string;
  positionId: string;
  mode: 'partial' | 'full';
  quantity?: string;
  market: MarketSnapshot;
  now: Date;
}

export interface QueuePositionReductionResult {
  status: 'queued' | 'rejected';
  rejectionCode: string | null;
  queueEntry: QueuedReductionSummary | null;
}

export async function queuePositionReduction(
  db: Db,
  params: QueuePositionReductionParams,
): Promise<QueuePositionReductionResult> {
  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom('app.position_reduction_queue')
      .selectAll()
      .where('account_id', '=', params.accountId)
      .where('idempotency_key', '=', params.idempotencyKey)
      .executeTakeFirst();
    if (existing) {
      const existingPosition = await trx
        .selectFrom('app.positions')
        .select('symbol')
        .where('id', '=', existing.position_id)
        .executeTakeFirstOrThrow();
      return {
        status: 'queued' as const,
        rejectionCode: null,
        queueEntry: toSummary(existing, existingPosition.symbol),
      };
    }

    const reject = (code: string): QueuePositionReductionResult => ({
      status: 'rejected',
      rejectionCode: code,
      queueEntry: null,
    });

    const position = await trx
      .selectFrom('app.positions')
      .selectAll()
      .where('id', '=', params.positionId)
      .where('account_id', '=', params.accountId)
      .executeTakeFirst();
    if (!position) return reject(REJECTION.POSITION_NOT_FOUND);
    if (position.status !== 'open') return reject(REJECTION.POSITION_ALREADY_CLOSED);

    const account = await trx
      .selectFrom('app.trading_accounts')
      .select('symbol_spec_set_id')
      .where('id', '=', params.accountId)
      .executeTakeFirstOrThrow();
    const spec = await loadSymbolSpec(trx, account.symbol_spec_set_id, position.symbol);
    if (!spec) return reject(REJECTION.UNKNOWN_SYMBOL_SPEC);

    // The queue exists specifically for stale/outage data — a fresh market
    // should always go through the immediate partial_close/full_close
    // command instead, which settles in one round trip rather than waiting
    // for the next tick.
    if (
      !isStale({
        tickTimestamp: params.market.timestamp,
        now: params.now,
        staleThresholdMs: spec.stale_threshold_ms,
      })
    ) {
      return reject(REJECTION.MARKET_NOT_STALE);
    }

    if (params.mode === 'partial') {
      if (
        !params.quantity ||
        !isPartialCloseQuantityValid({
          requestedQuantity: params.quantity,
          openQuantity: position.open_quantity,
        })
      ) {
        return reject(REJECTION.INVALID_QUANTITY);
      }
    }

    const inserted = await trx
      .insertInto('app.position_reduction_queue')
      .values({
        account_id: params.accountId,
        position_id: params.positionId,
        idempotency_key: params.idempotencyKey,
        mode: params.mode,
        requested_quantity: params.mode === 'partial' ? (params.quantity ?? null) : null,
        status: 'queued',
        queued_at: params.now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      status: 'queued' as const,
      rejectionCode: null,
      queueEntry: toSummary(inserted, position.symbol),
    };
  });
}

export interface CancelQueuedReductionParams {
  accountId: string;
  queueId: string;
  now: Date;
}

export interface CancelQueuedReductionResult {
  status: 'cancelled' | 'rejected';
  rejectionCode: string | null;
  queueEntry: QueuedReductionSummary | null;
}

/** Only cancellable while still 'queued' — appendix §12: "allow cancellation only if it has not executed". */
export async function cancelQueuedReduction(
  db: Db,
  params: CancelQueuedReductionParams,
): Promise<CancelQueuedReductionResult> {
  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom('app.position_reduction_queue')
      .innerJoin('app.positions', 'app.positions.id', 'app.position_reduction_queue.position_id')
      .select([
        'app.position_reduction_queue.id',
        'app.position_reduction_queue.position_id',
        'app.position_reduction_queue.mode',
        'app.position_reduction_queue.requested_quantity',
        'app.position_reduction_queue.status',
        'app.position_reduction_queue.queued_at',
        'app.position_reduction_queue.executed_at',
        'app.position_reduction_queue.cancelled_at',
        'app.position_reduction_queue.execution_order_id',
        'app.position_reduction_queue.failure_reason',
        'app.positions.symbol',
      ])
      .where('app.position_reduction_queue.id', '=', params.queueId)
      .where('app.position_reduction_queue.account_id', '=', params.accountId)
      .executeTakeFirst();
    if (!existing) {
      return {
        status: 'rejected' as const,
        rejectionCode: REJECTION.QUEUE_ENTRY_NOT_FOUND,
        queueEntry: null,
      };
    }
    if (existing.status !== 'queued') {
      return {
        status: 'rejected' as const,
        rejectionCode: REJECTION.QUEUE_ENTRY_ALREADY_SETTLED,
        queueEntry: toSummary(existing, existing.symbol),
      };
    }

    // Race guard: only actually cancel if it's still 'queued' at the moment
    // of this UPDATE — a concurrent executeQueuedReductions tick could have
    // settled it between the SELECT above and here.
    const updated = await trx
      .updateTable('app.position_reduction_queue')
      .set({ status: 'cancelled', cancelled_at: params.now })
      .where('id', '=', params.queueId)
      .where('status', '=', 'queued')
      .returningAll()
      .executeTakeFirst();
    if (!updated) {
      return {
        status: 'rejected' as const,
        rejectionCode: REJECTION.QUEUE_ENTRY_ALREADY_SETTLED,
        queueEntry: null,
      };
    }
    return {
      status: 'cancelled' as const,
      rejectionCode: null,
      queueEntry: toSummary(updated, existing.symbol),
    };
  });
}

export interface ExecuteQueuedReductionsParams {
  symbol: TradableSymbol;
  market: MarketSnapshot;
  marketBySymbol: Record<TradableSymbol, MarketSnapshot>;
  now: Date;
}

export interface ExecutedQueuedReduction {
  accountId: string;
  /** The queue row's own idempotency key — the same one closePosition() executed with, and what app.trade_orders stored it under. */
  idempotencyKey: string;
  queueEntry: QueuedReductionSummary;
  commandResult: TradeCommandResult;
}

/**
 * Called by services/realtime on every fresh tick for `symbol` — the only
 * place in this system with live market data (packages/database has none,
 * by design — see ENG-028). Settles every row still 'queued' for an open
 * position on this symbol, each through its own closePosition() call (so
 * each settles atomically, account-locked, exactly like an immediate
 * close), using the row's own stored idempotency key end to end.
 */
export async function executeQueuedReductions(
  db: Db,
  params: ExecuteQueuedReductionsParams,
): Promise<ExecutedQueuedReduction[]> {
  const rows = await db
    .selectFrom('app.position_reduction_queue')
    .innerJoin('app.positions', 'app.positions.id', 'app.position_reduction_queue.position_id')
    .select([
      'app.position_reduction_queue.id',
      'app.position_reduction_queue.account_id',
      'app.position_reduction_queue.position_id',
      'app.position_reduction_queue.idempotency_key',
      'app.position_reduction_queue.mode',
      'app.position_reduction_queue.requested_quantity',
      'app.position_reduction_queue.queued_at',
    ])
    .where('app.position_reduction_queue.status', '=', 'queued')
    .where('app.positions.symbol', '=', params.symbol)
    .where('app.positions.status', '=', 'open')
    .execute();

  const results: ExecutedQueuedReduction[] = [];
  for (const row of rows) {
    const commandResult = await closePosition(db, {
      accountId: row.account_id,
      idempotencyKey: row.idempotency_key,
      positionId: row.position_id,
      mode: row.mode,
      ...(row.mode === 'partial' && row.requested_quantity
        ? { quantity: row.requested_quantity }
        : {}),
      market: params.market,
      marketBySymbol: params.marketBySymbol,
      now: params.now,
    });
    const settledStatus: PositionReductionQueueStatus =
      commandResult.order.status === 'filled' ? 'executed' : 'failed';
    const updated = await db
      .updateTable('app.position_reduction_queue')
      .set({
        status: settledStatus,
        executed_at: params.now,
        execution_order_id: commandResult.order.orderId,
        failure_reason:
          commandResult.order.status === 'rejected' ? commandResult.order.rejectionCode : null,
      })
      .where('id', '=', row.id)
      .where('status', '=', 'queued')
      .returningAll()
      .executeTakeFirst();
    if (updated) {
      results.push({
        accountId: row.account_id,
        idempotencyKey: row.idempotency_key,
        queueEntry: toSummary(updated, params.symbol),
        commandResult,
      });
    }
  }
  return results;
}

/** Every non-terminal (still 'queued') reduction for an account — what AccountSnapshot.queuedReductions shows. */
export async function loadQueuedReductionsForAccount(
  db: Db,
  accountId: string,
): Promise<QueuedReductionSummary[]> {
  const rows = await db
    .selectFrom('app.position_reduction_queue')
    .innerJoin('app.positions', 'app.positions.id', 'app.position_reduction_queue.position_id')
    .select([
      'app.position_reduction_queue.id',
      'app.position_reduction_queue.position_id',
      'app.position_reduction_queue.mode',
      'app.position_reduction_queue.requested_quantity',
      'app.position_reduction_queue.status',
      'app.position_reduction_queue.queued_at',
      'app.position_reduction_queue.executed_at',
      'app.position_reduction_queue.cancelled_at',
      'app.position_reduction_queue.execution_order_id',
      'app.position_reduction_queue.failure_reason',
      'app.positions.symbol',
    ])
    .where('app.position_reduction_queue.account_id', '=', accountId)
    .where('app.position_reduction_queue.status', '=', 'queued')
    .orderBy('app.position_reduction_queue.queued_at', 'asc')
    .execute();
  return rows.map((row) => toSummary(row, row.symbol));
}
