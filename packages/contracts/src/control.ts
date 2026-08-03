import { z } from 'zod';

/**
 * Explicit subscribe — a client only receives events for channels it asked
 * for (Engineering Constitution §24: "explicit subscribe", not implicit
 * broadcast-everything).
 */
export const subscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  channels: z.array(z.string().min(1)).min(1),
});
export type SubscribeMessage = z.infer<typeof subscribeMessageSchema>;

export const unsubscribeMessageSchema = z.object({
  type: z.literal('unsubscribe'),
  channels: z.array(z.string().min(1)).min(1),
});
export type UnsubscribeMessage = z.infer<typeof unsubscribeMessageSchema>;

export const pingMessageSchema = z.object({
  type: z.literal('ping'),
});
export const pongMessageSchema = z.object({
  type: z.literal('pong'),
  serverTime: z.string().datetime(),
});

/**
 * Sent once per channel right after a (re)subscribe — full account/market
 * state rather than sequence-anchored replay (System Architecture §62-64
 * fallback path: "full snapshot + explicit sequence reset"). Simpler than
 * arbitrary-sequence replay and still spec-compliant for V1.
 */
export const resyncRequiredMessageSchema = z.object({
  type: z.literal('resync_required'),
  channel: z.string().min(1),
  reason: z.enum(['initial_subscribe', 'gap_detected', 'reconnect']),
});
export type ResyncRequiredMessage = z.infer<typeof resyncRequiredMessageSchema>;
