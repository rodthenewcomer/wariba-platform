import { z } from 'zod';

/**
 * Every WebSocket message — System Architecture §60. `sequence` is
 * channel-scoped: market channels use the simulator's in-memory per-symbol
 * tick counter, account channels reuse trading_accounts.version (TRD-023).
 * A client tracks the last sequence it saw per channel to detect gaps —
 * it never reconstructs balance or position state from the tick stream
 * alone (Engineering Constitution §24.5); a gap means "resync", not "guess".
 */
export const messageEnvelopeSchema = z.object({
  type: z.string().min(1),
  version: z.number().int().positive(),
  sequence: z.number().int().nonnegative(),
  occurredAt: z.string().datetime(),
  correlationId: z.string().min(1),
  payload: z.unknown(),
});
export type MessageEnvelope = z.infer<typeof messageEnvelopeSchema>;

export function buildEnvelope<T>(params: {
  type: string;
  sequence: number;
  correlationId: string;
  payload: T;
}): MessageEnvelope {
  return {
    type: params.type,
    version: 1,
    sequence: params.sequence,
    occurredAt: new Date().toISOString(),
    correlationId: params.correlationId,
    payload: params.payload,
  };
}
