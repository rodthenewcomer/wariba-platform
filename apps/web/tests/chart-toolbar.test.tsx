import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CANDLE_TIMEFRAMES } from '@wariba/contracts';
import {
  ChartToolbar,
  timeframeSlotsForWidth,
  visibleTimeframes,
} from '../app/(trade)/trade/ChartToolbar';
import { ChartBottomBar } from '../app/(trade)/trade/ChartBottomBar';
import { ChartStatusLine, computeBarChange } from '../app/(trade)/trade/ChartStatusLine';
import { IndicatorLibrary } from '../app/(trade)/trade/IndicatorLibrary';
import { DrawingToolRail } from '../app/(trade)/trade/DrawingToolRail';
import { CHART_TOOL_FAMILIES } from '../app/(trade)/trade/chart-tool-catalog';
import { DEFAULT_CHART_SETTINGS } from '../app/(trade)/trade/chart-settings-model';
import {
  DEFAULT_CHART_INDICATORS,
  type ChartIndicator,
} from '../app/(trade)/trade/chart-indicator-model';

/**
 * W5 §14/§38/§86/§87/§88 and reopen §9/§13/§14/§20 — the chart chrome's
 * accessibility and density contract.
 *
 * These assert the semantics a screen-reader user depends on and a colour-only
 * design would fail: a real radiogroup with arrow-key navigation, real
 * checkboxes with names, and pressed state exposed to assistive technology
 * rather than implied by a background colour.
 */

function renderToolbar(overrides: Partial<React.ComponentProps<typeof ChartToolbar>> = {}) {
  const props: React.ComponentProps<typeof ChartToolbar> = {
    symbol: 'EURUSD',
    marketStatus: 'open' as const,
    onOpenMarkets: vi.fn(),
    chartStyle: 'candles' as const,
    onSelectChartStyle: vi.fn(),
    onOpenAlerts: vi.fn(),
    timeframe: '5s' as const,
    onSelectTimeframe: vi.fn(),
    onOpenIndicators: vi.fn(),
    indicatorsActive: true,
    onOpenSettings: vi.fn(),
    onResetView: vi.fn(),
    onSnapshot: vi.fn(),
    onToggleFullscreen: vi.fn(),
    fullscreen: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: true,
    canRedo: false,
    ...overrides,
  };
  render(<ChartToolbar {...props} />);
  return props;
}

function renderRail(overrides: Partial<React.ComponentProps<typeof DrawingToolRail>> = {}) {
  const props: React.ComponentProps<typeof DrawingToolRail> = {
    tool: 'select' as const,
    onSelect: vi.fn(),
    cursorMode: 'cross',
    onSelectCursorMode: vi.fn(),
    favorites: [],
    onToggleFavorite: vi.fn(),
    magnet: false,
    onToggleMagnet: vi.fn(),
    keepDrawingMode: false,
    onToggleKeepDrawingMode: vi.fn(),
    drawingsHidden: false,
    indicatorsHidden: false,
    onSetDrawingsHidden: vi.fn(),
    onSetIndicatorsHidden: vi.fn(),
    drawingCount: 3,
    onRemoveAllDrawings: vi.fn(),
    onOpenObjectTree: vi.fn(),
    ...overrides,
  };
  render(<DrawingToolRail {...props} />);
  return props;
}

describe('timeframe selector — W5 §14/§86', () => {
  it('uses the dedicated search action in both desktop and compact headers', () => {
    renderToolbar();
    let trigger = screen.getByTestId('chart-symbol-search-trigger');
    expect(trigger.querySelector('[data-warix-action="search"]')).not.toBeNull();
    expect(trigger.querySelector('[data-warix-symbol="markets"]')).toBeNull();

    cleanup();
    renderToolbar({ compact: true });
    trigger = screen.getByTestId('chart-symbol-search-trigger');
    expect(trigger.querySelector('[data-warix-action="search"]')).not.toBeNull();
    expect(trigger.querySelector('[data-warix-symbol="markets"]')).toBeNull();
  });

  it('offers all five W5 timeframes in one control', () => {
    renderToolbar();
    const group = screen.getByRole('radiogroup', { name: 'Intervalle du graphique' });
    const options = within(group).getAllByRole('radio');
    expect(options.map((option) => option.textContent)).toEqual([...CANDLE_TIMEFRAMES]);
    expect(options).toHaveLength(5);
  });

  it('exposes the current interval to assistive technology, not just to the eye', () => {
    renderToolbar({ timeframe: '3m' });
    expect(screen.getByRole('radio', { name: '3m' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '1m' })).toHaveAttribute('aria-checked', 'false');
  });

  it('changes timeframe in a single action', async () => {
    const user = userEvent.setup();
    const props = renderToolbar();
    await user.click(screen.getByRole('radio', { name: '15s' }));
    expect(props.onSelectTimeframe).toHaveBeenCalledTimes(1);
    expect(props.onSelectTimeframe).toHaveBeenCalledWith('15s');
  });

  it('moves between intervals with the arrow keys and keeps one tab stop', async () => {
    const user = userEvent.setup();
    const props = renderToolbar({ timeframe: '30s' });
    const selected = screen.getByRole('radio', { name: '30s' });
    expect(selected).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('radio', { name: '1m' })).toHaveAttribute('tabIndex', '-1');

    selected.focus();
    await user.keyboard('{ArrowRight}');
    expect(props.onSelectTimeframe).toHaveBeenCalledWith('1m');
    await user.keyboard('{ArrowLeft}');
    expect(props.onSelectTimeframe).toHaveBeenCalledWith('15s');
  });

  it('wraps at both ends so no interval is unreachable by keyboard', async () => {
    const user = userEvent.setup();
    const props = renderToolbar({ timeframe: '5s' });
    screen.getByRole('radio', { name: '5s' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(props.onSelectTimeframe).toHaveBeenCalledWith('3m');
  });

  /**
   * Final closure §5 — a narrow row overflows on purpose.
   *
   * The two rules that matter are stated on the pure function, so they hold
   * wherever the row is rendered: the visible keys are the head of the canonical
   * order, and the active interval is never one of the hidden ones.
   */
  it('keeps every interval on the row when there is width for them', () => {
    expect(visibleTimeframes(5, '5s')).toEqual([...CANDLE_TIMEFRAMES]);
    expect(timeframeSlotsForWidth(1440, false)).toBe(CANDLE_TIMEFRAMES.length);
    expect(timeframeSlotsForWidth(320, false)).toBe(CANDLE_TIMEFRAMES.length);
  });

  it('moves the tail of the interval order behind the overflow on a phone', () => {
    // The counts come from the measured strip — see `timeframeSlotsForWidth`.
    expect(timeframeSlotsForWidth(430, true)).toBe(CANDLE_TIMEFRAMES.length);
    expect(timeframeSlotsForWidth(390, true)).toBe(3);
    expect(timeframeSlotsForWidth(320, true)).toBe(2);
    expect(visibleTimeframes(3, '5s')).toEqual(['5s', '15s', '30s']);
    expect(visibleTimeframes(2, '5s')).toEqual(['5s', '15s']);
  });

  it('never hides the interval the chart is actually drawing', () => {
    expect(visibleTimeframes(3, '3m')).toEqual(['5s', '15s', '3m']);
    expect(visibleTimeframes(4, '3m')).toEqual(['5s', '15s', '30s', '3m']);
  });

  it('reaches an overflowed interval through its menu rather than by scrolling', async () => {
    const user = userEvent.setup();
    const props = renderToolbar({ compact: true, timeframe: '5s' });
    // jsdom reports a desktop-width window, so the row is asked for the narrow
    // composition directly — the width rule itself is covered above.
    const group = screen.getByTestId('chart-timeframe-group');
    expect(within(group).getAllByRole('radio')).toHaveLength(5);
    expect(screen.queryByTestId('chart-timeframe-overflow')).not.toBeInTheDocument();

    cleanup();
    const desktopWidth = window.innerWidth;
    window.innerWidth = 320;
    try {
      renderToolbar({ compact: true, timeframe: '5s', onSelectTimeframe: props.onSelectTimeframe });
      expect(
        within(screen.getByTestId('chart-timeframe-group')).getAllByRole('radio'),
      ).toHaveLength(2);
      await user.click(screen.getByTestId('chart-timeframe-overflow'));
      await user.click(screen.getByTestId('chart-timeframe-overflow-3m'));
      expect(props.onSelectTimeframe).toHaveBeenCalledWith('3m');
    } finally {
      window.innerWidth = desktopWidth;
    }
  });

  /**
   * §21 — no interval the history cannot serve.
   *
   * Stated as a test because the failure mode is silent: adding `1D` to the
   * track would render a chart with a handful of bars and look like a data bug
   * rather than a scope decision.
   */
  it('exposes no long-range interval WX1 history cannot support', () => {
    renderToolbar();
    for (const absent of ['1h', '4h', '1D', '1W', '1M']) {
      expect(screen.queryByRole('radio', { name: absent })).not.toBeInTheDocument();
    }
  });
});

describe('indicator library — §13', () => {
  function renderLibrary(indicators: readonly ChartIndicator[], onToggle = vi.fn()) {
    render(
      <IndicatorLibrary
        indicators={indicators}
        onToggle={onToggle}
        favorites={[]}
        onToggleFavorite={vi.fn()}
      />,
    );
    return onToggle;
  }

  it('renders a named checkbox per indicator, never a colour swatch alone', () => {
    renderLibrary(DEFAULT_CHART_INDICATORS);
    for (const name of ['EMA 20', 'SMA 20', 'SMA 50', 'SMA 100']) {
      expect(screen.getByRole('checkbox', { name })).toBeChecked();
    }
  });

  /**
   * Final closure §10 — the catalogue is the approved scope, and nothing else.
   *
   * Stated as a test because the failure mode is a slow one: an unapproved
   * period costs nothing to add, each one looks harmless, and the phone sheet
   * ends up padded with studies no product decision ever made.
   */
  it('lists exactly the four approved WX1 moving averages', () => {
    renderLibrary(DEFAULT_CHART_INDICATORS);
    expect(screen.getAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))).toEqual([
      'EMA 20',
      'SMA 20',
      'SMA 50',
      'SMA 100',
    ]);
  });

  it('carries no roadmap or developer explanation', () => {
    renderLibrary(DEFAULT_CHART_INDICATORS);
    for (const absent of [/calcule/i, /arriveront/i, /bientôt/i, /prochainement/i]) {
      expect(screen.queryByText(absent)).not.toBeInTheDocument();
    }
  });

  it('toggles exactly the indicator that was clicked', async () => {
    const user = userEvent.setup();
    const onToggle = renderLibrary(DEFAULT_CHART_INDICATORS);
    await user.click(screen.getByRole('checkbox', { name: 'SMA 50' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('sma-50');
  });

  it('reflects a disabled indicator as unchecked', () => {
    renderLibrary(
      DEFAULT_CHART_INDICATORS.map((indicator) =>
        indicator.id === 'ema-20' ? { ...indicator, enabled: false } : indicator,
      ),
    );
    expect(screen.getByRole('checkbox', { name: 'EMA 20' })).not.toBeChecked();
  });

  it('blocks enabling a ninth indicator and says why (§28)', () => {
    const indicators: ChartIndicator[] = [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `sma-${index}`,
        type: 'sma' as const,
        period: index + 2,
        enabled: true,
        style: { color: '#3673C9', width: 1 as const },
      })),
      {
        id: 'ema-extra',
        type: 'ema',
        period: 9,
        enabled: false,
        style: { color: '#7FB6E8', width: 1 },
      },
    ];
    renderLibrary(indicators);
    expect(screen.getByRole('checkbox', { name: 'EMA 9' })).toBeDisabled();
    expect(screen.getByText(/Maximum 8 indicateurs actifs/)).toBeInTheDocument();
  });

  it('searches the real list rather than a static catalogue', async () => {
    const user = userEvent.setup();
    renderLibrary(DEFAULT_CHART_INDICATORS);
    await user.type(screen.getByTestId('indicator-search'), 'ema');
    expect(screen.getByRole('checkbox', { name: 'EMA 20' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'SMA 50' })).not.toBeInTheDocument();
  });

  it('says so rather than showing nothing when a search matches no real indicator', async () => {
    const user = userEvent.setup();
    renderLibrary(DEFAULT_CHART_INDICATORS);
    await user.type(screen.getByTestId('indicator-search'), 'ichimoku');
    expect(screen.getByText(/Aucun indicateur ne correspond/)).toBeInTheDocument();
  });
});

describe('drawing tool rail — §9/§10', () => {
  it('keeps a 44 px rail with light 26 px tool targets', () => {
    renderRail();
    expect(screen.getByTestId('chart-tools-trigger').className).toContain(
      'w-[var(--wariba-component-workstation-drawing-rail-width)]',
    );
    expect(screen.getByTestId('chart-tool-select')).toHaveStyle({ width: '26px', height: '26px' });
  });

  it('groups the taxonomy into families rather than listing every tool flat', () => {
    renderRail();
    for (const family of CHART_TOOL_FAMILIES) {
      expect(screen.getByTestId(`chart-tool-family-${family.id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('chart-tool-select')).toBeInTheDocument();
  });

  it('opens a family flyout and selects a tool from it', async () => {
    const user = userEvent.setup();
    const props = renderRail();
    await user.click(screen.getByTestId('chart-tool-family-lines'));
    expect(screen.getByTestId('chart-tool-flyout-lines')).toBeInTheDocument();
    await user.click(screen.getByTestId('chart-tool-horizontal_ray'));
    expect(props.onSelect).toHaveBeenCalledWith('horizontal_ray');
  });

  it('opens the cursor menu and activates the drawing-only eraser', async () => {
    const user = userEvent.setup();
    const props = renderRail();
    await user.click(screen.getByTestId('chart-tool-select'));
    expect(screen.getByTestId('chart-cursor-flyout')).toBeInTheDocument();
    await user.click(screen.getByTestId('chart-cursor-eraser'));
    expect(props.onSelectCursorMode).toHaveBeenCalledWith('eraser');
  });

  it('can retain the selected drawing tool for repeated placement', async () => {
    const user = userEvent.setup();
    const props = renderRail();
    await user.click(screen.getByTestId('chart-keep-drawing-toggle'));
    expect(props.onToggleKeepDrawingMode).toHaveBeenCalledTimes(1);
  });

  /** §10's product-truth rule: what the flyout lists, the chart draws. */
  it('lists only tools the drawing engine actually implements', async () => {
    const user = userEvent.setup();
    renderRail();
    await user.click(screen.getByTestId('chart-tool-family-lines'));
    const flyout = screen.getByTestId('chart-tool-flyout-lines');
    for (const item of within(flyout).getAllByRole('menuitem')) {
      expect(item).not.toBeDisabled();
    }
  });

  it('offers visibility as a reversible menu, never a delete (§11)', async () => {
    const user = userEvent.setup();
    const props = renderRail();
    await user.click(screen.getByTestId('chart-visibility-trigger'));
    await user.click(screen.getByTestId('chart-hide-drawings'));
    expect(props.onSetDrawingsHidden).toHaveBeenCalledWith(true);
    expect(props.onRemoveAllDrawings).not.toHaveBeenCalled();
  });

  it('states the current visibility rather than a bare toggle label', async () => {
    const user = userEvent.setup();
    renderRail({ drawingsHidden: true });
    await user.click(screen.getByTestId('chart-visibility-trigger'));
    expect(screen.getByTestId('chart-hide-drawings')).toHaveTextContent('Afficher les dessins');
  });

  it('disables the remove-all control when there is nothing to remove', () => {
    renderRail({ drawingCount: 0 });
    expect(screen.getByTestId('chart-remove-drawings')).toBeDisabled();
  });
});

describe('toolbar density — W5 §61/§62/§63 + reopen §20', () => {
  it('carries the charting grammar: studies, preferences, history, utilities', () => {
    renderToolbar();
    for (const testId of [
      'chart-indicators-trigger',
      'chart-settings-trigger',
      'chart-undo',
      'chart-redo',
      'chart-reset-view',
      'chart-snapshot',
      'chart-fullscreen',
    ]) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  });

  /** §20 names these explicitly as things not to add. */
  it('adds none of the broker-specific controls the reference carries', () => {
    renderToolbar();
    for (const absent of [/POS Bracket/i, /Add Chart Link/i, /ticks/i]) {
      expect(screen.queryByText(absent)).not.toBeInTheDocument();
    }
  });

  /**
   * Final closure §4 — the market state is readable, not only coloured.
   *
   * Both presentations carry it: a phone trader gets the same word a desktop
   * trader does, because "is this market open" is not a desktop-only question.
   */
  /*
   * VX1-C.1 §1 — the strip names the instrument and nothing about its status.
   *
   * `EURUSD ● OUVERT` was correct and it was also the third place on one screen
   * claiming everything was fine, next to the account dot and the header's own
   * healthy mark. The word is gone from the toolbar at every status — a closed
   * market is stated by the ticket, where it stops the trader from acting — and
   * the condition survives in full inside the search trigger's accessible name,
   * so nothing that could be heard before is silent now.
   */
  it('names the instrument without printing its market condition', () => {
    for (const props of [{}, { compact: true }, { marketStatus: 'closed' as const }]) {
      renderToolbar(props);
      expect(screen.queryByTestId('chart-market-status')).not.toBeInTheDocument();
      expect(screen.getByTestId('chart-toolbar')).not.toHaveTextContent(/ouvert/i);
      cleanup();
    }
    renderToolbar();
    expect(screen.getByTestId('chart-symbol-search-trigger')).toHaveAccessibleName(
      /Instrument actif : EURUSD\. Marché ouvert/,
    );
  });

  /** §4 — one strip. A second row for identity or status is the failure. */
  it('keeps no bid/ask and no second identity row in the strip', () => {
    renderToolbar();
    for (const absent of [/^bid$/i, /^ask$/i]) {
      expect(screen.queryByText(absent)).not.toBeInTheDocument();
    }
    expect(screen.getAllByTestId('chart-symbol-search-trigger')).toHaveLength(1);
  });

  it('disables history controls that would do nothing', () => {
    renderToolbar({ canUndo: false, canRedo: false });
    expect(screen.getByTestId('chart-undo')).toBeDisabled();
    expect(screen.getByTestId('chart-redo')).toBeDisabled();
  });

  it('drops the desktop cluster on a compact viewport, keeping timeframes reachable (§67)', () => {
    renderToolbar({ compact: true });
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.queryByTestId('chart-indicators-trigger')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chart-settings-trigger')).not.toBeInTheDocument();
  });

  it('exposes one fit control that changes nothing but the view (§63/§17)', async () => {
    const user = userEvent.setup();
    const props = renderToolbar();
    await user.click(screen.getByTestId('chart-reset-view'));
    expect(props.onResetView).toHaveBeenCalledTimes(1);
    // It is not wired to anything that could delete a drawing or move a level.
    expect(props.onSelectTimeframe).not.toHaveBeenCalled();
    expect(props.onOpenIndicators).not.toHaveBeenCalled();
  });
});

describe('bottom chart band — Round 2', () => {
  function renderBottomBar(overrides: Partial<React.ComponentProps<typeof ChartBottomBar>> = {}) {
    const props: React.ComponentProps<typeof ChartBottomBar> = {
      timezone: 'utc',
      historyCoverageSeconds: 0,
      onSelectHorizon: vi.fn(),
      scaleMode: 'normal',
      onScaleModeChange: vi.fn(),
      autoScale: true,
      onAutoScaleChange: vi.fn(),
      ...overrides,
    };
    render(<ChartBottomBar {...props} />);
    return props;
  }

  it('shows the complete horizon, session and scale grammar without fake history actions', () => {
    renderBottomBar();
    for (const label of ['1 an', '3 m', '1 m', '5 j', '3 j', '1 j']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    }
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Échelle en pourcentage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Échelle logarithmique' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ajustement automatique de l’échelle' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects only a horizon actually covered by loaded history', async () => {
    const user = userEvent.setup();
    const props = renderBottomBar({ historyCoverageSeconds: 24 * 60 * 60 });
    await user.click(screen.getByRole('button', { name: '1 j' }));
    expect(props.onSelectHorizon).toHaveBeenCalledWith(24 * 60 * 60);
    expect(screen.getByRole('button', { name: '3 j' })).toBeDisabled();
  });

  it('drives real percentage, log and autoscale state callbacks', async () => {
    const user = userEvent.setup();
    const props = renderBottomBar();
    await user.click(screen.getByRole('button', { name: 'Échelle en pourcentage' }));
    await user.click(screen.getByRole('button', { name: 'Échelle logarithmique' }));
    await user.click(screen.getByRole('button', { name: 'Ajustement automatique de l’échelle' }));
    expect(props.onScaleModeChange).toHaveBeenNthCalledWith(1, 'percentage');
    expect(props.onScaleModeChange).toHaveBeenNthCalledWith(2, 'logarithmic');
    expect(props.onAutoScaleChange).toHaveBeenCalledWith(false);
  });
});

describe('status line — §14 / W5 §39/§65/§128/§142', () => {
  const candle = {
    startTime: 60,
    open: '1.08450',
    high: '1.08500',
    low: '1.08400',
    close: '1.08480',
  };

  function renderStatus(overrides: Partial<React.ComponentProps<typeof ChartStatusLine>> = {}) {
    render(
      <ChartStatusLine
        symbol="EURUSD"
        timeframe="5s"
        marketStatus="open"
        candle={candle}
        pricePrecision={5}
        change={null}
        indicators={[]}
        settings={DEFAULT_CHART_SETTINGS.statusLine}
        {...overrides}
      />,
    );
  }

  it('states the instrument and the interval on the chart itself (§14)', () => {
    renderStatus();
    const identity = screen.getByTestId('chart-identity-line');
    expect(identity).toHaveTextContent('EURUSD');
    expect(identity).toHaveTextContent('5S');
  });

  it('shows O/H/L/C at the instrument’s own precision', () => {
    renderStatus();
    const ohlc = screen.getByTestId('chart-ohlc-legend');
    expect(ohlc).toHaveTextContent('O 1.08450');
    expect(ohlc).toHaveTextContent('H 1.08500');
    expect(ohlc).toHaveTextContent('L 1.08400');
    expect(ohlc).toHaveTextContent('C 1.08480');
  });

  it('never shows volume or a daily percentage (§65/§142)', () => {
    renderStatus();
    expect(screen.getByTestId('chart-status-line').textContent).not.toMatch(/vol|vwap/i);
  });

  it('names each indicator so colour is never the only identifier (§128)', () => {
    renderStatus({
      candle: null,
      indicators: [
        { id: 'sma-50', label: 'SMA 50', color: '#C94D4D', value: 1.0848 },
        { id: 'sma-100', label: 'SMA 100', color: '#E8ECF2', value: null },
      ],
    });
    const legend = screen.getByTestId('chart-indicator-legend');
    expect(legend).toHaveTextContent('SMA 50');
    expect(legend).toHaveTextContent('1.08480');
    // Warming up: an em dash, not a fabricated number.
    expect(legend).toHaveTextContent('SMA 100');
    expect(legend).toHaveTextContent('—');
  });

  it('collapses and restores the indicator stack without hiding chart identity', async () => {
    const user = userEvent.setup();
    renderStatus({
      indicators: [{ id: 'sma-50', label: 'SMA 50', color: '#C94D4D', value: 1.0848 }],
    });
    expect(screen.getByTestId('chart-indicator-legend')).toBeInTheDocument();
    await user.click(screen.getByTestId('chart-legend-collapse'));
    expect(screen.queryByTestId('chart-indicator-legend')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart-identity-line')).toHaveTextContent('EURUSD');
    expect(screen.getByTestId('chart-legend-collapse')).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByTestId('chart-legend-collapse'));
    expect(screen.getByTestId('chart-indicator-legend')).toBeInTheDocument();
  });

  it('cannot intercept a crosshair, a drag or a long press (§39/§64)', () => {
    renderStatus();
    expect(screen.getByTestId('chart-status-line').className).toContain('pointer-events-none');
  });

  it('honours the Status line settings rather than always drawing everything', () => {
    renderStatus({
      settings: { ...DEFAULT_CHART_SETTINGS.statusLine, ohlc: false, title: false },
    });
    expect(screen.queryByTestId('chart-ohlc-legend')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart-identity-line')).not.toHaveTextContent('EURUSD');
  });

  it('says the indicators are hidden rather than rendering an empty gutter (§11)', () => {
    renderStatus({
      indicatorsHidden: true,
      indicators: [{ id: 'sma-50', label: 'SMA 50', color: '#C94D4D', value: 1 }],
    });
    expect(screen.getByText('Indicateurs masqués')).toBeInTheDocument();
  });
});

describe('bar change — §14', () => {
  const candle = {
    startTime: 60,
    open: '1.08450',
    high: '1.08500',
    low: '1.08400',
    close: '1.08480',
  };

  it('reports the move against the previous close, signed and at precision', () => {
    const change = computeBarChange(candle, '1.08430', 5);
    expect(change?.absolute).toBe('+0.00050');
    expect(change?.percent).toBe('+0.05 %');
    expect(change?.direction).toBe('up');
  });

  it('reports a fall as negative', () => {
    const change = computeBarChange(candle, '1.08530', 5);
    expect(change?.direction).toBe('down');
    expect(change?.absolute.startsWith('-')).toBe(true);
  });

  /**
   * The honesty case: with no previous bar there is no change, and printing
   * `+0.00000` would assert the market did not move when the truth is that
   * there is nothing to compare against.
   */
  it('returns nothing at all when there is no previous bar to compare against', () => {
    expect(computeBarChange(candle, null, 5)).toBeNull();
    expect(computeBarChange(null, '1.08430', 5)).toBeNull();
  });
});
