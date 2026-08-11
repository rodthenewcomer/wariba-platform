import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { MarketTick, SymbolSpec } from '@wariba/contracts';
import { QuickOrderConfirm } from '../app/(trade)/trade/QuickOrderConfirm';

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
  bid: '1.08600',
  ask: '1.08610',
  timestamp: new Date().toISOString(),
  sequence: 1,
  marketStatus: 'open',
};

const baseProps = {
  open: true,
  onClose: () => {},
  symbol: 'EURUSD' as const,
  side: 'buy' as const,
  quantity: '0.10',
  tick: FRESH_TICK,
  spec: SPEC,
  stopLoss: '',
  takeProfit: '',
  pending: false,
  onConfirm: vi.fn(),
};

describe('QuickOrderConfirm', () => {
  it('shows the current ticket quantity, executable price and estimated margin', () => {
    render(<QuickOrderConfirm {...baseProps} />);
    expect(screen.getByText('EURUSD · Achat · 0.10 lot')).toBeInTheDocument();
    // Buy uses the ask.
    expect(screen.getByText(/Prix exécutable actuel : 1\.08610/)).toBeInTheDocument();
    expect(screen.getByText(/Marge estimée/)).toBeInTheDocument();
  });

  it('uses the bid for a sell', () => {
    render(<QuickOrderConfirm {...baseProps} side="sell" />);
    expect(screen.getByText(/Prix exécutable actuel : 1\.08600/)).toBeInTheDocument();
  });

  it('shows attached SL/TP when the ticket has them configured', () => {
    render(<QuickOrderConfirm {...baseProps} stopLoss="1.08000" takeProfit="1.09000" />);
    expect(screen.getByText(/SL 1\.08000/)).toBeInTheDocument();
    expect(screen.getByText(/TP 1\.09000/)).toBeInTheDocument();
  });

  it('disables confirmation and warns when the market is stale', () => {
    render(<QuickOrderConfirm {...baseProps} tick={{ ...FRESH_TICK, marketStatus: 'stale' }} />);
    expect(screen.getByText('Prix obsolète')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer achat' })).toBeDisabled();
  });

  it('calls onConfirm only on explicit confirmation, not just opening the dialog', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<QuickOrderConfirm {...baseProps} onConfirm={onConfirm} />);
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmer achat' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Annuler does not call onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<QuickOrderConfirm {...baseProps} onConfirm={onConfirm} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
