import { z } from 'zod';
import { TRADABLE_SYMBOLS } from './channels';

export const symbolSchema = z.enum(TRADABLE_SYMBOLS);

/**
 * 'closed' is reserved for future weekend-session modeling (TRD-016, still
 * OPEN) — the V1 sandbox simulator only ever emits 'open' or 'stale'.
 */
export const marketStatusSchema = z.enum(['open', 'stale', 'closed']);
export type MarketStatus = z.infer<typeof marketStatusSchema>;

/**
 * DATA-002: seed/version/timestamp/sequence are always carried so a tick
 * stream is reproducible. Prices are decimal strings, never floats
 * (Engineering Constitution money rule) — bid/ask are pre-rounded to the
 * symbol's price_precision by the simulator, not by consumers.
 */
export const marketTickSchema = z.object({
  symbol: symbolSchema,
  bid: z.string(),
  ask: z.string(),
  timestamp: z.string().datetime(),
  sequence: z.number().int().nonnegative(),
  marketStatus: marketStatusSchema,
});
export type MarketTick = z.infer<typeof marketTickSchema>;
