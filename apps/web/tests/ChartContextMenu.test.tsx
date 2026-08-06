import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  buildContextMenuActions,
  ChartContextMenuContent,
} from '../app/(trade)/trade/ChartContextMenu';
import type { PositionDTO } from '@wariba/contracts';

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

const noop = () => {};
const baseProps = {
  onMarketBuy: noop,
  onMarketSell: noop,
  onManageStopLoss: noop,
  onManageTakeProfit: noop,
  onPartialClose: noop,
  onClosePosition: noop,
};

describe('buildContextMenuActions', () => {
  it('offers only Market Buy/Sell when there is no position on this symbol', () => {
    const actions = buildContextMenuActions({ position: null, ...baseProps });
    expect(actions.map((a) => a.key)).toEqual(['market_buy', 'market_sell']);
  });

  it('adds SL/TP/partial-close/close actions once a position exists, never a pending-order action', () => {
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
    expect(
      keys.some((k) => k.includes('limit') || k.includes('stop_order') || k.includes('alert')),
    ).toBe(false);
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
});

describe('ChartContextMenuContent', () => {
  it('shows the clicked price as a heading', () => {
    render(
      <ChartContextMenuContent
        clickedPriceFormatted="1.08480"
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
        clickedPriceFormatted="1.08480"
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
        clickedPriceFormatted="1.08480"
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
});
