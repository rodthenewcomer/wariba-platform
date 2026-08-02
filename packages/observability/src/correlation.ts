/**
 * Correlation ID propagation.
 * WARIBA System Architecture §77 — généré à l'entrée (HTTP/WS/webhook/worker), propagé partout.
 *
 * Uses the Web Crypto global (available in Node 20+, browsers, and the
 * Next.js Edge Runtime) instead of `node:crypto`, so this also works from
 * Next.js middleware, which does not run in the Node runtime.
 */

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export const CORRELATION_ID_HEADER = 'x-wariba-correlation-id';

export function correlationIdFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string {
  const value = headers[CORRELATION_ID_HEADER];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return createCorrelationId();
}
