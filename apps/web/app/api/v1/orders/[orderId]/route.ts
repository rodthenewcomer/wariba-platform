import { NextResponse } from 'next/server';
import { getCommerceOrderStatusForUser } from '@wariba/application';
import { correlationIdFromHeaders, CORRELATION_ID_HEADER } from '@wariba/observability';
import { getDb } from '../../../../../lib/db';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const headers = { [CORRELATION_ID_HEADER]: correlationId };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        error: { code: 'AUTH_REQUIRED', message: 'Connectez-vous.', retryable: false },
        meta: { correlationId },
      },
      { status: 401, headers },
    );
  }
  const { orderId } = await params;
  const order = await getCommerceOrderStatusForUser(getDb(), orderId, user.id);
  if (!order) {
    return NextResponse.json(
      {
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande introuvable.', retryable: false },
        meta: { correlationId },
      },
      { status: 404, headers },
    );
  }
  return NextResponse.json({ data: order, meta: { correlationId } }, { headers });
}
