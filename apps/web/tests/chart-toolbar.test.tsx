import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CANDLE_TIMEFRAMES } from '@wariba/contracts';
import { ChartToolbar, IndicatorOptions, ToolOptions } from '../app/(trade)/trade/ChartToolbar';
import { ChartLegend } from '../app/(trade)/trade/ChartLegend';
import {
  DEFAULT_CHART_INDICATORS,
  type ChartIndicator,
} from '../app/(trade)/trade/chart-indicator-model';

/**
 * W5 §14/§38/§86/§87/§88 — the toolbar's accessibility and density contract.
 *
 * These assert the semantics a screen-reader user depends on and a colour-only
 * design would fail: a real radiogroup with arrow-key navigation, real
 * checkboxes with names, and pressed state exposed to assistive technology
 * rather than implied by a background colour.
 */

function renderToolbar(overrides: Partial<React.ComponentProps<typeof ChartToolbar>> = {}) {
  const props = {
    timeframe: '5s' as const,
    onSelectTimeframe: vi.fn(),
    indicators: DEFAULT_CHART_INDICATORS,
    onToggleIndicator: vi.fn(),
    tool: 'select' as const,
    onSelectTool: vi.fn(),
    onResetView: vi.fn(),
    ...overrides,
  };
  render(<ChartToolbar {...props} />);
  return props;
}

describe('timeframe selector — W5 §14/§86', () => {
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
});

describe('indicator controls — W5 §38/§87', () => {
  it('renders a named checkbox per indicator, never a colour swatch alone', () => {
    render(<IndicatorOptions indicators={DEFAULT_CHART_INDICATORS} onToggle={vi.fn()} />);
    for (const name of ['EMA 20', 'SMA 20', 'SMA 50', 'SMA 100']) {
      expect(screen.getByRole('checkbox', { name })).toBeChecked();
    }
  });

  it('toggles exactly the indicator that was clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<IndicatorOptions indicators={DEFAULT_CHART_INDICATORS} onToggle={onToggle} />);
    await user.click(screen.getByRole('checkbox', { name: 'SMA 50' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('sma-50');
  });

  it('reflects a disabled indicator as unchecked', () => {
    const indicators = DEFAULT_CHART_INDICATORS.map((indicator) =>
      indicator.id === 'ema-20' ? { ...indicator, enabled: false } : indicator,
    );
    render(<IndicatorOptions indicators={indicators} onToggle={vi.fn()} />);
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
    render(<IndicatorOptions indicators={indicators} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'EMA 9' })).toBeDisabled();
    expect(screen.getByText(/Maximum 8 indicateurs actifs/)).toBeInTheDocument();
  });
});

describe('drawing tools — W5 §88', () => {
  it('gives every tool a text name and exposes which one is held', () => {
    render(<ToolOptions tool="fibonacci" onSelect={vi.fn()} />);
    for (const name of [
      'Sélection',
      'Ligne horizontale',
      'Ligne de tendance',
      'Demi-droite',
      'Rectangle',
      'Fibonacci',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Fibonacci' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Sélection' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('offers exactly the six W5 tools and no more', () => {
    render(<ToolOptions tool="select" onSelect={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Outils de dessin' });
    expect(within(group).getAllByRole('button')).toHaveLength(6);
  });
});

describe('toolbar density — W5 §61/§62/§63', () => {
  it('keeps indicators and drawing tools behind compact popovers', async () => {
    const user = userEvent.setup();
    renderToolbar();
    // Not permanently occupying the strip: the tools only exist once opened.
    expect(screen.queryByRole('group', { name: 'Outils de dessin' })).not.toBeInTheDocument();
    await user.click(screen.getByTestId('chart-tools-trigger'));
    expect(screen.getByRole('group', { name: 'Outils de dessin' })).toBeInTheDocument();
  });

  it('drops the popovers on a compact viewport, keeping timeframes reachable (§67)', () => {
    renderToolbar({ compact: true });
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.queryByTestId('chart-tools-trigger')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chart-indicators-trigger')).not.toBeInTheDocument();
  });

  it('exposes one fit control that changes nothing but the view (§63)', async () => {
    const user = userEvent.setup();
    const props = renderToolbar();
    await user.click(screen.getByTestId('chart-reset-view'));
    expect(props.onResetView).toHaveBeenCalledTimes(1);
    // It is not wired to anything that could delete a drawing or move a level.
    expect(props.onSelectTool).not.toHaveBeenCalled();
    expect(props.onToggleIndicator).not.toHaveBeenCalled();
    expect(props.onSelectTimeframe).not.toHaveBeenCalled();
  });
});

describe('legend — W5 §39/§65/§128/§142', () => {
  const candle = {
    startTime: 60,
    open: '1.08450',
    high: '1.08500',
    low: '1.08400',
    close: '1.08480',
  };

  it('shows O/H/L/C at the instrument’s own precision', () => {
    render(<ChartLegend candle={candle} pricePrecision={5} indicators={[]} />);
    const ohlc = screen.getByTestId('chart-ohlc-legend');
    expect(ohlc).toHaveTextContent('O 1.08450');
    expect(ohlc).toHaveTextContent('H 1.08500');
    expect(ohlc).toHaveTextContent('L 1.08400');
    expect(ohlc).toHaveTextContent('C 1.08480');
  });

  it('never shows volume, VWAP or a daily percentage (§65/§142)', () => {
    render(<ChartLegend candle={candle} pricePrecision={5} indicators={[]} />);
    const legend = screen.getByTestId('chart-legend');
    expect(legend.textContent).not.toMatch(/vol|vwap|%/i);
  });

  it('names each indicator so colour is never the only identifier (§128)', () => {
    render(
      <ChartLegend
        candle={null}
        pricePrecision={5}
        indicators={[
          { id: 'sma-50', label: 'SMA 50', color: '#C94D4D', value: 1.0848 },
          { id: 'sma-100', label: 'SMA 100', color: '#E8ECF2', value: null },
        ]}
      />,
    );
    const legend = screen.getByTestId('chart-indicator-legend');
    expect(legend).toHaveTextContent('SMA 50');
    expect(legend).toHaveTextContent('1.08480');
    // Warming up: an em dash, not a fabricated number.
    expect(legend).toHaveTextContent('SMA 100');
    expect(legend).toHaveTextContent('—');
  });

  it('cannot intercept a crosshair, a drag or a long press (§39/§64)', () => {
    render(<ChartLegend candle={candle} pricePrecision={5} indicators={[]} />);
    expect(screen.getByTestId('chart-legend').className).toContain('pointer-events-none');
  });
});
