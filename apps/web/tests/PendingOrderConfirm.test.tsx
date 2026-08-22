import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { MarketTick, SymbolSpec } from '@wariba/contracts';
import { PendingOrderConfirm } from '../app/(trade)/trade/PendingOrderConfirm';

// jsdom does not implement HTMLDialogElement.showModal()/close() — same
// polyfill packages/ui/tests/Dialog.test.tsx uses.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const SPEC: SymbolSpec = {
  symbol: 'EURUSD',
  assetClass: 'forex_major',
  pricePrecision: 5,
  contractSize: '100000',
  minimumQuantity: '0.01',
  maximumQuantity: '10',
  quantityStep: '0.01',
  leverage: 100,
  commissionPerLot: '3.5000',
};

const FRESH_TICK: MarketTick = {
  symbol: 'EURUSD',
  bid: '1.08450',
  ask: '1.08460',
  timestamp: new Date().toISOString(),
  sequence: 1,
  marketStatus: 'open',
};

const baseProps = {
  open: true,
  onClose: () => {},
  symbol: 'EURUSD' as const,
  orderType: 'buy_limit' as const,
  triggerPrice: '1.08400',
  quantity: '0.10',
  tick: FRESH_TICK,
  spec: SPEC,
  stopLoss: '',
  takeProfit: '',
  pending: false,
  onConfirm: vi.fn(),
};

describe('PendingOrderConfirm', () => {
  // Dialog (@wariba/ui) keeps its children mounted even while closed
  // (native <dialog>, toggled via showModal()/close(), never unmounted) —
  // so this component renders on every /trade page load, not just when a
  // chart-initiated pending-order request is actually open. TradeClient
  // passes triggerPrice: '' in that closed state
  // (pendingOrderRequest?.triggerPrice ?? ''). A real regression: both
  // isPendingOrderCreationPriceValid and pendingOrderDistancePoints
  // (@wariba/domain) call `new Decimal(triggerPrice)` internally, which
  // throws on an empty string — this used to crash the entire /trade
  // render tree on every load, caught only by CI's E2E suite (every test
  // failed with "Buy button not found") since no unit test ever rendered
  // this component in its closed, empty-triggerPrice default state.
  it('renders without throwing when closed with an empty trigger price (the real closed-state default)', () => {
    expect(() =>
      render(<PendingOrderConfirm {...baseProps} open={false} triggerPrice="" />),
    ).not.toThrow();
  });

  it('shows the order type, quantity, and trigger price', () => {
    render(<PendingOrderConfirm {...baseProps} />);
    expect(screen.getByText('EURUSD · Buy Limit · 0.10 lot')).toBeInTheDocument();
    expect(screen.getByText(/Déclenchement à 1\.08400/)).toBeInTheDocument();
  });

  it('shows attached SL/TP when the ticket has them configured', () => {
    render(<PendingOrderConfirm {...baseProps} stopLoss="1.08000" takeProfit="1.09000" />);
    expect(screen.getByText(/SL 1\.08000/)).toBeInTheDocument();
    expect(screen.getByText(/TP 1\.09000/)).toBeInTheDocument();
  });

  it('disables confirmation and warns when the market is stale', () => {
    render(<PendingOrderConfirm {...baseProps} tick={{ ...FRESH_TICK, marketStatus: 'stale' }} />);
    expect(screen.getByText('Cours non actualisé')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeDisabled();
  });

  it('disables confirmation and warns when the market moved past a valid trigger price for this order type', () => {
    // buy_limit requires triggerPrice < ask (1.08460) — no longer true here.
    render(<PendingOrderConfirm {...baseProps} triggerPrice="1.08470" />);
    expect(screen.getByText('Prix de déclenchement invalide')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeDisabled();
  });

  it('calls onConfirm only on explicit confirmation, not just opening the dialog', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<PendingOrderConfirm {...baseProps} onConfirm={onConfirm} />);
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Annuler does not call onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<PendingOrderConfirm {...baseProps} onConfirm={onConfirm} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
