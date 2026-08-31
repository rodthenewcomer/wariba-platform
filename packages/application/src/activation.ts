import type { Db } from '@wariba/database';

export interface TradingAccountDTO {
  id: string;
  publicId: string;
  nominalBalance: string;
  nominalCurrency: string;
  status: string;
  programType: string;
  productFamily: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_INSTANT';
  policyVersion: string;
  policyStatus: 'published' | 'pilot_ready' | 'retired';
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
  const sourceOrder = params.purchaseOrderId
    ? await db
        .selectFrom('app.purchase_orders')
        .select(['id', 'source_evaluation_account_id'])
        .where('id', '=', params.purchaseOrderId)
        .where('user_id', '=', params.userId)
        .executeTakeFirst()
    : undefined;
  let query = db
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
      'app.trading_accounts.program_type',
      'app.trading_accounts.product_family',
      'app.policy_versions.semantic_version as policyVersion',
      'app.policy_versions.status as policyStatus',
    ])
    .where('user_id', '=', params.userId);
  if (params.purchaseOrderId) {
    query = sourceOrder?.source_evaluation_account_id
      ? query.where('source_evaluation_account_id', '=', sourceOrder.source_evaluation_account_id)
      : query.where('source_purchase_order_id', '=', params.purchaseOrderId);
  }
  const account = await query.orderBy('app.trading_accounts.created_at', 'desc').executeTakeFirst();

  if (!account) return undefined;
  if (
    account.policyStatus !== 'published' &&
    account.policyStatus !== 'pilot_ready' &&
    account.policyStatus !== 'retired'
  ) {
    throw new Error(`Account references a non-public policy status: ${account.policyStatus}.`);
  }

  return {
    id: account.id,
    publicId: account.public_id,
    nominalBalance: account.nominal_balance,
    nominalCurrency: account.currency,
    status: account.status,
    programType: account.program_type,
    productFamily: account.product_family,
    policyVersion: account.policyVersion,
    policyStatus: account.policyStatus,
  };
}
