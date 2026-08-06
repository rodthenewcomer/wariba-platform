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

/**
 * Prompt 07 — static per-symbol trading parameters (contract size, quantity
 * bounds, leverage) the Order Ticket/Guardian need to validate size and
 * estimate margin. Already loaded server-side for order execution
 * (services/realtime/src/market.ts) but never previously exposed to the
 * client. `leverage` is already resolved to the single number for the
 * receiving account's program (leverage_one vs leverage_performance) — the
 * client never sees both and never chooses.
 */
export const symbolSpecSchema = z.object({
  symbol: symbolSchema,
  pricePrecision: z.number().int().nonnegative(),
  contractSize: z.string(),
  minimumQuantity: z.string(),
  maximumQuantity: z.string(),
  quantityStep: z.string(),
  leverage: z.number().positive(),
  // Prompt 7 Appendix 07-C — needed client-side for the partial-close
  // preview's "fees/commission" line (§9). Not sensitive: it's the same
  // published rate every account on this spec set pays, already implied by
  // every fill's own commission the client already sees in recentFills.
  commissionPerLot: z.string(),
});
export type SymbolSpec = z.infer<typeof symbolSpecSchema>;

/**
 * Sent once per connection, right after the account-state subscribe — static
 * for the session, not a repeating stream. Payload shape only; `type` lives
 * on the envelope (see envelope.ts), same convention as MarketTick/AccountSnapshot.
 */
export const symbolSpecsMessageSchema = z.object({
  specs: z.array(symbolSpecSchema),
});
export type SymbolSpecsMessage = z.infer<typeof symbolSpecsMessageSchema>;
