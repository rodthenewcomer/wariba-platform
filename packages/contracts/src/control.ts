import { z } from 'zod';

// A real session subscribes to at most ~8 channels at once (3 account-scoped
// + one per tradable symbol, TRADABLE_SYMBOLS in ./channels — currently 5).
// Without a cap, one WS message with a large `channels` array fans out into
// one ownership-check DB query per entry (services/realtime's
// `channelAllowed`) — a single authenticated, zero-privilege client could
// exhaust the realtime service's shared pg.Pool (default 10 connections)
// and starve every other connected account. 64 leaves ample headroom for
// growth without reopening that hole. `.min(1).max(64)` + a refine for
// uniqueness so a large array of the same channel repeated can't be used to
// bypass the cap's intent by inflating the fan-out with duplicates that
// would otherwise be harmless individually but still cost one query each.
const channelArray = z
  .array(z.string().min(1))
  .min(1)
  .max(64)
  .refine((channels) => new Set(channels).size === channels.length, {
    message: 'channels must not contain duplicates',
  });

/**
 * Explicit subscribe — a client only receives events for channels it asked
 * for (Engineering Constitution §24: "explicit subscribe", not implicit
 * broadcast-everything).
 */
export const subscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  channels: channelArray,
});
export type SubscribeMessage = z.infer<typeof subscribeMessageSchema>;

export const unsubscribeMessageSchema = z.object({
  type: z.literal('unsubscribe'),
  channels: channelArray,
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
