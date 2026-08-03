import type { Db } from '@wariba/database';

export interface TradingAccountDTO {
  id: string;
  publicId: string;
  nominalBalance: string;
  nominalCurrency: string;
  status: string;
  policyVersion: string;
  policyStatus: 'published' | 'retired';
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
    .innerJoin(
      'app.policy_versions',
      'app.policy_versions.id',
      'app.trading_accounts.policy_version_id',
    )
    .select([
      'app.trading_accounts.id',
      'app.trading_accounts.public_id',
      'app.trading_accounts.nominal_balance',
      'app.trading_accounts.currency',
      'app.trading_accounts.status',
      'app.policy_versions.semantic_version as policyVersion',
      'app.policy_versions.status as policyStatus',
    ])
    .where('user_id', '=', params.userId)
    .$if(Boolean(params.purchaseOrderId), (qb) =>
      qb.where('source_purchase_order_id', '=', params.purchaseOrderId as string),
    )
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (!account) return undefined;
  if (account.policyStatus !== 'published' && account.policyStatus !== 'retired') {
    throw new Error(`Account references a non-public policy status: ${account.policyStatus}.`);
  }

  return {
    id: account.id,
    publicId: account.public_id,
    nominalBalance: account.nominal_balance,
    nominalCurrency: account.currency,
    status: account.status,
    policyVersion: account.policyVersion,
    policyStatus: account.policyStatus,
  };
}
