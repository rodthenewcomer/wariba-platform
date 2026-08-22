import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  buildContextMenuActions,
  ChartContextMenuContent,
} from '../app/(trade)/trade/ChartContextMenu';
import type { MarketTick, PositionDTO } from '@wariba/contracts';

const POSITION: PositionDTO = {
  id: 'pos-1',
  accountId: 'acc-1',
  symbol: 'EURUSD',
  side: 'buy',
  openQuantity: '1.00',
  averageOpenPrice: '1.08452',
  realizedPnl: '0.00',
  stopLoss: null,
  takeProfit: '1.09000',
  status: 'open',
  openedAt: new Date().toISOString(),
  closedAt: null,
};

// bid < ask; a clicked price of 1.08480 sits above both, so among the four
// pending-order types only sell_limit (price > bid) and buy_stop (price >
// ask) are valid there — buy_limit and sell_stop never appear for this tick.
const TICK: MarketTick = {
  symbol: 'EURUSD',
  bid: '1.08450',
  ask: '1.08460',
  marketStatus: 'open',
  timestamp: new Date().toISOString(),
  sequence: 1,
};

const noop = () => {};
const baseProps = {
  onMarketBuy: noop,
  onMarketSell: noop,
  onManageStopLoss: noop,
  onManageTakeProfit: noop,
  onPartialClose: noop,
  onClosePosition: noop,
  onPendingOrderRequest: noop,
  onCreateAlertHere: noop,
  clickedPriceFormatted: '1.08480',
  tick: null as MarketTick | null,
};

describe('buildContextMenuActions', () => {
  it('offers only Market Buy/Sell and Create alert when there is no position and no live tick', () => {
    const actions = buildContextMenuActions({ position: null, ...baseProps });
    expect(actions.map((a) => a.key)).toEqual(['market_buy', 'market_sell']);
  });

  it('adds SL/TP/partial-close/close actions once a position exists', () => {
    const actions = buildContextMenuActions({ position: POSITION, ...baseProps });
    const keys = actions.map((a) => a.key);
    expect(keys).toEqual([
      'market_buy',
      'market_sell',
      'manage_sl',
      'manage_tp',
      'partial_close',
      'close_position',
    ]);
  });

  it('labels SL/TP actions "Ajouter" when unset and "Déplacer" when already set', () => {
    const actions = buildContextMenuActions({ position: POSITION, ...baseProps });
    expect(actions.find((a) => a.key === 'manage_sl')?.label).toBe('Ajouter un Stop Loss');
    expect(actions.find((a) => a.key === 'manage_tp')?.label).toBe('Déplacer le Take Profit');
  });

  it('marks Close position with danger tone', () => {
    const actions = buildContextMenuActions({ position: POSITION, ...baseProps });
    expect(actions.find((a) => a.key === 'close_position')?.tone).toBe('danger');
  });

  it('only suggests the pending-order types actually valid at the clicked price for the live tick', () => {
    const actions = buildContextMenuActions({ position: null, ...baseProps, tick: TICK });
    const keys = actions.map((a) => a.key);
    expect(keys).toEqual(['market_buy', 'market_sell', 'pending_sell_limit', 'pending_buy_stop']);
    expect(keys).not.toContain('pending_buy_limit');
    expect(keys).not.toContain('pending_sell_stop');
  });

  it('never shows an invalid pending-order choice, only ever valid ones for the given price', () => {
    // Clicked well below the tick: only buy_limit (price < ask) and
    // sell_stop (price < bid) are valid there.
    const actions = buildContextMenuActions({
      position: null,
      ...baseProps,
      clickedPriceFormatted: '1.08400',
      tick: TICK,
    });
    const keys = actions.map((a) => a.key);
    expect(keys).toContain('pending_buy_limit');
    expect(keys).toContain('pending_sell_stop');
    expect(keys).not.toContain('pending_sell_limit');
    expect(keys).not.toContain('pending_buy_stop');
  });
});

describe('ChartContextMenuContent', () => {
  it('shows the clicked price as a heading', () => {
    render(
      <ChartContextMenuContent
        position={null}
        disabled={false}
        disabledReason={null}
        {...baseProps}
      />,
    );
    expect(screen.getByText('Prix 1.08480')).toBeInTheDocument();
  });

  it('disables the price-dependent actions, and only those, when the quote is stale', () => {
    render(
      <ChartContextMenuContent
        position={POSITION}
        disabled
        disabledReason="Prix obsolète."
        {...baseProps}
        onResetView={noop}
        onOpenSettings={noop}
      />,
    );
    expect(screen.getByText('Prix obsolète.')).toBeInTheDocument();
    /*
     * Scoped, not global — reopen §16.
     *
     * A stale quote disables the *price and trading* bands, because a price you
     * cannot trust must not become an order. It deliberately leaves the chart
     * and object bands alone: resetting a viewport or hiding a drawing has
     * nothing to do with quote freshness, and greying them out would tell the
     * trader something untrue. This spec previously asserted the global form,
     * which was correct only while the menu had no non-trading actions.
     */
    for (const key of ['market_buy', 'market_sell', 'close_position', 'create_alert']) {
      expect(screen.getByTestId(`chart-menu-${key}`)).toBeDisabled();
    }
    expect(screen.getByTestId('chart-menu-reset_view')).toBeEnabled();
    expect(screen.getByTestId('chart-menu-settings')).toBeEnabled();
  });

  it('calls the matching handler when an action is clicked', async () => {
    const user = userEvent.setup();
    const onMarketBuy = vi.fn();
    render(
      <ChartContextMenuContent
        position={null}
        disabled={false}
        disabledReason={null}
        {...baseProps}
        onMarketBuy={onMarketBuy}
      />,
    );
    await user.click(screen.getByRole('menuitem', { name: 'Achat au marché' }));
    expect(onMarketBuy).toHaveBeenCalledTimes(1);
  });

  it('calls onPendingOrderRequest with the chosen order type when a pending-order suggestion is clicked', async () => {
    const user = userEvent.setup();
    const onPendingOrderRequest = vi.fn();
    render(
      <ChartContextMenuContent
        position={null}
        disabled={false}
        disabledReason={null}
        {...baseProps}
        tick={TICK}
        onPendingOrderRequest={onPendingOrderRequest}
      />,
    );
    await user.click(screen.getByRole('menuitem', { name: 'Sell Limit ici' }));
    expect(onPendingOrderRequest).toHaveBeenCalledWith('sell_limit');
  });

  it('calls onCreateAlertHere when Create alert is clicked', async () => {
    const user = userEvent.setup();
    const onCreateAlertHere = vi.fn();
    render(
      <ChartContextMenuContent
        position={null}
        disabled={false}
        disabledReason={null}
        {...baseProps}
        onCreateAlertHere={onCreateAlertHere}
      />,
    );
    await user.click(screen.getByRole('menuitem', { name: 'Créer une alerte @ 1.08480' }));
    expect(onCreateAlertHere).toHaveBeenCalledTimes(1);
  });
});
