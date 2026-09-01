export interface MarketWord {
  /** The full phrase including its article — French grammar requires "le/les" to change with the noun, so the animated token is the whole phrase, never a fixed article plus a swapped noun. */
  label: string;
  /** CSS color value — a token where one exists, the same literal hex `RouteScene` already uses for FLEX where it doesn't. */
  color: string;
}

/** The four market phrases the hero headline cycles through — cobalt/violet/cyan/gold, the same family palette `RouteScene` already established, extended by one restrained warm tone for MÉTAUX. */
export const MARKET_WORDS: readonly MarketWord[] = [
  { label: 'LE FOREX', color: 'var(--wariba-brand-400)' },
  { label: 'LES INDICES', color: '#8B7BFF' },
  { label: 'LES MATIÈRES PREMIÈRES', color: 'var(--wariba-accent-cyan)' },
  { label: 'LES MÉTAUX', color: 'var(--wariba-accent-amber)' },
] as const;

export const MARKET_CYCLE_MS = 3200;
