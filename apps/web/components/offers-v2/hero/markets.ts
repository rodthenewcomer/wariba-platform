export interface MarketWord {
  /** The full phrase including its article — French grammar requires "le/les" to change with the noun, so the animated token is the whole phrase, never a fixed article plus a swapped noun. */
  label: string;
  /** CSS color value — a token where one exists, the same literal hex `RouteScene` already uses for FLEX where it doesn't. */
  color: string;
  /** The truthful `TradableSymbol` bucket this phrase maps to — see `packages/contracts/src/channels.ts`'s `TRADABLE_SYMBOLS`. Drives which tag `MarketComposition` highlights when this phrase is active. */
  bucket: 'forex' | 'indices' | 'metals';
}

/**
 * The market phrases the hero headline cycles through.
 *
 * Exactly three, one per instrument bucket WARIBA actually lists
 * (`TRADABLE_SYMBOLS`: EURUSD/GBPUSD/USDJPY, NAS100, XAUUSD) — a fourth
 * "LES MATIÈRES PREMIÈRES" phrase existed here before this pass and
 * implied a commodities category beyond gold that doesn't exist yet.
 * Add a phrase here only once a new instrument bucket is real.
 */
export const MARKET_WORDS: readonly MarketWord[] = [
  { label: 'LE FOREX', color: 'var(--wariba-brand-400)', bucket: 'forex' },
  { label: 'LES INDICES', color: '#8B7BFF', bucket: 'indices' },
  { label: 'LES MÉTAUX', color: 'var(--wariba-accent-amber)', bucket: 'metals' },
] as const;

export const MARKET_CYCLE_MS = 3200;
