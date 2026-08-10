import type { Db } from './client';
import type { TradableSymbol, TradeOrderStatusColumn, TradeOrderTypeColumn } from './schema';

/**
 * Prompt 09 — the platform-wide order explorer.
 *
 * The account detail page already answers "what did this account do". This
 * answers the other operational question: "what is happening across the
 * platform right now", which is how support finds a rejection pattern or a
 * symbol behaving badly without knowing which account to open first.
 *
 * Read-only. Orders are execution evidence: Control inspects them and never
 * cancels, replays, edits or deletes one. The trader command path and the
 * fencing-protected market trigger remain the only writers.
 *
 * Filtered, counted and paged in PostgreSQL — the browser never receives the
 * whole order history.
 */
export const TRADE_ORDER_STATUSES: readonly TradeOrderStatusColumn[] = [
  'received',
  'validated',
  'accepted',
  'filled',
  'rejected',
  'cancelled',
];

export const TRADE_ORDER_TYPES: readonly TradeOrderTypeColumn[] = [
  'market_open',
  'partial_close',
  'full_close',
  'close_all',
  'modify_sl',
  'modify_tp',
];

export interface ControlOrderFilters {
  status?: TradeOrderStatusColumn;
  orderType?: TradeOrderTypeColumn;
  symbol?: TradableSymbol;
  /** Matches the account public id as literal text. */
  accountPublicId?: string;
  /** Only orders carrying a rejection code. */
  rejectedOnly?: boolean;
  receivedFrom?: Date;
  receivedTo?: Date;
}

export interface ControlOrderRow {
  id: string;
  accountId: string;
  accountPublicId: string;
  orderType: TradeOrderTypeColumn;
  symbol: TradableSymbol | null;
  side: string | null;
  status: TradeOrderStatusColumn;
  requestedQuantity: string | null;
  filledQuantity: string;
  rejectionCode: string | null;
  positionId: string | null;
  receivedAt: Date;
  completedAt: Date | null;
}

export interface ControlOrderPage {
  orders: readonly ControlOrderRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const CONTROL_ORDERS_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function searchControlOrders(
  db: Db,
  params: { filters?: ControlOrderFilters; page?: number; pageSize?: number } = {},
): Promise<ControlOrderPage> {
  const filters = params.filters ?? {};
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? CONTROL_ORDERS_PAGE_SIZE),
  );

  let base = db
    .selectFrom('app.trade_orders')
    .innerJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.trade_orders.account_id');

  if (filters.status) base = base.where('app.trade_orders.status', '=', filters.status);
  if (filters.orderType) base = base.where('app.trade_orders.order_type', '=', filters.orderType);
  if (filters.symbol) base = base.where('app.trade_orders.symbol', '=', filters.symbol);
  if (filters.accountPublicId) {
    base = base.where('app.trading_accounts.public_id', '=', filters.accountPublicId);
  }
  if (filters.rejectedOnly) base = base.where('app.trade_orders.rejection_code', 'is not', null);
  if (filters.receivedFrom) {
    base = base.where('app.trade_orders.received_at', '>=', filters.receivedFrom);
  }
  if (filters.receivedTo)
    base = base.where('app.trade_orders.received_at', '<=', filters.receivedTo);

  const [rows, totals] = await Promise.all([
    base
      .select([
        'app.trade_orders.id',
        'app.trade_orders.account_id',
        'app.trading_accounts.public_id',
        'app.trade_orders.order_type',
        'app.trade_orders.symbol',
        'app.trade_orders.side',
        'app.trade_orders.status',
        'app.trade_orders.requested_quantity',
        'app.trade_orders.filled_quantity',
        'app.trade_orders.rejection_code',
        'app.trade_orders.position_id',
        'app.trade_orders.received_at',
        'app.trade_orders.completed_at',
      ])
      .orderBy('app.trade_orders.received_at', 'desc')
      .orderBy('app.trade_orders.id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute(),
    base.select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
  ]);

  return {
    orders: rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      accountPublicId: row.public_id,
      orderType: row.order_type,
      symbol: row.symbol,
      side: row.side,
      status: row.status,
      requestedQuantity: row.requested_quantity,
      filledQuantity: row.filled_quantity,
      rejectionCode: row.rejection_code,
      positionId: row.position_id,
      receivedAt: row.received_at,
      completedAt: row.completed_at,
    })),
    total: Number(totals?.count ?? 0),
    page,
    pageSize,
  };
}

export interface ControlTradingSummary {
  openPositionCount: number;
  activePendingOrderCount: number;
  rejectedOrdersLast24h: number;
  queuedReductionCount: number;
}

/**
 * Platform-wide operational counters.
 *
 * Counted in the database rather than derived from the current page, so the
 * headline figures describe the platform and not the twenty-five rows an
 * operator happens to be looking at.
 */
export async function loadControlTradingSummary(db: Db): Promise<ControlTradingSummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [positions, pending, rejected, reductions] = await Promise.all([
    db
      .selectFrom('app.positions')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('status', '=', 'open')
      .executeTakeFirst(),
    db
      .selectFrom('app.pending_orders')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('status', '=', 'active')
      .executeTakeFirst(),
    db
      .selectFrom('app.trade_orders')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('rejection_code', 'is not', null)
      .where('received_at', '>=', since)
      .executeTakeFirst(),
    db
      .selectFrom('app.position_reduction_queue')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('status', '=', 'queued')
      .executeTakeFirst(),
  ]);

  return {
    openPositionCount: Number(positions?.count ?? 0),
    activePendingOrderCount: Number(pending?.count ?? 0),
    rejectedOrdersLast24h: Number(rejected?.count ?? 0),
    queuedReductionCount: Number(reductions?.count ?? 0),
  };
}
