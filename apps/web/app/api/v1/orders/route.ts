import { NextResponse } from 'next/server';
import {
  correlationIdFromHeaders,
  CORRELATION_ID_HEADER,
  createLogger,
} from '@wariba/observability';
import { checkoutInputSchema } from '@wariba/validation';
import { SandboxPaymentProvider } from '@wariba/adapters';
import { createPurchaseOrder, recordPaymentAttempt } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getDb } from '../../../../lib/db';
import { loadWebConfig } from '../../../../lib/config';

const logger = createLogger({ service: 'web', module: 'orders' });

/**
 * Creates a purchase order + initiates a sandbox payment. Price and
 * currency are looked up server-side from product_version — the request
 * body has no field for either (checkoutInputSchema's shape enforces
 * this at the type level). AGENTS.md invariant: "prix serveur uniquement."
 */
export async function POST(request: Request) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const headers = { [CORRELATION_ID_HEADER]: correlationId };

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

  const body: unknown = await request.json().catch(() => null);
  const parsed = checkoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Requête invalide.',
          retryable: false,
          details: parsed.error.flatten(),
        },
        meta: { correlationId },
      },
      { status: 400, headers },
    );
  }

  const db = getDb();
  const result = await createPurchaseOrder(db, {
    userId: user.id,
    productCode: parsed.data.productCode,
    idempotencyKey: parsed.data.idempotencyKey,
  });

  if (result.kind === 'product_not_available') {
    return NextResponse.json(
      {
        error: {
          code: 'PRODUCT_NOT_AVAILABLE',
          message: "Cette offre n'est pas disponible.",
          retryable: false,
        },
        meta: { correlationId },
      },
      { status: 404, headers },
    );
  }

  const { order } = result;
  if (result.kind === 'created') {
    logger.info('order.created', { correlationId, orderId: order.id, userId: user.id });
  }

  const config = loadWebConfig();
  const provider = new SandboxPaymentProvider(config.SANDBOX_WEBHOOK_SECRET);
  const initiation = await provider.initiate({
    purchaseOrderId: order.id,
    amount: order.totalAmount,
    currency: order.totalCurrency,
  });

  await recordPaymentAttempt(db, {
    purchaseOrderId: order.id,
    providerReference: initiation.providerReference,
    amount: order.totalAmount,
    currency: order.totalCurrency,
  });

  return NextResponse.json(
    {
      data: {
        orderId: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        totalCurrency: order.totalCurrency,
        redirectUrl: initiation.redirectUrl,
      },
      meta: { correlationId },
    },
    { headers },
  );
}
