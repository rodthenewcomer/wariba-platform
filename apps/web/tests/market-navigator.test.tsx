import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AssetClass, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { MarketNavigator } from '../app/(trade)/trade/MarketNavigator';
import {
  categoryForAssetClass,
  groupAvailableSymbols,
  matchesMarketQuery,
} from '../app/(trade)/trade/market-categories';
import { createTickStore } from '../app/(trade)/trade/tick-store';
import {
  DEFAULT_WORKSTATION_PREFERENCES,
  defaultWorkstationPreferencesForWidth,
  parseWorkstationPreferences,
  NAVIGATOR_WIDTH_MAX,
  NAVIGATOR_WIDTH_MIN,
  EXECUTION_WIDTH_MAX,
  EXECUTION_WIDTH_MIN,
  DOCK_HEIGHT_MAX,
  DOCK_HEIGHT_MIN,
} from '../app/(trade)/trade/workstation/workstation-preferences';

function spec(symbol: TradableSymbol, assetClass: AssetClass): SymbolSpec {
  return {
    symbol,
    assetClass,
    pricePrecision: 5,
    contractSize: '100000',
    minimumQuantity: '0.01',
    maximumQuantity: '10',
    quantityStep: '0.01',
    leverage: 30,
    commissionPerLot: '0.00',
  };
}

/** Exactly what the server sends today for a real account. */
const ACCOUNT_SPECS: Partial<Record<TradableSymbol, SymbolSpec>> = {
  EURUSD: spec('EURUSD', 'forex_major'),
  GBPUSD: spec('GBPUSD', 'forex_major'),
  USDJPY: spec('USDJPY', 'forex_major'),
  XAUUSD: spec('XAUUSD', 'metal'),
  NAS100: spec('NAS100', 'index_cfd_simulated'),
};

function renderNavigator(overrides: Partial<ComponentProps<typeof MarketNavigator>> = {}) {
  return render(
    <MarketNavigator
      store={createTickStore()}
      symbolSpecs={ACCOUNT_SPECS}
      selectedSymbol="EURUSD"
      favorites={[]}
      onSelectSymbol={vi.fn()}
      onToggleFavorite={vi.fn()}
      {...overrides}
    />,
  );
}

describe('market category mapping', () => {
  it('maps each authoritative asset class to its category', () => {
    expect(categoryForAssetClass('forex_major')).toBe('forex');
    expect(categoryForAssetClass('metal')).toBe('metals');
    expect(categoryForAssetClass('index_cfd_simulated')).toBe('indices');
  });

  it('files an unrecognised class under Autres, never silently under Forex', () => {
    // The client casts the spec payload rather than parsing it, so a class
    // added to the database before this table is updated arrives as a plain
    // string at runtime (W2 §5).
    expect(categoryForAssetClass('energy' as AssetClass)).toBe('other');
    expect(categoryForAssetClass(undefined)).toBe('other');
  });

  it('groups only the account’s available instruments', () => {
    const groups = groupAvailableSymbols(ACCOUNT_SPECS);
    expect(groups.map((group) => group.label)).toEqual(['Forex', 'Métaux', 'Indices']);
    expect(groups[0]?.symbols).toEqual(['EURUSD', 'GBPUSD', 'USDJPY']);
    expect(groups[1]?.symbols).toEqual(['XAUUSD']);
    expect(groups[2]?.symbols).toEqual(['NAS100']);
  });

  it('renders no category for an asset class no available instrument carries', () => {
    // Énergies has no instrument today and must not appear as an empty
    // promise (W2 §6).
    const groups = groupAvailableSymbols(ACCOUNT_SPECS);
    expect(groups.map((group) => group.id)).not.toContain('other');
    expect(groups.some((group) => /énergie/i.test(group.label))).toBe(false);
  });

  it('search is case-insensitive and whitespace-trimmed', () => {
    expect(matchesMarketQuery('EURUSD', '  eur ')).toBe(true);
    expect(matchesMarketQuery('EURUSD', 'usd')).toBe(true);
    expect(matchesMarketQuery('EURUSD', 'nas')).toBe(false);
    expect(matchesMarketQuery('EURUSD', '   ')).toBe(true);
  });
});

describe('MarketNavigator', () => {
  it('renders the account’s instruments under real category headings', () => {
    renderNavigator();
    for (const heading of ['Forex', 'Métaux', 'Indices']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    for (const symbol of Object.keys(ACCOUNT_SPECS)) {
      expect(screen.getByRole('button', { name: new RegExp(`^${symbol}`) })).toBeInTheDocument();
    }
  });

  it('never presents an instrument the account has no spec for', () => {
    // The catalogue is the received specs, not a hardcoded UI array (W2 §4).
    renderNavigator({ symbolSpecs: { EURUSD: spec('EURUSD', 'forex_major') } });
    expect(screen.getByRole('button', { name: /^EURUSD/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^NAS100/ })).not.toBeInTheDocument();
    expect(screen.queryByText('SPX500')).not.toBeInTheDocument();
    expect(screen.queryByText('WTIUSD')).not.toBeInTheDocument();
  });

  it('shows no fabricated market performance', () => {
    // No history exists until W3, so any %/24h/session column would be
    // invented (W2 §7).
    const { container } = renderNavigator();
    expect(container.textContent).not.toMatch(/%/);
    expect(container.textContent).not.toMatch(/24\s?h/i);
    expect(container.querySelector('svg[data-sparkline]')).toBeNull();
  });

  it('reports an unavailable quote honestly instead of a remembered one', () => {
    renderNavigator();
    // No tick has been pushed into the store. Bid, ask and spread each hold
    // their own aligned column now (visual closure §8), so an instrument with
    // no quote shows three dashes rather than one "— / —" run — the point is
    // unchanged: a placeholder in every price cell, never a remembered figure.
    const symbolCount = Object.keys(ACCOUNT_SPECS).length;
    expect(screen.getAllByText('—').length).toBe(symbolCount * 3);
    expect(screen.getAllByText('Indisponible').length).toBe(symbolCount);
  });

  it('filters by search and states plainly when nothing matches', async () => {
    renderNavigator();
    const search = screen.getByTestId('market-search');
    await userEvent.type(search, 'xau');
    expect(screen.getByRole('button', { name: /^XAUUSD/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^EURUSD/ })).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'zzz');
    expect(screen.getByText(/Aucun instrument ne correspond/)).toBeInTheDocument();
  });

  it('does not change the selected symbol by searching alone', async () => {
    const onSelectSymbol = vi.fn();
    renderNavigator({ onSelectSymbol });
    await userEvent.type(screen.getByTestId('market-search'), 'xau');
    expect(onSelectSymbol).not.toHaveBeenCalled();
  });

  it('exposes the selected symbol and the favorite state', async () => {
    const onToggleFavorite = vi.fn();
    renderNavigator({ selectedSymbol: 'XAUUSD', favorites: ['NAS100'], onToggleFavorite });

    expect(screen.getByRole('button', { name: /^XAUUSD/ })).toHaveAttribute('aria-current', 'true');

    const add = screen.getByRole('button', { name: 'Ajouter EURUSD aux favoris' });
    expect(add).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(add);
    expect(onToggleFavorite).toHaveBeenCalledWith('EURUSD');

    // A favorite is a quick-access projection, not a reclassification — NAS100
    // appears under Favoris *and* still under Indices (W2 §8).
    const favorites = screen.getByRole('heading', { name: 'Favoris' }).parentElement as HTMLElement;
    expect(within(favorites).getByRole('button', { name: /^NAS100/ })).toBeInTheDocument();
    const indices = screen.getByRole('heading', { name: 'Indices' }).parentElement as HTMLElement;
    expect(within(indices).getByRole('button', { name: /^NAS100/ })).toBeInTheDocument();
  });

  it('discards a favorite the account cannot trade', () => {
    renderNavigator({
      symbolSpecs: { EURUSD: spec('EURUSD', 'forex_major') },
      favorites: ['NAS100'],
    });
    // Preferences never create a tradable symbol (W2 §10).
    expect(screen.queryByRole('heading', { name: 'Favoris' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^NAS100/ })).not.toBeInTheDocument();
  });

  it('states plainly when the account has no instruments at all', () => {
    renderNavigator({ symbolSpecs: {} });
    expect(screen.getByText('Aucun instrument disponible pour ce compte.')).toBeInTheDocument();
  });
});

describe('workstation layout preferences', () => {
  it('returns defaults for absent, corrupt or foreign-versioned storage', () => {
    expect(parseWorkstationPreferences(null)).toEqual(DEFAULT_WORKSTATION_PREFERENCES);
    expect(parseWorkstationPreferences('{ not json')).toEqual(DEFAULT_WORKSTATION_PREFERENCES);
    expect(parseWorkstationPreferences('"a string"')).toEqual(DEFAULT_WORKSTATION_PREFERENCES);
    expect(parseWorkstationPreferences('null')).toEqual(DEFAULT_WORKSTATION_PREFERENCES);
    expect(
      parseWorkstationPreferences(JSON.stringify({ version: 99, navigatorPreferredWidth: 300 })),
    ).toEqual(DEFAULT_WORKSTATION_PREFERENCES);
  });

  it('clamps out-of-range dimensions rather than applying them', () => {
    const wide = parseWorkstationPreferences(
      JSON.stringify({
        version: 2,
        navigatorPreferredWidth: 9999,
        executionPreferredWidth: 9999,
        activityDockPreferredHeight: 9999,
      }),
    );
    expect(wide.navigatorPreferredWidth).toBe(NAVIGATOR_WIDTH_MAX);
    expect(wide.executionPreferredWidth).toBe(EXECUTION_WIDTH_MAX);
    expect(wide.activityDockPreferredHeight).toBe(DOCK_HEIGHT_MAX);

    const tiny = parseWorkstationPreferences(
      JSON.stringify({
        version: 2,
        navigatorPreferredWidth: -50,
        executionPreferredWidth: 1,
        activityDockPreferredHeight: 0,
      }),
    );
    expect(tiny.navigatorPreferredWidth).toBe(NAVIGATOR_WIDTH_MIN);
    expect(tiny.executionPreferredWidth).toBe(EXECUTION_WIDTH_MIN);
    expect(tiny.activityDockPreferredHeight).toBe(DOCK_HEIGHT_MIN);

    const nonsense = parseWorkstationPreferences(
      JSON.stringify({
        version: 2,
        navigatorPreferredWidth: 'wide',
        executionPreferredWidth: {},
        activityDockPreferredHeight: null,
      }),
    );
    expect(nonsense.navigatorPreferredWidth).toBe(
      DEFAULT_WORKSTATION_PREFERENCES.navigatorPreferredWidth,
    );
    expect(nonsense.executionPreferredWidth).toBe(
      DEFAULT_WORKSTATION_PREFERENCES.executionPreferredWidth,
    );
    expect(nonsense.activityDockPreferredHeight).toBe(
      DEFAULT_WORKSTATION_PREFERENCES.activityDockPreferredHeight,
    );
  });

  it('migrates a schema-1 payload instead of discarding the trader’s layout', () => {
    // Schema 2 renamed the two dimensions and added the Execution width. A
    // trader who had already sized their Navigator and dock keeps both; the new
    // dimension starts at its default rather than at zero.
    const migrated = parseWorkstationPreferences(
      JSON.stringify({
        version: 1,
        navigatorWidth: 300,
        dockHeight: 260,
        navigatorCollapsed: true,
        favorites: ['EURUSD'],
      }),
    );
    expect(migrated.navigatorPreferredWidth).toBe(300);
    expect(migrated.activityDockPreferredHeight).toBe(260);
    expect(migrated.executionPreferredWidth).toBe(
      DEFAULT_WORKSTATION_PREFERENCES.executionPreferredWidth,
    );
    expect(migrated.navigatorCollapsed).toBe(true);
    expect(migrated.favorites).toEqual(['EURUSD']);
  });

  it('fails closed on a schema newer than this build understands', () => {
    // A future version is not "mostly compatible" — it is unknown, and an
    // unknown shape must never become authoritative.
    expect(
      parseWorkstationPreferences(
        JSON.stringify({ version: 3, navigatorPreferredWidth: 300, executionPreferredWidth: 400 }),
      ),
    ).toEqual(DEFAULT_WORKSTATION_PREFERENCES);
  });

  it('collapses the navigator by default only in the 1024–1279 hybrid band', () => {
    // Visual closure §22 — a first-run default, not a breakpoint change. The
    // band still renders the full desktop grid; it simply starts with the
    // occasional surface out of the way so the chart gets the 244px back.
    expect(defaultWorkstationPreferencesForWidth(1024).navigatorCollapsed).toBe(true);
    expect(defaultWorkstationPreferencesForWidth(1279).navigatorCollapsed).toBe(true);
    expect(defaultWorkstationPreferencesForWidth(1280).navigatorCollapsed).toBe(false);
    expect(defaultWorkstationPreferencesForWidth(1440).navigatorCollapsed).toBe(false);
    // Below the desktop floor the shell is the mobile column, where the
    // navigator is a sheet and this flag decides nothing.
    expect(defaultWorkstationPreferencesForWidth(390).navigatorCollapsed).toBe(false);
    // The compact execution default is also viewport-aware.
    expect(defaultWorkstationPreferencesForWidth(1920).executionPreferredWidth).toBe(260);
    expect(defaultWorkstationPreferencesForWidth(1440).executionPreferredWidth).toBe(248);
    expect(defaultWorkstationPreferencesForWidth(1366).executionPreferredWidth).toBe(236);
    expect(defaultWorkstationPreferencesForWidth(1280).executionPreferredWidth).toBe(236);
    // The remaining preferences do not drift with the viewport.
    const { navigatorCollapsed: _hybrid, ...hybridRest } =
      defaultWorkstationPreferencesForWidth(1024);
    const { navigatorCollapsed: _wide, ...wideRest } = defaultWorkstationPreferencesForWidth(1280);
    expect(hybridRest).toEqual(wideRest);
  });

  it('lets a stored preference override the hybrid default', () => {
    // A trader who opened the Navigator at 1100px has made a decision, and a
    // stored payload is what carries it. `parse` never consults the viewport.
    const stored = parseWorkstationPreferences(
      JSON.stringify({ version: 1, navigatorCollapsed: false }),
    );
    expect(stored.navigatorCollapsed).toBe(false);
  });

  it('keeps only real tradable symbols in favorites, de-duplicated', () => {
    const parsed = parseWorkstationPreferences(
      JSON.stringify({
        version: 1,
        favorites: ['EURUSD', 'EURUSD', 'SPX500', 'DROP TABLE', 42, null],
      }),
    );
    expect(parsed.favorites).toEqual(['EURUSD']);
  });

  it('stores no financial or account state', () => {
    const keys = Object.keys(DEFAULT_WORKSTATION_PREFERENCES).sort();
    expect(keys).toEqual([
      'activityDockPreferredHeight',
      'dockCollapsed',
      'executionPreferredWidth',
      'favorites',
      'navigatorCollapsed',
      'navigatorPreferredWidth',
    ]);
  });
});
