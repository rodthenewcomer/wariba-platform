import { NextResponse, type NextRequest } from 'next/server';
import { correlationIdFromHeaders, CORRELATION_ID_HEADER } from '@wariba/observability';

/**
 * Foundation-phase middleware: correlation ID propagation only.
 * Auth/session enforcement is added in Prompt 03 (Identity, Commerce & Activation) —
 * see WARIBA Prompt Pack v1.0, Prompt 03, and Engineering Constitution §21.
 */
export function middleware(request: NextRequest) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const response = NextResponse.next();
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
