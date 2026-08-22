'use client';

import { memo, useId, useMemo, useState, type ReactNode } from 'react';
import {
  InstrumentAvatar,
  SectionLabel,
  Text,
  WariXFavoriteIcon,
  WariXSearchIcon,
} from '@wariba/ui';
import type { SymbolSpec, TradableSymbol } from '@wariba/contracts';
import {
  groupAvailableSymbols,
  INSTRUMENT_NAME,
  matchesMarketQuery,
  type MarketCategoryGroup,
} from './market-categories';
import { useQuoteDirection } from './use-quote-direction';
import { useTick, type TickStore } from './tick-store';
import { resolveWariXMarketDisplayState } from './market-display-state';

/**
 * Quote columns, aligned once here and once in the list's own column header.
 *
 * Sized from the widest quote the catalogue actually carries (`1.08471` and
 * `17997.0` are both 7 glyphs at 12px tabular) plus the 244px panel's own
 * padding and the 32px favourite column. The 1440 checkpoint render caught the
 * first attempt: `Spread` at 10px with 0.11em tracking did not fit its own
 * column, so the header row's min-content width exceeded the panel and the last
 * heading was clipped to "SPI" at the module edge.
 */
const BID_ASK_COLUMN = 'w-[3.25rem] shrink-0 text-right tabular-nums';
const SPREAD_COLUMN = 'w-[2.75rem] shrink-0 text-right tabular-nums';

interface MarketRowProps {
  store: TickStore;
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  selected: boolean;
  favorite: boolean;
  onSelect: (symbol: TradableSymbol) => void;
  onToggleFavorite: (symbol: TradableSymbol) => void;
}

/**
 * One instrument. Subscribes to exactly this symbol's tick, so a EURUSD tick
 * never reaches the GBPUSD row, a category heading, the navigator shell, the
 * dock, the status bar or the rail (W2 §11).
 *
 * Shows only current-state truth — bid, ask, spread, market status. There is
 * deliberately no daily/24h/session percentage, no previous close, no
 * sparkline and no high/low: WariX has no historical market data until W3, and
 * a change column with no valid reference price would be a fabrication
 * (W2 §7).
 *
 * **Visual closure §8 — a market row, not a list item.** Two things were wrong
 * in WX1 and both were gestalt rather than data. The gap *inside* a row (the
 * symbol line to the quote line) was larger than the gap *between* rows, so
 * "GBPUSD" appeared to belong to the EURUSD quote above it; rows now sit
 * flush with a hairline divider, which is what makes a market list read as
 * one continuous instrument. And the selected row was a flat grey rectangle
 * one step lighter than its neighbours; it is now a cobalt wash behind a
 * cobalt edge rule with the symbol itself in cobalt, so selection is carried
 * by three cues instead of a luminance step.
 *
 * Bid and ask hold fixed-width right-aligned columns in their own semantic
 * colours, so the eye reads *down* the bid column across instruments rather
 * than parsing "1.08274 / 1.08284" as a sentence in each row.
 */
const MarketRow = memo(function MarketRow({
  store,
  symbol,
  spec,
  selected,
  favorite,
  onSelect,
  onToggleFavorite,
}: MarketRowProps) {
  const tick = useTick(store, symbol);
  const bidRef = useQuoteDirection<HTMLSpanElement>(tick?.bid);
  const askRef = useQuoteDirection<HTMLSpanElement>(tick?.ask);
  const spread = tick
    ? (Number(tick.ask) - Number(tick.bid)).toFixed(spec?.pricePrecision ?? 5)
    : null;
  const marketPresentation = resolveWariXMarketDisplayState({
    marketStatus: tick?.marketStatus ?? null,
    /*
     * `useTick` returns `undefined` when no quote has ever arrived, so the
     * original `tick !== null` was true for an instrument with no data at all
     * and presented it as "historique disponible · temps réel indisponible".
     * That is a claim about data WariX does not have, which is the one thing
     * the whole market-data foundation refuses to make.
     */
    hasUsableHistory: tick != null,
  });
  const isStale = marketPresentation.state === 'STALE';
  const compactMarketLabel =
    marketPresentation.state === 'UNAVAILABLE'
      ? 'Non disponible'
      : marketPresentation.state === 'HISTORY_ONLY'
        ? 'Historique seul'
        : marketPresentation.label;

  return (
    <div
      /* Refinement pass — selected and unselected rows share one geometry.
         Every row reserves the 3px leading rule; only the selected one paints
         it. Without that the selected row's content shifted by 3px against its
         neighbours, which is the small misalignment that makes a list look
         styled rather than engineered. */
      /*
       * VX1-E §K — a row is a mini-card, not a table stripe.
       *
       * The list used to be full-bleed rows separated by hairlines, which is
       * why a long watchlist read as one uninterrupted dark field. Each row now
       * owns a small surface with its own radius and inset, so the eye lands on
       * an instrument rather than on a line of a table.
       *
       * The 3px leading rule is still reserved by every row and painted only by
       * the selected one, so selection never shifts the content beside it.
       * Selection is a genuine material — a lifted surface with a stronger edge
       * — rather than a background colour swap.
       */
      className={`relative mx-1.5 my-[3px] flex min-h-[64px] items-stretch overflow-hidden rounded-[var(--warix-radius-card)] border transition-[background-color,box-shadow,border-color] duration-[var(--wariba-component-workstation-motion-quick)] before:absolute before:bottom-0 before:left-0 before:top-0 before:z-10 before:w-[3px] motion-reduce:transition-none ${
        selected
          ? 'border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface-selected)] shadow-[inset_0_1px_0_0_var(--warix-highlight-inner-strong)] before:bg-[color:var(--warix-accent-cobalt)]'
          : 'border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface)] before:bg-transparent hover:border-[color:var(--warix-border-strong)] hover:bg-[color:var(--warix-surface-hover)]'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(symbol)}
        aria-current={selected ? 'true' : undefined}
        className="flex min-h-[64px] min-w-0 flex-1 flex-col justify-center gap-1.5 py-1.5 pl-2.5 pr-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {/* VX1-E §J — identity before text, so a watchlist is scanned
                rather than read. Presentation only: it implies no price, no
                session and no data the backend does not publish. */}
            <InstrumentAvatar symbol={symbol} assetClass={spec?.assetClass} size="sm" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                className={`truncate text-[length:var(--wariba-component-workstation-type-data-strong)] font-bold leading-none tracking-[-0.01em] ${
                  selected
                    ? 'text-[color:var(--wariba-component-workstation-interaction-selected-text)]'
                    : 'text-[color:var(--wariba-component-workstation-text-primary)]'
                }`}
              >
                {symbol}
              </span>
              <span className="truncate text-[length:var(--wariba-component-workstation-type-meta)] leading-none text-[color:var(--wariba-component-workstation-text-tertiary)]">
                {INSTRUMENT_NAME[symbol]}
              </span>
            </span>
          </span>
          {/*
           * Market state by exception — VX1-C.1 §5.
           *
           * Every row once carried the word "OUVERT" in the same tone, so five
           * identical labels ran down the panel and an *abnormal* market had to
           * be found by reading. The refinement pass cut the word to a 4px mint
           * dot; this pass cuts the dot too, because five identical dots are
           * five identical labels in a smaller font. Healthy availability is the
           * default a watchlist already assumes, and the panel's green now
           * belongs to the two marks that earn it — the feed signal in the
           * header and the instrument mark in the chart legend.
           *
           * Only a stale, closed or unavailable market spends ink, which is what
           * makes the exception the thing that catches the eye. Nothing is
           * hidden: the state stays in the row's accessible name at every
           * status, exactly as it always has.
           */}
          {marketPresentation.state === 'LIVE' ? (
            <span className="sr-only">{marketPresentation.label}</span>
          ) : (
            <span
              className={`flex items-center gap-1 rounded-[5px] px-1.5 py-1 text-[length:var(--wariba-component-workstation-type-meta)] font-semibold leading-none ${
                isStale
                  ? 'bg-[color:var(--wariba-component-workstation-wash-warning)] text-[color:var(--wariba-component-workstation-trading-warning)]'
                  : 'bg-[color:var(--wariba-component-workstation-wash-neutral)] text-[color:var(--wariba-component-workstation-text-tertiary)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-1 w-1 rounded-full ${
                  isStale
                    ? 'bg-[color:var(--wariba-component-workstation-trading-warning)]'
                    : marketPresentation.state === 'UNAVAILABLE'
                      ? 'bg-[color:var(--wariba-component-workstation-trading-sell)]'
                      : 'bg-[color:var(--wariba-component-workstation-text-tertiary)]'
                }`}
              />
              {compactMarketLabel}
            </span>
          )}
        </span>

        {/* No tick yet means no price — never a remembered value wearing a
            live label (W2 §30). The dash occupies the same column the figure
            would, so an unavailable instrument does not reflow the list. */}
        <span className="wariba-data flex items-center justify-end gap-2 leading-none">
          {/*
           * VX1-C §18/§19 — the two quote cells answer their own tick.
           *
           * The wash is on the cell, never the row: a whole row lighting up on
           * every print turns a watchlist into a strobe. The base identities are
           * untouched — Bid stays cyan, Ask stays copper — and the direction is
           * a brief overlay on top of them, not a recolour.
           *
           * Attached where the tick is already consumed by this row, so it costs
           * no new subscription and no extra render.
           */}
          <span
            ref={bidRef}
            className={`${BID_ASK_COLUMN} rounded-[3px] text-[length:var(--wariba-component-workstation-type-data)] font-medium ${
              tick
                ? 'text-[color:var(--wariba-component-workstation-trading-live-bid)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          >
            {tick?.bid ?? '—'}
          </span>
          <span
            ref={askRef}
            className={`${BID_ASK_COLUMN} rounded-[3px] text-[length:var(--wariba-component-workstation-type-data)] font-medium ${
              tick
                ? 'text-[color:var(--wariba-component-workstation-trading-live-ask)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          >
            {tick?.ask ?? '—'}
          </span>
          <span
            className={`${SPREAD_COLUMN} text-[length:var(--wariba-component-workstation-type-meta)] text-[color:var(--wariba-component-workstation-text-tertiary)]`}
          >
            {spread ?? '—'}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onToggleFavorite(symbol)}
        aria-pressed={favorite}
        aria-label={favorite ? `Retirer ${symbol} des favoris` : `Ajouter ${symbol} aux favoris`}
        /* Refinement pass — the star aligns to the symbol's own baseline row
           rather than to the two-line row's centre, so a column of stars reads
           level with the column of instruments it marks. */
        className={`flex min-h-[64px] w-8 shrink-0 items-start justify-center pt-3 transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
          favorite
            ? 'text-[color:var(--wariba-component-workstation-identity-mark)]'
            : 'text-[color:var(--wariba-component-workstation-border-strong)] hover:text-[color:var(--wariba-component-workstation-identity-mark)]'
        }`}
      >
        <WariXFavoriteIcon filled={favorite} />
      </button>
    </div>
  );
});

/**
 * The column header, written once instead of a `BID`/`ASK` micro-label in
 * every row. This is the single element that most changes how the panel reads:
 * a labelled column grid is market infrastructure, an unlabelled pair of
 * numbers per row is a list.
 *
 * Only the quote columns are named. The first attempt labelled the symbol
 * column "Instrument" too and the 1440 render showed the cost: three quote
 * columns plus the favourite column leave roughly 26px of a 244px panel for
 * that heading, so it rendered as "IN…". A market watch names its price
 * columns and lets the symbols speak for themselves — the truncation was the
 * layout telling us which convention it wanted.
 */
function MarketColumnHeader() {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center gap-2 overflow-hidden border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-canvas)] py-1 pl-2.5 pr-8"
    >
      <span className="min-w-0 flex-1" />
      <SectionLabel className={BID_ASK_COLUMN}>Bid</SectionLabel>
      <SectionLabel className={BID_ASK_COLUMN}>Ask</SectionLabel>
      <SectionLabel className={SPREAD_COLUMN}>Écart</SectionLabel>
    </div>
  );
}

export interface MarketNavigatorProps {
  store: TickStore;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  selectedSymbol: TradableSymbol;
  favorites: readonly TradableSymbol[];
  onSelectSymbol: (symbol: TradableSymbol) => void;
  onToggleFavorite: (symbol: TradableSymbol) => void;
  /** Rendered beside the title — the collapse control on desktop, nothing in the mobile sheet. */
  headerAction?: ReactNode;
  /** The utility drawer already owns the title and close action. */
  hideHeader?: boolean;
}

/**
 * The Market Navigator (W2 §8).
 *
 * Its catalogue is the account's **received symbol specs** — what the server
 * actually sent for this account — not a hardcoded UI array. An instrument the
 * account has no spec for simply is not in the list, and therefore cannot be
 * presented as tradable.
 *
 * The navigator itself holds no tick subscription: search text and favorites
 * live here, prices live in the rows. So typing in the search box cannot make
 * a price re-render, and a price cannot make a category heading re-render.
 */
export const MarketNavigator = memo(function MarketNavigator({
  store,
  symbolSpecs,
  selectedSymbol,
  favorites,
  onSelectSymbol,
  onToggleFavorite,
  headerAction,
  hideHeader = false,
}: MarketNavigatorProps) {
  const [query, setQuery] = useState('');
  const searchId = useId();

  const categories = useMemo(() => groupAvailableSymbols(symbolSpecs), [symbolSpecs]);

  // A favorite for an instrument this account cannot trade is discarded rather
  // than rendered: preferences never create a tradable symbol (W2 §10).
  const availableFavorites = useMemo(
    () => favorites.filter((symbol) => symbolSpecs[symbol] !== undefined),
    [favorites, symbolSpecs],
  );

  const visible = useMemo(() => {
    const filterGroup = (group: MarketCategoryGroup): MarketCategoryGroup | null => {
      const symbols = group.symbols.filter((symbol) => matchesMarketQuery(symbol, query));
      return symbols.length > 0 ? { ...group, symbols } : null;
    };
    const groups = categories
      .map(filterGroup)
      .filter((group): group is MarketCategoryGroup => group !== null);
    const favoriteMatches = availableFavorites.filter((symbol) =>
      matchesMarketQuery(symbol, query),
    );
    return { groups, favoriteMatches };
  }, [categories, availableFavorites, query]);

  const hasResults = visible.groups.length > 0;

  const renderRow = (symbol: TradableSymbol, keyPrefix: string) => (
    <MarketRow
      key={`${keyPrefix}:${symbol}`}
      store={store}
      symbol={symbol}
      spec={symbolSpecs[symbol]}
      selected={symbol === selectedSymbol}
      favorite={availableFavorites.includes(symbol)}
      onSelect={onSelectSymbol}
      onToggleFavorite={onToggleFavorite}
    />
  );

  /**
   * A category band.
   *
   * Refinement pass — `sticky`, which is the behaviour that separates market
   * infrastructure from a styled list: scrolling a long catalogue never leaves
   * the trader wondering which asset class the row under the cursor belongs to.
   * The band is opaque and one tone above the rows so it can pass over them, and
   * it carries a strong top border so each class reads as a block rather than as
   * a heading that happens to precede some rows.
   */
  const categoryHeading = (id: string, label: string) => (
    <h3
      id={`market-category-${id}`}
      className="sticky top-0 z-10 flex items-center gap-2 border-b border-t border-b-[color:var(--wariba-component-workstation-seam-hairline)] border-t-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-2.5 py-1 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)] text-[length:var(--wariba-component-workstation-type-section-label)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-secondary)]"
    >
      {label}
    </h3>
  );

  return (
    <div
      data-testid="market-navigator"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      {hideHeader ? null : (
        <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-2.5 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]">
          <h2 className="text-[length:var(--wariba-component-workstation-type-section-label)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-secondary)]">
            Marchés
          </h2>
          {headerAction}
        </div>
      )}

      {/* A real field, not a bare input on the panel background: sunken surface,
          hairline ring, cobalt focus ring. Search is the navigator's primary
          control and it was previously the least visible thing in it. */}
      <div className="shrink-0 border-b border-[color:var(--wariba-component-workstation-border-hairline)] p-2">
        <div className="relative flex h-9 items-center rounded-[var(--wariba-component-workstation-radius-control)] bg-[color:var(--wariba-component-workstation-surface-canvas)] shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-hairline)] transition-[box-shadow] duration-[var(--wariba-component-workstation-motion-quick)] focus-within:ring-[color:var(--wariba-component-workstation-border-focus)] focus-within:shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55),0_0_6px_0_var(--wariba-component-workstation-focus-glow)]">
          <label htmlFor={searchId} className="sr-only">
            Rechercher un instrument
          </label>
          <WariXSearchIcon className="pointer-events-none absolute left-2 text-[color:var(--wariba-component-workstation-text-tertiary)]" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher…"
            data-testid="market-search"
            className="h-full w-full rounded-[var(--wariba-component-workstation-radius-control)] border-0 bg-transparent py-0 pl-8 pr-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-component-workstation-text-primary)] placeholder:text-[color:var(--wariba-component-workstation-text-tertiary)] focus:outline-none"
          />
        </div>
      </div>

      <MarketColumnHeader />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Favorites is a quick-access projection, not a reclassification: an
            instrument shown here is still listed under its real category. */}
        {visible.favoriteMatches.length > 0 && (
          <section aria-labelledby="market-category-favorites">
            {categoryHeading('favorites', 'Favoris')}
            <div className="flex flex-col">
              {visible.favoriteMatches.map((symbol) => renderRow(symbol, 'fav'))}
            </div>
          </section>
        )}

        {visible.groups.map((group) => (
          <section key={group.id} aria-labelledby={`market-category-${group.id}`}>
            {categoryHeading(group.id, group.label)}
            <div className="flex flex-col">
              {group.symbols.map((symbol) => renderRow(symbol, group.id))}
            </div>
          </section>
        ))}

        {!hasResults && (
          <Text variant="body-sm" color="tertiary" className="px-2.5 py-4 block">
            {categories.length === 0
              ? 'Aucun instrument disponible pour ce compte.'
              : `Aucun instrument ne correspond à « ${query.trim()} ».`}
          </Text>
        )}
      </div>
    </div>
  );
});
