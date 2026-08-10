import type { Db } from './client';

export const EXPOSURE_INCREASE_REJECTION = {
  PAYOUT_FREEZE: 'payout_freeze',
  INTEGRITY_HOLD: 'integrity_hold',
} as const;

export type ExposureIncreaseRejectionCode =
  (typeof EXPOSURE_INCREASE_REJECTION)[keyof typeof EXPOSURE_INCREASE_REJECTION];

export async function findExposureIncreaseRejection(
  trx: Db,
  accountId: string,
): Promise<ExposureIncreaseRejectionCode | null> {
  const account = await trx
    .selectFrom('app.trading_accounts')
    .select('integrity_hold')
    .where('id', '=', accountId)
    .executeTakeFirstOrThrow();
  if (account.integrity_hold) return EXPOSURE_INCREASE_REJECTION.INTEGRITY_HOLD;

  const payoutSensitiveCycle = await trx
    .selectFrom('app.performance_cycles')
    .select('id')
    .where('account_id', '=', accountId)
    .where('status', '=', 'payout_pending')
    .executeTakeFirst();

  return payoutSensitiveCycle ? EXPOSURE_INCREASE_REJECTION.PAYOUT_FREEZE : null;
}
