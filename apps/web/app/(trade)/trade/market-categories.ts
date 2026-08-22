import type { AssetClass, SymbolSpec, TradableSymbol } from '@wariba/contracts';

/**
 * The one presentation mapping from an instrument's authoritative asset class
 * to the Market Navigator's category (W2 §5).
 *
 * "One" is the point. Classification is never inferred from a symbol's string
 * prefix, its quantity unit, its leverage, its price format or marketing copy,
 * and it is never duplicated across UI files — the single input is
 * `SymbolSpec.assetClass`, mirrored straight from `app.symbol_specs.asset_class`.
 *
 * `OTHER` exists because the client casts the symbol-spec payload rather than
 * parsing it: a class added to the database before this table is updated would
 * arrive as an unrecognised string at runtime. Such an instrument is grouped
 * visibly under "Autres" rather than silently filed as Forex, which would be a
 * lie about what the trader is trading.
 */
export type MarketCategoryId = 'forex' | 'metals' | 'indices' | 'other';

const CATEGORY_BY_ASSET_CLASS: Record<AssetClass, MarketCategoryId> = {
  forex_major: 'forex',
  metal: 'metals',
  index_cfd_simulated: 'indices',
};

export const MARKET_CATEGORY_LABEL: Record<MarketCategoryId, string> = {
  forex: 'Forex',
  metals: 'Métaux',
  indices: 'Indices',
  other: 'Autres',
};

/** Stable French instrument names shared by every market-selection surface. */
export const INSTRUMENT_NAME: Record<TradableSymbol, string> = {
  EURUSD: 'Euro / Dollar US',
  GBPUSD: 'Livre sterling / Dollar US',
  USDJPY: 'Dollar US / Yen japonais',
  XAUUSD: 'Or / Dollar US',
  NAS100: 'Nasdaq 100',
};

/** Display order. Categories with no available instrument are never rendered (W2 §6). */
export const MARKET_CATEGORY_ORDER: readonly MarketCategoryId[] = [
  'forex',
  'metals',
  'indices',
  'other',
];

export function categoryForAssetClass(assetClass: AssetClass | undefined): MarketCategoryId {
  if (assetClass === undefined) return 'other';
  return CATEGORY_BY_ASSET_CLASS[assetClass] ?? 'other';
}

export interface MarketCategoryGroup {
  id: MarketCategoryId;
  label: string;
  symbols: TradableSymbol[];
}

/**
 * Groups the account's **actually available** instruments — the specs the
 * server sent for this account — into non-empty categories.
 *
 * There is deliberately no catalogue of future instruments here. A category
 * only exists because an available instrument belongs to it, so "Énergies"
 * cannot appear as an empty promise and an unimplemented symbol cannot be
 * presented as tradable (W2 §6).
 */
export function groupAvailableSymbols(
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>,
): MarketCategoryGroup[] {
  const buckets = new Map<MarketCategoryId, TradableSymbol[]>();
  for (const [symbol, spec] of Object.entries(symbolSpecs) as [
    TradableSymbol,
    SymbolSpec | undefined,
  ][]) {
    if (!spec) continue;
    const category = categoryForAssetClass(spec.assetClass);
    const bucket = buckets.get(category);
    if (bucket) bucket.push(symbol);
    else buckets.set(category, [symbol]);
  }

  return MARKET_CATEGORY_ORDER.flatMap((id) => {
    const symbols = buckets.get(id);
    if (!symbols || symbols.length === 0) return [];
    return [{ id, label: MARKET_CATEGORY_LABEL[id], symbols: [...symbols].sort() }];
  });
}

/** Case-insensitive, whitespace-trimmed match over the symbol (W2 §9). */
export function matchesMarketQuery(symbol: TradableSymbol, query: string): boolean {
  const normalised = query.trim().toUpperCase();
  if (normalised === '') return true;
  return (
    symbol.toUpperCase().includes(normalised) ||
    INSTRUMENT_NAME[symbol].toLocaleUpperCase('fr-FR').includes(normalised)
  );
}
