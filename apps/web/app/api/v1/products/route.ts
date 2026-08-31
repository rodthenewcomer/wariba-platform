import { NextResponse } from 'next/server';
import { correlationIdFromHeaders, CORRELATION_ID_HEADER } from '@wariba/observability';
import { listCanonicalV2Offers } from '@wariba/application';
import { getDb } from '../../../../lib/db';

/**
 * Public product catalog — no auth required (anon has SELECT via the
 * public-reference-data grant migration).
 */
export async function GET(request: Request) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const db = getDb();

  const products = await listCanonicalV2Offers(db);

  return NextResponse.json(
    { data: products, meta: { correlationId } },
    { headers: { [CORRELATION_ID_HEADER]: correlationId } },
  );
}
