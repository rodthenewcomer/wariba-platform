import {
  isQuantityWithinBounds,
  isStale,
  pendingOrderSide,
  isPendingOrderCreationPriceValid,
  isPendingOrderTriggered,
  clampPendingOrderFillPrice,
  roundPriceToTick,
  computeFillPrice,
  type PendingOrderType,
} from '@wariba/domain';
import { resolveProfitEligibilityPolicy } from '@wariba/policies';
import { lockAccount, loadSymbolSpec } from './accounts';
import type { Db } from './client';
import { loadPolicyById } from './policy';
import type { PendingOrderStatus, TradableSymbol } from './schema';
import {
  openPosition,
  isWithinAggregateExposureLimit,
  countShortDurationProfitClosures,
  type MarketSnapshot,
  type TradeCommandResult,
} from './trading';

/**
 * Prompt 7 Appendix 07-D — server-authoritative Buy/Sell Limit/Stop
 * pending-order lifecycle. Reuses openPosition() unchanged for the actual
 * fill (see its fillPriceOverride doc comment) so every part of what
 * happens once an order triggers — commission, ledger entries, position
 * insert, risk evaluation, attached SL/TP activated atomically in that same
 * insert — is the exact same single, already-audited code path a
 * trader-submitted market order uses. This module only owns the
 * queue/validate/trigger bookkeeping around that.
 *
 * No leadership/fencing/active-standby model exists in this codebase
 * (services/realtime is a single process — see the migration's own doc
 * comment) — safety here is the same single-writer-plus-idempotency-key
 * model every other command in this system already relies on.
 */

const REJECTION = {
  ACCOUNT_NOT_ACTIVE: 'account_not_active',
  STALE_MARKET_DATA: 'stale_market_data',
  INVALID_QUANTITY: 'invalid_quantity',
  UNKNOWN_SYMBOL_SPEC: 'unknown_symbol_spec',
  EXPOSURE_LIMIT_EXCEEDED: 'exposure_limit_exceeded',
  SHORT_DURATION_ENTRY_LOCKED: 'short_duration_entry_locked',
  INVALID_TRIGGER_PRICE: 'invalid_trigger_price',
  INVALID_PRICE_PRECISION: 'invalid_price_precision',
  PENDING_ORDER_NOT_FOUND: 'pending_order_not_found',
  PENDING_ORDER_ALREADY_SETTLED: 'pending_order_already_settled',
} as const;

export interface PendingOrderSummary {
  id: string;
  accountId: string;
  symbol: TradableSymbol;
  side: 'buy' | 'sell';
  orderType: PendingOrderType;
  quantity: string;
  triggerPrice: string;
  requestedStopLoss: string | null;
  requestedTakeProfit: string | null;
  status: PendingOrderStatus;
  version: number;
  rejectionCode: string | null;
  executionOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  triggeredAt: Date | null;
  filledAt: Date | null;
  cancelledAt: Date | null;
}

interface PendingOrderRow {
  id: string;
  account_id: string;
  symbol: TradableSymbol;
  side: 'buy' | 'sell';
  order_type: PendingOrderType;
  quantity: string;
  trigger_price: string;
  requested_stop_loss: string | null;
  requested_take_profit: string | null;
  status: PendingOrderStatus;
  version: number;
  rejection_code: string | null;
  execution_order_id: string | null;
  created_at: Date;
  updated_at: Date;
  triggered_at: Date | null;
  filled_at: Date | null;
  cancelled_at: Date | null;
}

function toSummary(row: PendingOrderRow): PendingOrderSummary {
  return {
    id: row.id,
    accountId: row.account_id,
    symbol: row.symbol,
    side: row.side,
    orderType: row.order_type,
    quantity: row.quantity,
    triggerPrice: row.trigger_price,
    requestedStopLoss: row.requested_stop_loss,
    requestedTakeProfit: row.requested_take_profit,
    status: row.status,
    version: row.version,
    rejectionCode: row.rejection_code,
    executionOrderId: row.execution_order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    triggeredAt: row.triggered_at,
    filledAt: row.filled_at,
    cancelledAt: row.cancelled_at,
  };
}

export interface CreatePendingOrderParams {
  accountId: string;
  idempotencyKey: string;
  symbol: TradableSymbol;
  orderType: PendingOrderType;
  quantity: string;
  triggerPrice: string;
  stopLoss?: string;
  takeProfit?: string;
  market: MarketSnapshot;
  now: Date;
}

export interface PendingOrderCommandResult {
  status: 'active' | 'rejected';
  rejectionCode: string | null;
  order: PendingOrderSummary | null;
}

export async function createPendingOrder(
  db: Db,
  params: CreatePendingOrderParams,
): Promise<PendingOrderCommandResult> {
  return db.transaction().execute(async (trx) => {
    // Lock BEFORE checking idempotency — same reasoning as every other
    // command in this codebase (openPosition, queuePositionReduction): two
    // concurrent calls with the same key must not both observe "no
    // existing order" before either commits.
    const account = await lockAccount(trx, params.accountId);

    const existing = await trx
      .selectFrom('app.pending_orders')
      .selectAll()
      .where('account_id', '=', params.accountId)
      .where('idempotency_key', '=', params.idempotencyKey)
      .executeTakeFirst();
    if (existing) {
      return {
        status: existing.status === 'active' ? ('active' as const) : ('rejected' as const),
        rejectionCode: existing.rejection_code,
        order: toSummary(existing),
      };
    }

    const reject = (code: string): PendingOrderCommandResult => ({
      status: 'rejected',
      rejectionCode: code,
      order: null,
    });

    if (account.status !== 'active') {
      return reject(REJECTION.ACCOUNT_NOT_ACTIVE);
    }

    const policy = await loadPolicyById(trx, account.policy_version_id);
    const eligibilityPolicy = resolveProfitEligibilityPolicy(policy.parameters);
    if (eligibilityPolicy.enabled) {
      const shortDurationCount = await countShortDurationProfitClosures(
        trx,
        account.id,
        params.now,
      );
      if (shortDurationCount >= eligibilityPolicy.entryLockCount) {
        return reject(REJECTION.SHORT_DURATION_ENTRY_LOCKED);
      }
    }

    const spec = await loadSymbolSpec(trx, account.symbol_spec_set_id, params.symbol);
    if (!spec) {
      return reject(REJECTION.UNKNOWN_SYMBOL_SPEC);
    }

    if (
      isStale({
        tickTimestamp: params.market.timestamp,
        now: params.now,
        staleThresholdMs: spec.stale_threshold_ms,
      })
    ) {
      return reject(REJECTION.STALE_MARKET_DATA);
    }

    if (
      !isQuantityWithinBounds({
        quantity: params.quantity,
        minimumQuantity: spec.minimum_quantity,
        maximumQuantity: spec.maximum_quantity,
        quantityStep: spec.quantity_step,
      })
    ) {
      return reject(REJECTION.INVALID_QUANTITY);
    }

    const roundedTrigger = roundPriceToTick({
      price: params.triggerPrice,
      pricePrecision: spec.price_precision,
    });
    if (roundedTrigger !== params.triggerPrice) {
      return reject(REJECTION.INVALID_PRICE_PRECISION);
    }

    if (
      !isPendingOrderCreationPriceValid({
        orderType: params.orderType,
        triggerPrice: params.triggerPrice,
        currentBid: params.market.bid,
        currentAsk: params.market.ask,
      })
    ) {
      return reject(REJECTION.INVALID_TRIGGER_PRICE);
    }

    // Projected exposure at creation time considers currently-open
    // positions only (the same check openPosition itself uses) — a real,
    // documented limitation: several pending orders on the same symbol
    // group don't sum against each other here. The authoritative gate that
    // actually prevents over-exposure is openPosition's own re-check at
    // trigger/fill time (triggerPendingOrders below reuses it unchanged) —
    // an order that would breach the limit by the time it fills is rejected
    // then, never silently allowed through.
    if (!(await isWithinAggregateExposureLimit(trx, account, params.symbol, params.quantity))) {
      return reject(REJECTION.EXPOSURE_LIMIT_EXCEEDED);
    }

    const side = pendingOrderSide(params.orderType);
    const inserted = await trx
      .insertInto('app.pending_orders')
      .values({
        account_id: params.accountId,
        symbol: params.symbol,
        side,
        order_type: params.orderType,
        quantity: params.quantity,
        trigger_price: params.triggerPrice,
        requested_stop_loss: params.stopLoss ?? null,
        requested_take_profit: params.takeProfit ?? null,
        idempotency_key: params.idempotencyKey,
        status: 'active',
        created_at: params.now,
        updated_at: params.now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { status: 'active', rejectionCode: null, order: toSummary(inserted) };
  });
}

export interface ModifyPendingOrderParams {
  accountId: string;
  pendingOrderId: string;
  triggerPrice?: string;
  quantity?: string;
  stopLoss?: string | null;
  takeProfit?: string | null;
  market: MarketSnapshot;
  now: Date;
}

export async function modifyPendingOrder(
  db: Db,
  params: ModifyPendingOrderParams,
): Promise<PendingOrderCommandResult> {
  return db.transaction().execute(async (trx) => {
    const account = await lockAccount(trx, params.accountId);
    const existing = await trx
      .selectFrom('app.pending_orders')
      .selectAll()
      .where('id', '=', params.pendingOrderId)
      .where('account_id', '=', params.accountId)
      .executeTakeFirst();

    const reject = (code: string): PendingOrderCommandResult => ({
      status: 'rejected',
      rejectionCode: code,
      order: existing ? toSummary(existing) : null,
    });

    if (!existing) return reject(REJECTION.PENDING_ORDER_NOT_FOUND);
    if (existing.status !== 'active') return reject(REJECTION.PENDING_ORDER_ALREADY_SETTLED);

    const spec = await loadSymbolSpec(trx, account.symbol_spec_set_id, existing.symbol);
    if (!spec) return reject(REJECTION.UNKNOWN_SYMBOL_SPEC);

    if (
      isStale({
        tickTimestamp: params.market.timestamp,
        now: params.now,
        staleThresholdMs: spec.stale_threshold_ms,
      })
    ) {
      return reject(REJECTION.STALE_MARKET_DATA);
    }

    const nextTriggerPrice = params.triggerPrice ?? existing.trigger_price;
    const nextQuantity = params.quantity ?? existing.quantity;

    if (params.triggerPrice !== undefined) {
      const roundedTrigger = roundPriceToTick({
        price: params.triggerPrice,
        pricePrecision: spec.price_precision,
      });
      if (roundedTrigger !== params.triggerPrice) return reject(REJECTION.INVALID_PRICE_PRECISION);
      if (
        !isPendingOrderCreationPriceValid({
          orderType: existing.order_type,
          triggerPrice: params.triggerPrice,
          currentBid: params.market.bid,
          currentAsk: params.market.ask,
        })
      ) {
        return reject(REJECTION.INVALID_TRIGGER_PRICE);
      }
    }
    if (params.quantity !== undefined) {
      if (
        !isQuantityWithinBounds({
          quantity: params.quantity,
          minimumQuantity: spec.minimum_quantity,
          maximumQuantity: spec.maximum_quantity,
          quantityStep: spec.quantity_step,
        })
      ) {
        return reject(REJECTION.INVALID_QUANTITY);
      }
    }

    const updated = await trx
      .updateTable('app.pending_orders')
      .set({
        trigger_price: nextTriggerPrice,
        quantity: nextQuantity,
        requested_stop_loss:
          params.stopLoss !== undefined ? params.stopLoss : existing.requested_stop_loss,
        requested_take_profit:
          params.takeProfit !== undefined ? params.takeProfit : existing.requested_take_profit,
        version: existing.version + 1,
        updated_at: params.now,
      })
      .where('id', '=', existing.id)
      .where('version', '=', existing.version)
      .returningAll()
      .executeTakeFirst();

    if (!updated) return reject(REJECTION.PENDING_ORDER_ALREADY_SETTLED);
    return { status: 'active', rejectionCode: null, order: toSummary(updated) };
  });
}

export interface CancelPendingOrderParams {
  accountId: string;
  pendingOrderId: string;
  now: Date;
}

export async function cancelPendingOrder(
  db: Db,
  params: CancelPendingOrderParams,
): Promise<PendingOrderCommandResult> {
  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom('app.pending_orders')
      .selectAll()
      .where('id', '=', params.pendingOrderId)
      .where('account_id', '=', params.accountId)
      .executeTakeFirst();
    if (!existing) {
      return { status: 'rejected', rejectionCode: REJECTION.PENDING_ORDER_NOT_FOUND, order: null };
    }
    if (existing.status !== 'active') {
      return {
        status: 'rejected',
        rejectionCode: REJECTION.PENDING_ORDER_ALREADY_SETTLED,
        order: toSummary(existing),
      };
    }
    // Race guard: only cancel if still 'active' at the moment of this
    // UPDATE — a concurrent tick-driven trigger could have settled it
    // between the SELECT above and here.
    const updated = await trx
      .updateTable('app.pending_orders')
      .set({ status: 'cancelled', cancelled_at: params.now, updated_at: params.now })
      .where('id', '=', params.pendingOrderId)
      .where('status', '=', 'active')
      .returningAll()
      .executeTakeFirst();
    if (!updated) {
      return {
        status: 'rejected',
        rejectionCode: REJECTION.PENDING_ORDER_ALREADY_SETTLED,
        order: null,
      };
    }
    return { status: 'active', rejectionCode: null, order: toSummary(updated) };
  });
}

export async function cancelAllPendingOrders(
  db: Db,
  params: { accountId: string; now: Date },
): Promise<PendingOrderSummary[]> {
  return db.transaction().execute(async (trx) => {
    const updated = await trx
      .updateTable('app.pending_orders')
      .set({ status: 'cancelled', cancelled_at: params.now, updated_at: params.now })
      .where('account_id', '=', params.accountId)
      .where('status', '=', 'active')
      .returningAll()
      .execute();
    return updated.map(toSummary);
  });
}

export interface TriggerPendingOrdersParams {
  symbol: TradableSymbol;
  market: MarketSnapshot;
  marketBySymbol: Record<TradableSymbol, MarketSnapshot>;
  now: Date;
}

export interface TriggeredPendingOrder {
  accountId: string;
  order: PendingOrderSummary;
  commandResult: TradeCommandResult | null;
}

/**
 * Called by services/realtime on every fresh tick for `symbol` — the only
 * place in this system with live market data. Evaluates every 'active'
 * pending order for that symbol against the fresh bid/ask, and for each
 * one whose trigger condition is met, fills it through openPosition()
 * unchanged (fillPriceOverride carries the same slippage-adjusted price
 * openPosition would have computed itself, clamped for limit orders).
 */
export async function triggerPendingOrders(
  db: Db,
  params: TriggerPendingOrdersParams,
): Promise<TriggeredPendingOrder[]> {
  const rows = await db
    .selectFrom('app.pending_orders')
    .selectAll()
    .where('status', '=', 'active')
    .where('symbol', '=', params.symbol)
    .execute();

  const results: TriggeredPendingOrder[] = [];
  for (const row of rows) {
    const triggered = isPendingOrderTriggered({
      orderType: row.order_type,
      triggerPrice: row.trigger_price,
      currentBid: params.market.bid,
      currentAsk: params.market.ask,
    });
    if (!triggered) continue;

    // Mark TRIGGERED first, with a race guard (status = 'active') — a
    // second tick arriving concurrently for the same symbol must never be
    // able to also see this row as 'active' and trigger it twice. Distinct
    // from FILLED: this row is the durable, persisted proof the trigger
    // condition was met even if the fill step below then rejects.
    const claimed = await db
      .updateTable('app.pending_orders')
      .set({ status: 'triggered', triggered_at: params.now, updated_at: params.now })
      .where('id', '=', row.id)
      .where('status', '=', 'active')
      .returningAll()
      .executeTakeFirst();
    if (!claimed) continue; // another tick evaluation already claimed it.

    const account = await db
      .selectFrom('app.trading_accounts')
      .select('symbol_spec_set_id')
      .where('id', '=', claimed.account_id)
      .executeTakeFirst();
    const spec = account
      ? await loadSymbolSpec(db, account.symbol_spec_set_id, claimed.symbol)
      : null;
    if (!spec) {
      const failed = await db
        .updateTable('app.pending_orders')
        .set({
          status: 'failed',
          rejection_code: REJECTION.UNKNOWN_SYMBOL_SPEC,
          updated_at: params.now,
        })
        .where('id', '=', claimed.id)
        .returningAll()
        .executeTakeFirstOrThrow();
      results.push({
        accountId: claimed.account_id,
        order: toSummary(failed),
        commandResult: null,
      });
      continue;
    }

    const rawFillPrice = computeFillPrice({
      bid: params.market.bid,
      ask: params.market.ask,
      positionSide: claimed.side,
      action: 'open',
      slippagePoints: spec.slippage_points,
      pricePrecision: spec.price_precision,
    });
    const clampedFillPrice = clampPendingOrderFillPrice({
      orderType: claimed.order_type,
      fillPrice: rawFillPrice,
      triggerPrice: claimed.trigger_price,
      pricePrecision: spec.price_precision,
    });

    const commandResult = await openPosition(db, {
      accountId: claimed.account_id,
      // Reuses the pending order's own idempotency key, prefixed —
      // guarantees this exact trigger can never produce two fills even if
      // triggerPendingOrders somehow ran twice for the same row (the
      // status='active' race guard above already prevents that; this is a
      // second, independent layer via openPosition's own idempotency check).
      idempotencyKey: `pending-order:${claimed.id}`,
      symbol: claimed.symbol,
      side: claimed.side,
      quantity: claimed.quantity,
      ...(claimed.requested_stop_loss ? { stopLoss: claimed.requested_stop_loss } : {}),
      ...(claimed.requested_take_profit ? { takeProfit: claimed.requested_take_profit } : {}),
      market: params.market,
      marketBySymbol: params.marketBySymbol,
      now: params.now,
      fillPriceOverride: clampedFillPrice,
    });

    const settledStatus: PendingOrderStatus =
      commandResult.order.status === 'filled' ? 'filled' : 'failed';
    const settled = await db
      .updateTable('app.pending_orders')
      .set({
        status: settledStatus,
        filled_at: settledStatus === 'filled' ? params.now : null,
        execution_order_id: commandResult.order.orderId,
        rejection_code:
          commandResult.order.status === 'rejected' ? commandResult.order.rejectionCode : null,
        trigger_market_sequence: params.market.sequence,
        updated_at: params.now,
      })
      .where('id', '=', claimed.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    results.push({ accountId: claimed.account_id, order: toSummary(settled), commandResult });
  }
  return results;
}

export async function loadActivePendingOrdersForAccount(
  db: Db,
  accountId: string,
): Promise<PendingOrderSummary[]> {
  const rows = await db
    .selectFrom('app.pending_orders')
    .selectAll()
    .where('account_id', '=', accountId)
    .where('status', '=', 'active')
    .orderBy('created_at', 'asc')
    .execute();
  return rows.map(toSummary);
}
