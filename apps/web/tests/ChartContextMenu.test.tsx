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
    expect(actions.map((a) => a.key)).toEqual(['market_buy', 'market_sell', 'create_alert']);
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
      'create_alert',
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
    expect(keys).toEqual([
      'market_buy',
      'market_sell',
      'pending_sell_limit',
      'pending_buy_stop',
      'create_alert',
    ]);
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

  it('disables every action and shows the reason when disabled', () => {
    render(
      <ChartContextMenuContent
        position={POSITION}
        disabled
        disabledReason="Prix obsolète."
        {...baseProps}
      />,
    );
    expect(screen.getByText('Prix obsolète.')).toBeInTheDocument();
    for (const item of screen.getAllByRole('menuitem')) {
      expect(item).toBeDisabled();
    }
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
    await user.click(screen.getByRole('menuitem', { name: 'Vente Limite ici' }));
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
    await user.click(screen.getByRole('menuitem', { name: 'Créer une alerte ici' }));
    expect(onCreateAlertHere).toHaveBeenCalledTimes(1);
  });
});
