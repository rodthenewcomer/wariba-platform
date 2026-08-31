import { NextResponse } from 'next/server';
import { SandboxPaymentProvider } from '@wariba/adapters';
import {
  acceptSandboxDisclosure,
  createCanonicalV2PurchaseOrder,
  getCanonicalV2Offer,
  getCommerceOrderStatusForUser,
  preparePurchaseOrderForPayment,
  recordPaymentAttempt,
} from '@wariba/application';
import {
  correlationIdFromHeaders,
  CORRELATION_ID_HEADER,
  createLogger,
} from '@wariba/observability';
import { checkoutInputSchema } from '@wariba/validation';
import { getDb } from '../../../../lib/db';
import { isLocalSandboxCommerce, loadWebConfig } from '../../../../lib/config';
import { hasTrustedMutationOrigin } from '../../../../lib/request-security';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

const logger = createLogger({ service: 'web', module: 'commerce.orders.v2' });

function errorResponse(
  code: string,
  message: string,
  status: number,
  correlationId: string,
  retryable = false,
) {
  return NextResponse.json(
    { error: { code, message, retryable }, meta: { correlationId } },
    { status, headers: { [CORRELATION_ID_HEADER]: correlationId } },
  );
}

/** Server-priced V2 order creation/resume. No amount or currency crosses this boundary. */
export async function POST(request: Request) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const headers = { [CORRELATION_ID_HEADER]: correlationId };
  const config = loadWebConfig();

  if (!hasTrustedMutationOrigin(request, config.APP_BASE_URL)) {
    return errorResponse('ORIGIN_NOT_ALLOWED', 'Origine de requête refusée.', 403, correlationId);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse('AUTH_REQUIRED', 'Connectez-vous pour continuer.', 401, correlationId);
  }

  const parsed = checkoutInputSchema.safeParse(await request.json().catch(() => null));
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
  const localSandbox = isLocalSandboxCommerce(config);
  let orderId: string;

  if (parsed.data.kind === 'initial_purchase') {
    const offer = await getCanonicalV2Offer(db, parsed.data.offerId);
    if (!offer) {
      return errorResponse(
        'OFFER_NOT_FOUND',
        'Cette offre V2 est introuvable.',
        404,
        correlationId,
      );
    }
    if (!localSandbox && !offer.purchaseEnabled) {
      return errorResponse(
        'PURCHASE_NOT_OPEN',
        "Cette offre est visible au catalogue, mais l'achat public n'est pas encore ouvert.",
        409,
        correlationId,
      );
    }
    await acceptSandboxDisclosure(db, {
      userId: user.id,
      locale: 'fr',
      policyVersionId: offer.policyVersionId,
      correlationId,
    });
    const created = await createCanonicalV2PurchaseOrder(db, {
      userId: user.id,
      offerId: offer.offerId,
      idempotencyKey: parsed.data.idempotencyKey,
      countryCode: '*',
      channel: 'web',
      capabilityMode: localSandbox ? 'local_sandbox' : 'public',
    });
    if (created.kind === 'offer_not_found') {
      return errorResponse(
        'OFFER_NOT_FOUND',
        'Cette offre V2 est introuvable.',
        404,
        correlationId,
      );
    }
    if (created.kind === 'capability_blocked') {
      return errorResponse(
        'PURCHASE_NOT_OPEN',
        "L'achat public de cette offre n'est pas encore ouvert.",
        409,
        correlationId,
      );
    }
    if (created.kind === 'consent_required') {
      return errorResponse(
        'CONSENT_REQUIRED',
        'Acceptez la divulgation du compte simulé pour continuer.',
        409,
        correlationId,
      );
    }
    orderId = created.orderId;
    if (created.kind === 'created') {
      logger.info('commerce_order_created', {
        correlationId,
        orderId,
        offerId: offer.offerId,
        productFamily: offer.productFamily,
      });
    }
  } else if (parsed.data.kind === 'flex_activation') {
    const activation = await getCommerceOrderStatusForUser(
      db,
      parsed.data.activationOrderId,
      user.id,
    );
    if (!activation || activation.orderKind !== 'flex_activation') {
      return errorResponse(
        'ACTIVATION_NOT_FOUND',
        "Cette activation n'existe pas.",
        404,
        correlationId,
      );
    }
    const offer = await getCanonicalV2Offer(db, `FLEX-${activation.productCode.replace('K', '')}`);
    if (!localSandbox && !offer?.activationEnabled) {
      return errorResponse(
        'ACTIVATION_NOT_OPEN',
        "L'activation publique n'est pas encore ouverte.",
        409,
        correlationId,
      );
    }
    await acceptSandboxDisclosure(db, {
      userId: user.id,
      locale: 'fr',
      policyVersionId: activation.policyVersionId,
      correlationId,
    });
    orderId = activation.id;
  } else {
    const existing = await getCommerceOrderStatusForUser(db, parsed.data.orderId, user.id);
    if (!existing) {
      return errorResponse('ORDER_NOT_FOUND', 'Commande introuvable.', 404, correlationId);
    }
    orderId = existing.id;
  }

  const prepared = await preparePurchaseOrderForPayment(db, { orderId, userId: user.id });
  if (prepared.kind === 'not_found') {
    return errorResponse('ORDER_NOT_FOUND', 'Commande introuvable.', 404, correlationId);
  }
  if (prepared.kind === 'expired') {
    return errorResponse(
      'ACTIVATION_EXPIRED',
      "Le délai d'activation FLEX est dépassé.",
      410,
      correlationId,
    );
  }
  if (prepared.kind === 'already_processed') {
    return NextResponse.json(
      {
        data: {
          orderId,
          status: prepared.status,
          redirectUrl: `/bienvenue?order=${orderId}`,
        },
        meta: { correlationId },
      },
      { headers },
    );
  }
  if (prepared.kind === 'unavailable') {
    return errorResponse(
      'ORDER_NOT_PAYABLE',
      'Cette commande ne peut pas être payée.',
      409,
      correlationId,
    );
  }

  const provider = new SandboxPaymentProvider(config.SANDBOX_WEBHOOK_SECRET);
  const initiation = await provider.initiate({
    purchaseOrderId: prepared.order.id,
    amount: prepared.order.totalAmount,
    currency: prepared.order.totalCurrency,
  });
  await recordPaymentAttempt(db, {
    purchaseOrderId: prepared.order.id,
    providerReference: initiation.providerReference,
    amount: prepared.order.totalAmount,
    currency: prepared.order.totalCurrency,
  });

  return NextResponse.json(
    {
      data: {
        orderId: prepared.order.id,
        status: prepared.order.status,
        totalAmount: prepared.order.totalAmount,
        totalCurrency: prepared.order.totalCurrency,
        redirectUrl: initiation.redirectUrl,
      },
      meta: { correlationId },
    },
    { headers },
  );
}
