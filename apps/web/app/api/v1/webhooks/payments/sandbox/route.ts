import { NextResponse } from 'next/server';
import {
  correlationIdFromHeaders,
  CORRELATION_ID_HEADER,
  createLogger,
} from '@wariba/observability';
import { sandboxWebhookEventSchema } from '@wariba/validation';
import { SandboxPaymentProvider } from '@wariba/adapters';
import { processPaymentWebhookEvent } from '@wariba/application';
import { getDb } from '../../../../../../lib/db';
import { loadWebConfig } from '../../../../../../lib/config';

const logger = createLogger({ service: 'web', module: 'webhooks.payments.sandbox' });

/**
 * Sandbox PSP webhook receiver. Order of operations matters:
 *
 *  1. Read the RAW body and verify its signature BEFORE parsing JSON —
 *     signing a re-serialized object can accept a tampered payload if key
 *     order/whitespace differs from what was actually signed.
 *  2. Delegate to processPaymentWebhookEvent, which owns the real
 *     idempotency gate (`unique(provider, event_id)`), the amount/currency
 *     check, the guarded status transitions, and activation.
 */
export async function POST(request: Request) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const headers = { [CORRELATION_ID_HEADER]: correlationId };
  const config = loadWebConfig();
  const provider = new SandboxPaymentProvider(config.SANDBOX_WEBHOOK_SECRET);
  const db = getDb();

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-wariba-signature') ?? '';
  const signatureValid = provider.verifyWebhookSignature(rawBody, signatureHeader);

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    logger.warn('payment_webhook.invalid_json', { correlationId });
    return NextResponse.json(
      {
        error: { code: 'PAYMENT_WEBHOOK_INVALID', message: 'Invalid payload.', retryable: false },
        meta: { correlationId },
      },
      { status: 400, headers },
    );
  }

  const parsed = sandboxWebhookEventSchema.safeParse(parsedBody);
  if (!parsed.success) {
    logger.warn('payment_webhook.invalid_shape', { correlationId });
    return NextResponse.json(
      {
        error: { code: 'PAYMENT_WEBHOOK_INVALID', message: 'Invalid payload.', retryable: false },
        meta: { correlationId },
      },
      { status: 400, headers },
    );
  }

  const event = parsed.data;

  const result = await processPaymentWebhookEvent(db, {
    provider: 'sandbox',
    eventId: event.eventId,
    eventType: event.eventType,
    purchaseOrderId: event.purchaseOrderId,
    amount: event.amount,
    currency: event.currency,
    payload: parsedBody,
    signatureValid,
  });

  switch (result.kind) {
    case 'duplicate':
      // Duplicate delivery — the constraint already stopped it from being
      // recorded twice. Respond success (the provider should stop retrying)
      // without touching anything else.
      logger.info('payment_webhook.duplicate', { correlationId, eventId: event.eventId });
      return NextResponse.json(
        { data: { received: true, duplicate: true }, meta: { correlationId } },
        { headers },
      );

    case 'invalid_signature':
      logger.warn('payment_webhook.invalid_signature', { correlationId, eventId: event.eventId });
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_WEBHOOK_INVALID',
            message: 'Invalid signature.',
            retryable: false,
          },
          meta: { correlationId },
        },
        { status: 401, headers },
      );

    case 'unknown_order':
      logger.error('payment_webhook.unknown_order', {
        correlationId,
        orderId: event.purchaseOrderId,
      });
      return NextResponse.json(
        {
          error: { code: 'PAYMENT_WEBHOOK_INVALID', message: 'Unknown order.', retryable: false },
          meta: { correlationId },
        },
        { status: 404, headers },
      );

    case 'amount_mismatch':
      logger.error('payment_webhook.amount_mismatch', {
        correlationId,
        orderId: event.purchaseOrderId,
        expected: result.expected,
        received: result.received,
      });
      return NextResponse.json(
        {
          error: { code: 'PAYMENT_AMOUNT_MISMATCH', message: 'Amount mismatch.', retryable: false },
          meta: { correlationId },
        },
        { status: 409, headers },
      );

    case 'failed_recorded':
      logger.info('payment.failed', { correlationId, orderId: event.purchaseOrderId });
      return NextResponse.json({ data: { received: true }, meta: { correlationId } }, { headers });

    case 'confirmed':
      logger.info('evaluation.activated', {
        correlationId,
        orderId: event.purchaseOrderId,
        accountId: result.account.id,
        alreadyExisted: result.account.alreadyExisted,
      });
      return NextResponse.json(
        { data: { received: true, accountId: result.account.id }, meta: { correlationId } },
        { headers },
      );
  }
}
