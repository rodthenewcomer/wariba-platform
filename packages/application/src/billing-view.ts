import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';

/**
 * What the trader has bought, and what it cost.
 *
 * Reads `app.purchase_orders`, `app.receipts` and `app.payment_attempts` —
 * the rows the commerce flow already writes. Nothing is reconstructed and
 * nothing is estimated: an order with no receipt shows no receipt.
 *
 * ## Payment methods
 *
 * There is no stored-payment-method table, and there will not be one holding
 * card data. Cards belong to the payment provider; a platform that stores them
 * has taken on PCI scope it has no reason to want. So the billing surface
 * lists what was *paid with* — the provider and the attempt outcome recorded
 * on each order — and the saved-method manager arrives with the provider
 * integration that can vault them. `SAVED_PAYMENT_METHODS_AVAILABLE` says so
 * in one place rather than each screen guessing.
 */

export const SAVED_PAYMENT_METHODS_AVAILABLE = false;

export type OrderDisplayStatus =
  | 'created'
  | 'pending_payment'
  | 'paid'
  | 'fulfilled'
  | 'payment_failed'
  | 'cancelled'
  | 'refunded';

export interface BillingOrder {
  id: string;
  /** `WARIBA ONE 25K` — what the trader thinks they bought. */
  productLabel: string;
  amountFormatted: string;
  currency: string;
  status: OrderDisplayStatus;
  statusLabel: string;
  statusTone: 'neutral' | 'progress' | 'success' | 'danger';
  dateLabel: string;
  createdAt: string;
  /** Present once a receipt exists. */
  receiptId: string | null;
  receiptDateLabel: string | null;
  /** The provider that took the money, when an attempt recorded one. */
  paymentProvider: string | null;
}

/**
 * The order history, counted.
 *
 * §21 asks for paid/fulfilled/refunded counts "if derivable". They are — every
 * order already carries a resolved `status` — so they are derived here rather
 * than in the page, for the same reason the journal's totals are: `apps/web`
 * carries no decimal library, and a count rendered beside a total that was
 * computed somewhere else is a pair that can disagree.
 *
 * `fulfilled` is counted separately from `paid` because they mean different
 * things to a trader: paid is money taken, fulfilled is an account they can
 * actually trade. An order can sit at paid while activation is still running,
 * and collapsing the two hides exactly the state someone would open this page
 * to check.
 */
export interface BillingSummary {
  orderCount: number;
  /** Paid but not yet activated. */
  paidCount: number;
  /** Paid and the account exists. */
  fulfilledCount: number;
  refundedCount: number;
  failedCount: number;
}

export interface BillingView {
  orders: BillingOrder[];
  totalSpentFormatted: string;
  summary: BillingSummary;
  /** True when the trader has never bought anything. */
  empty: boolean;
}

const STATUS: Record<OrderDisplayStatus, { label: string; tone: BillingOrder['statusTone'] }> = {
  created: { label: 'Créée', tone: 'neutral' },
  pending_payment: { label: 'Paiement en attente', tone: 'progress' },
  paid: { label: 'Payée', tone: 'success' },
  fulfilled: { label: 'Compte activé', tone: 'success' },
  payment_failed: { label: 'Paiement échoué', tone: 'danger' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
  refunded: { label: 'Remboursée', tone: 'neutral' },
};

function formatMoney(amount: string, currency: string): string {
  return `${new Decimal(amount).toDecimalPlaces(2).toNumber().toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export async function buildBillingView(db: Db, params: { userId: string }): Promise<BillingView> {
  const rows = await db
    .selectFrom('app.purchase_orders')
    .innerJoin(
      'app.product_versions',
      'app.product_versions.id',
      'app.purchase_orders.product_version_id',
    )
    .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
    .leftJoin('app.receipts', 'app.receipts.purchase_order_id', 'app.purchase_orders.id')
    .leftJoin(
      'app.payment_attempts',
      'app.payment_attempts.purchase_order_id',
      'app.purchase_orders.id',
    )
    .select([
      'app.purchase_orders.id as id',
      'app.purchase_orders.status as status',
      'app.purchase_orders.total_amount as amount',
      'app.purchase_orders.total_currency as currency',
      'app.purchase_orders.created_at as createdAt',
      'app.products.code as productCode',
      'app.receipts.id as receiptId',
      'app.receipts.issued_at as receiptIssuedAt',
      'app.payment_attempts.provider as provider',
    ])
    .where('app.purchase_orders.user_id', '=', params.userId)
    .orderBy('app.purchase_orders.created_at', 'desc')
    .execute();

  /*
   * One row per order.
   *
   * The join fans out: an order retried three times has three payment
   * attempts, and would otherwise appear three times in a purchase history.
   * The first row per id wins, which — given the `created_at desc` ordering
   * and the provider being the same across retries — is the order itself.
   */
  const seen = new Set<string>();
  const orders: BillingOrder[] = [];
  let total = new Decimal(0);

  for (const row of rows) {
    const id = row.id as string;
    if (seen.has(id)) continue;
    seen.add(id);

    const status = (row.status as OrderDisplayStatus) ?? 'created';
    const meta = STATUS[status] ?? STATUS.created;
    const createdAt = row.createdAt as Date;

    if (status === 'paid' || status === 'fulfilled') {
      total = total.plus(new Decimal(row.amount as string));
    }

    orders.push({
      id,
      productLabel: `WARIBA ONE ${row.productCode as string}`,
      amountFormatted: formatMoney(row.amount as string, row.currency as string),
      currency: row.currency as string,
      status,
      statusLabel: meta.label,
      statusTone: meta.tone,
      dateLabel: createdAt.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      createdAt: createdAt.toISOString(),
      receiptId: (row.receiptId as string | null) ?? null,
      receiptDateLabel: row.receiptIssuedAt
        ? (row.receiptIssuedAt as Date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : null,
      paymentProvider: (row.provider as string | null) ?? null,
    });
  }

  return {
    orders,
    totalSpentFormatted: formatMoney(total.toFixed(2), orders[0]?.currency ?? 'USD'),
    summary: summarizeOrders(orders),
    empty: orders.length === 0,
  };
}

/** Counts by resolved status. Exported so it is testable without a database. */
export function summarizeOrders(orders: readonly BillingOrder[]): BillingSummary {
  const count = (status: OrderDisplayStatus) =>
    orders.filter((order) => order.status === status).length;
  return {
    orderCount: orders.length,
    paidCount: count('paid'),
    fulfilledCount: count('fulfilled'),
    refundedCount: count('refunded'),
    failedCount: count('payment_failed'),
  };
}
