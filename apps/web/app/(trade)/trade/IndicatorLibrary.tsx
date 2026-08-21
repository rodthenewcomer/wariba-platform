'use client';

import { memo, useMemo, useState } from 'react';
import { WariXSearchIcon } from '@wariba/ui';
import {
  canEnableAnotherIndicator,
  indicatorLabel,
  MAX_ACTIVE_INDICATORS,
  type ChartIndicator,
} from './chart-indicator-model';

/**
 * The Indicators library — §13.
 *
 * WX1 offered a 15rem popover hanging off the toolbar with four checkboxes in
 * it. Against the reference that is not an indicator library, it is a settings
 * dropdown: no search, no favourites, no room, and no shape that a fifth
 * indicator could be added to without it becoming a scrolling column of
 * checkboxes floating over the chart.
 *
 * **The list is finite and it is honest.** §13 is explicit — *do not list 100
 * fake indicators*. WariX computes EMA and SMA and nothing else, so the library
 * contains a useful set of real periods for those two families and every row
 * draws when enabled. The architecture is what scales: entries come from the
 * indicator registry, search filters that registry, and adding RSI later means
 * adding a calculator and a preset, not touching this file.
 *
 * The parts that make it a *library* rather than a menu are all real: the search
 * narrows the actual list, favourites pin to the top and persist per account,
 * each row states its series colour and its enabled state, and the ceiling on
 * simultaneous series is explained where a trader hits it rather than by a
 * silently disabled checkbox.
 */

export interface IndicatorLibraryProps {
  indicators: readonly ChartIndicator[];
  onToggle(id: string): void;
  favorites: readonly string[];
  onToggleFavorite(id: string): void;
  /** Phone presentation: 44px rows and no keyboard hints. */
  compact?: boolean;
}

interface RowProps {
  indicator: ChartIndicator;
  blocked: boolean;
  favorite: boolean;
  compact: boolean;
  onToggle(): void;
  onToggleFavorite(): void;
}

function IndicatorRow({
  indicator,
  blocked,
  favorite,
  compact,
  onToggle,
  onToggleFavorite,
}: RowProps) {
  const label = indicatorLabel(indicator);
  return (
    <div
      className={`group/row flex items-center gap-1 border-b border-[color:var(--wariba-component-workstation-seam-hairline)] px-2 transition-colors duration-[var(--wariba-component-workstation-motion-quick)] last:border-b-0 hover:bg-[color:var(--wariba-component-workstation-surface-control)]/50 motion-reduce:transition-none ${
        indicator.enabled ? 'bg-[color:var(--wariba-component-workstation-wash-neutral)]' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={favorite}
        aria-label={favorite ? `Retirer ${label} des favoris` : `Ajouter ${label} aux favoris`}
        data-testid={`indicator-favorite-${indicator.id}`}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] transition-opacity duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
          favorite
            ? 'text-[color:var(--wariba-component-workstation-trading-warning)]'
            : 'text-[color:var(--wariba-component-workstation-text-tertiary)] opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100'
        }`}
      >
        <svg viewBox="0 0 24 24" width={13} height={13} aria-hidden="true">
          <path
            d="M12 3.6l2.6 5.6 6 0.8-4.4 4.3 1.1 6.1L12 17.5l-5.3 2.9 1.1-6.1L3.4 10l6-0.8Z"
            fill={favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <label
        className={`flex min-w-0 flex-1 items-center gap-2.5 ${
          compact ? 'min-h-11' : 'min-h-9'
        } ${blocked ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}
      >
        <input
          type="checkbox"
          aria-label={label}
          checked={indicator.enabled}
          disabled={blocked}
          onChange={onToggle}
          className="h-4 w-4 shrink-0"
          style={{ accentColor: indicator.style.color }}
        />
        {/* The series' own stroke, at its own width — the row shows what the
            chart will draw, not a generic dot. */}
        <span
          aria-hidden="true"
          className="w-6 shrink-0 rounded-full"
          style={{
            backgroundColor: indicator.style.color,
            height: indicator.style.width + 1,
            boxShadow: indicator.enabled ? `0 0 6px -1px ${indicator.style.color}` : 'none',
          }}
        />
        <span
          className={`wariba-data min-w-0 flex-1 truncate text-[length:var(--wariba-component-workstation-type-data)] font-semibold tabular-nums ${
            indicator.enabled
              ? 'text-[color:var(--wariba-component-workstation-text-primary)]'
              : 'text-[color:var(--wariba-component-workstation-text-secondary)]'
          }`}
        >
          {label}
        </span>
        <span className="shrink-0 text-[length:var(--wariba-component-workstation-type-meta)] uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {indicator.type === 'ema' ? 'Exponentielle' : 'Simple'}
        </span>
      </label>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-[color:var(--wariba-component-workstation-surface-canvas)] px-3 py-1.5 text-[length:var(--wariba-component-workstation-type-section-label)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
      {children}
    </div>
  );
}

export const IndicatorLibrary = memo(function IndicatorLibrary({
  indicators,
  onToggle,
  favorites,
  onToggleFavorite,
  compact = false,
}: IndicatorLibraryProps) {
  const [query, setQuery] = useState('');
  const canEnableMore = canEnableAnotherIndicator(indicators);

  const { starred, rest, matched } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = indicators.filter((indicator) =>
      needle.length === 0 ? true : indicatorLabel(indicator).toLowerCase().includes(needle),
    );
    return {
      starred: filtered.filter((indicator) => favorites.includes(indicator.id)),
      rest: filtered.filter((indicator) => !favorites.includes(indicator.id)),
      matched: filtered.length,
    };
  }, [indicators, favorites, query]);

  const row = (indicator: ChartIndicator) => (
    <IndicatorRow
      key={indicator.id}
      indicator={indicator}
      blocked={!indicator.enabled && !canEnableMore}
      favorite={favorites.includes(indicator.id)}
      compact={compact}
      onToggle={() => onToggle(indicator.id)}
      onToggleFavorite={() => onToggleFavorite(indicator.id)}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="indicator-library">
      <div className="shrink-0 border-b border-[color:var(--wariba-component-workstation-border-hairline)] p-2.5">
        <div className="flex items-center gap-2 rounded-[var(--wariba-component-workstation-radius-control)] bg-[color:var(--wariba-component-workstation-surface-canvas)] px-2.5 shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-hairline)] transition-[box-shadow] duration-[var(--wariba-component-workstation-motion-quick)] focus-within:ring-[color:var(--wariba-component-workstation-border-focus)] focus-within:shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55),0_0_6px_0_var(--wariba-component-workstation-focus-glow)]">
          <span className="shrink-0 text-[color:var(--wariba-component-workstation-text-tertiary)]">
            <WariXSearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un indicateur"
            aria-label="Rechercher un indicateur"
            data-testid="indicator-search"
            className={`min-w-0 flex-1 bg-transparent text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-primary)] !outline-none placeholder:text-[color:var(--wariba-component-workstation-text-tertiary)] ${
              compact ? 'h-11' : 'h-9'
            }`}
          />
        </div>
      </div>

      {/* The phone sheet runs its rows edge to edge and hugs its content, so the
          last row would otherwise sit on the device's bottom edge — under the
          home indicator on the hardware that has one. */}
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${compact ? 'pb-3' : ''}`}>
        {matched === 0 ? (
          <p className="px-3 py-6 text-center text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            Aucun indicateur ne correspond à « {query.trim()} ».
          </p>
        ) : (
          <>
            {/* Final closure §11 — the sheet is its rows. A section rule is drawn
                only when there are genuinely two groups to separate; repeating
                the surface's own title above a single list was chrome, not
                structure. */}
            {starred.length > 0 && (
              <>
                <SectionLabel>Favoris</SectionLabel>
                {starred.map(row)}
                <SectionLabel>Tous les indicateurs</SectionLabel>
              </>
            )}
            {rest.map(row)}
          </>
        )}
      </div>

      {!canEnableMore ? (
        <div className="shrink-0 border-t border-[color:var(--wariba-component-workstation-border-hairline)] px-3 py-2 text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-text-tertiary)]">
          Maximum {MAX_ACTIVE_INDICATORS} indicateurs actifs simultanément.
        </div>
      ) : null}
    </div>
  );
});
