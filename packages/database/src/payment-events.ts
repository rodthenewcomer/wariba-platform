import type { DbExecutor } from './client';

export interface RecordPaymentEventParams {
  provider: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  signatureValid: boolean;
  purchaseOrderId: string | null;
}

export interface RecordPaymentEventResult {
  isNewEvent: boolean;
}

/**
 * First idempotency line for webhooks: `unique(provider, event_id)` is a
 * real database constraint (see migration), not an application-level
 * check-then-insert — a duplicate delivery cannot slip through a race
 * between the check and the insert the way a `SELECT` guard followed by an
 * `INSERT` could. On conflict, we no-op and report `isNewEvent: false` so
 * the caller returns the original result instead of reprocessing.
 */
export async function recordPaymentEvent(
  db: DbExecutor,
  params: RecordPaymentEventParams,
): Promise<RecordPaymentEventResult> {
  const result = await db
    .insertInto('app.payment_events')
    .values({
      provider: params.provider,
      event_id: params.eventId,
      event_type: params.eventType,
      payload: JSON.stringify(params.payload),
      signature_valid: params.signatureValid,
      purchase_order_id: params.purchaseOrderId,
    })
    .onConflict((oc) => oc.columns(['provider', 'event_id']).doNothing())
    .executeTakeFirst();

  return { isNewEvent: result.numInsertedOrUpdatedRows === 1n };
}
