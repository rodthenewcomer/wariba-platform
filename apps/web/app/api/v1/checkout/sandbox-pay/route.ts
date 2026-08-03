import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { correlationIdFromHeaders, CORRELATION_ID_HEADER } from '@wariba/observability';
import { SandboxPaymentProvider } from '@wariba/adapters';
import { getOrderForUser } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import { getDb } from '../../../../../lib/db';
import { loadWebConfig } from '../../../../../lib/config';
import { hasTrustedMutationOrigin } from '../../../../../lib/request-security';

const bodySchema = z.object({
  orderId: z.string().uuid(),
  outcome: z.enum(['confirmed', 'failed']),
});

/**
 * Test-only endpoint standing in for the PSP's own systems: signs and
 * fires the exact same webhook a real sandbox PSP would send us, at our
 * own webhook URL. This is the ONLY place in the app that constructs a
 * signed webhook — the checkout/pay UI pages never touch the secret.
 * A real PSP integration removes this file entirely; nothing downstream
 * changes, since the webhook handler doesn't know or care who signed the
 * request, only that the signature is valid.
 */
export async function POST(request: Request) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const headers = { [CORRELATION_ID_HEADER]: correlationId };
  const config = loadWebConfig();

  if (!hasTrustedMutationOrigin(request, config.APP_BASE_URL)) {
    return NextResponse.json(
      {
        error: {
          code: 'ORIGIN_NOT_ALLOWED',
          message: 'Origine de requête refusée.',
          retryable: false,
        },
        meta: { correlationId },
      },
      { status: 403, headers },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Connectez-vous pour continuer.',
          retryable: false,
        },
        meta: { correlationId },
      },
      { status: 401, headers },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: { code: 'VALIDATION_ERROR', message: 'Requête invalide.', retryable: false },
        meta: { correlationId },
      },
      { status: 400, headers },
    );
  }

  const db = getDb();
  const order = await getOrderForUser(db, parsed.data.orderId, user.id);

  if (!order) {
    return NextResponse.json(
      {
        error: { code: 'NOT_FOUND', message: 'Commande introuvable.', retryable: false },
        meta: { correlationId },
      },
      { status: 404, headers },
    );
  }

  const provider = new SandboxPaymentProvider(config.SANDBOX_WEBHOOK_SECRET);

  const eventBody = JSON.stringify({
    eventId: randomUUID(),
    eventType: parsed.data.outcome === 'confirmed' ? 'payment.confirmed' : 'payment.failed',
    purchaseOrderId: order.id,
    amount: order.totalAmount,
    currency: order.totalCurrency,
    occurredAt: new Date().toISOString(),
  });
  const signature = provider.signWebhookBody(eventBody);

  const webhookResponse = await fetch(
    new URL('/api/v1/webhooks/payments/sandbox', config.APP_BASE_URL),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wariba-signature': signature,
        [CORRELATION_ID_HEADER]: correlationId,
      },
      body: eventBody,
    },
  );

  if (!webhookResponse.ok) {
    return NextResponse.json(
      {
        error: {
          code: 'PAYMENT_WEBHOOK_INVALID',
          message: 'Le paiement simulé a échoué.',
          retryable: true,
        },
        meta: { correlationId },
      },
      { status: 502, headers },
    );
  }

  return NextResponse.json({ data: { simulated: true }, meta: { correlationId } }, { headers });
}
