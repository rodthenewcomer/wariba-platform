import type { Db } from '@wariba/database';

export interface TradingAccountDTO {
  publicId: string;
  nominalBalance: string;
  nominalCurrency: string;
  status: string;
}

export interface GetLatestAccountForUserParams {
  userId: string;
  purchaseOrderId?: string;
}

/**
 * Used by the welcome page right after checkout: if a purchaseOrderId is
 * given, prefer the account tied to that specific order (the fulfillment
 * may still be in flight even if the user already has older accounts).
 */
export async function getLatestAccountForUser(
  db: Db,
  params: GetLatestAccountForUserParams,
): Promise<TradingAccountDTO | undefined> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .selectAll()
    .where('user_id', '=', params.userId)
    .$if(Boolean(params.purchaseOrderId), (qb) =>
      qb.where('source_purchase_order_id', '=', params.purchaseOrderId as string),
    )
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  return account
    ? {
        publicId: account.public_id,
        nominalBalance: account.nominal_balance,
        nominalCurrency: account.currency,
        status: account.status,
      }
    : undefined;
}
