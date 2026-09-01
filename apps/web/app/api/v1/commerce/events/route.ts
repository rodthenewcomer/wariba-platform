import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  correlationIdFromHeaders,
  CORRELATION_ID_HEADER,
  createLogger,
} from '@wariba/observability';
import { canonicalOfferIdSchema } from '@wariba/validation';
import { loadWebConfig } from '../../../../../lib/config';
import { hasTrustedMutationOrigin } from '../../../../../lib/request-security';

const logger = createLogger({ service: 'web', module: 'commerce.analytics' });
const eventSchema = z
  .object({
    event: z.enum([
      'commerce_catalog_viewed',
      'commerce_family_selected',
      'commerce_size_selected',
      'commerce_checkout_started',
      'commerce_checkout_submitted',
      'commerce_payment_started',
      'commerce_payment_result',
      // /offres V2 funnel events — see commerce-analytics.ts.
      'commerce_offers_primary_cta_clicked',
      'commerce_offers_secondary_cta_clicked',
      'commerce_offer_cta_clicked',
      'commerce_rules_clicked',
      'commerce_payouts_clicked',
      'commerce_warix_clicked',
      // Decision Engine V2 — display/view preferences.
      'commerce_display_mode_changed',
      'commerce_view_mode_changed',
      'commerce_performance_rules_expanded',
      'commerce_performance_rules_collapsed',
    ]),
    offerId: canonicalOfferIdSchema.optional(),
    source: z.string().max(80).optional(),
    result: z.enum(['confirmed', 'failed']).optional(),
    utmSource: z.string().max(80).optional(),
    utmCampaign: z.string().max(80).optional(),
    ctaLocation: z.string().max(40).optional(),
    mode: z.string().max(20).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const headers = { [CORRELATION_ID_HEADER]: correlationId };
  const config = loadWebConfig();
  if (!hasTrustedMutationOrigin(request, config.APP_BASE_URL)) {
    return NextResponse.json({ error: { code: 'ORIGIN_NOT_ALLOWED' } }, { status: 403, headers });
  }
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400, headers });
  }
  logger.info(parsed.data.event, {
    correlationId,
    ...(parsed.data.offerId && { offerId: parsed.data.offerId }),
    ...(parsed.data.source && { source: parsed.data.source }),
    ...(parsed.data.result && { result: parsed.data.result }),
    ...(parsed.data.utmSource && { utmSource: parsed.data.utmSource }),
    ...(parsed.data.utmCampaign && { utmCampaign: parsed.data.utmCampaign }),
    ...(parsed.data.ctaLocation && { ctaLocation: parsed.data.ctaLocation }),
    ...(parsed.data.mode && { mode: parsed.data.mode }),
  });
  return NextResponse.json({ data: { accepted: true }, meta: { correlationId } }, { headers });
}
