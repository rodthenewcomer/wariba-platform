import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { MarketTick, PositionDTO, SymbolSpec } from '@wariba/contracts';
import { PartialCloseSheet } from '../app/(trade)/trade/PartialCloseSheet';

// jsdom does not implement HTMLDialogElement.showModal()/close() — same
// polyfill packages/ui/tests/Dialog.test.tsx uses, needed here because
// BottomSheet renders a native <dialog>.
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

// quantityStep/minimumQuantity deliberately padded to numeric(14,4)'s real
// scale, not the "0.01" shorthand — app.symbol_specs delivers them this way
// for real (Postgres always right-pads a numeric(14,4) column to 4 decimal
// places), and a prior bug (decimalPlacesOf counting raw string length)
// only ever showed up against this padded shape, never a hand-typed '0.01'.
const SPEC: SymbolSpec = {
  symbol: 'EURUSD',
  assetClass: 'forex_major',
  pricePrecision: 5,
  contractSize: '100000',
  minimumQuantity: '0.0100',
  maximumQuantity: '10.0000',
  quantityStep: '0.0100',
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

const STALE_TICK: MarketTick = { ...FRESH_TICK, marketStatus: 'stale' };

function makePosition(overrides: Partial<PositionDTO> = {}): PositionDTO {
  return {
    id: 'pos-1',
    accountId: 'acc-1',
    symbol: 'EURUSD',
    side: 'buy',
    // Ledger precision (numeric(14,4)), matching what app.positions really
    // returns — not the display-precision "1.00" shorthand.
    openQuantity: '1.0000',
    averageOpenPrice: '1.08300',
    realizedPnl: '0.00',
    stopLoss: null,
    takeProfit: null,
    status: 'open',
    openedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    closedAt: null,
    ...overrides,
  };
}

const baseProps = {
  open: true,
  onClose: () => {},
  spec: SPEC,
  tick: FRESH_TICK,
  pending: false,
  rejection: null,
  queuedReductions: [],
  onSubmitPartialClose: vi.fn(),
  onSubmitFullClose: vi.fn(),
  onQueueReduction: vi.fn(),
  onCancelQueuedReduction: vi.fn(),
};

describe('PartialCloseSheet', () => {
  it('defaults to 25% and shows the required "Close X of Y lot?" confirmation copy', () => {
    render(<PartialCloseSheet {...baseProps} position={makePosition()} />);
    expect(screen.getByText(/Clôturer 0\.25 sur 1\.00 lot/)).toBeInTheDocument();
    expect(screen.getByText(/Restant après clôture : 0\.75 lot/)).toBeInTheDocument();
  });

  it('never labels the action simply "Close" when a position will remain open', () => {
    render(<PartialCloseSheet {...baseProps} position={makePosition()} />);
    expect(
      screen.getByRole('button', { name: 'Confirmer la clôture partielle' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument();
  });

  it('switching to 50%/75% updates the previewed quantity', async () => {
    const user = userEvent.setup();
    render(<PartialCloseSheet {...baseProps} position={makePosition()} />);
    await user.click(screen.getByRole('button', { name: '50%' }));
    expect(screen.getByText(/Clôturer 0\.50 sur 1\.00 lot/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '75%' }));
    expect(screen.getByText(/Clôturer 0\.75 sur 1\.00 lot/)).toBeInTheDocument();
  });

  it('disables a preset that would round to zero or an invalid lot size, with a reason', () => {
    // 25% of 0.01 lot at a 0.01 step rounds to 0 — must be disabled, not silently wrong.
    render(
      <PartialCloseSheet {...baseProps} position={makePosition({ openQuantity: '0.0100' })} />,
    );
    const preset25 = screen.getByRole('button', { name: '25%' });
    expect(preset25).toBeDisabled();
    expect(preset25).toHaveAttribute('title');
  });

  it('rounds a custom quantity to the lot step and never exceeds the open quantity', async () => {
    const user = userEvent.setup();
    render(<PartialCloseSheet {...baseProps} position={makePosition()} />);
    await user.click(screen.getByRole('button', { name: 'Personnalisé' }));
    const input = screen.getByLabelText('Quantité à clôturer (lots)');
    await user.clear(input);
    await user.type(input, '5.00');
    // 5.00 requested against a 1.00 lot open position clamps to just under 1.00 (a full close is a separate action).
    expect(screen.getByText(/Clôturer 0\.99 sur 1\.00 lot/)).toBeInTheDocument();
  });

  it('shows a 60-second ineligibility warning for a fresh, profitable position — same claims as the appendix copy, in the app’s own French', () => {
    render(
      <PartialCloseSheet
        {...baseProps}
        position={makePosition({ openedAt: new Date().toISOString(), averageOpenPrice: '1.08000' })}
      />,
    );
    expect(screen.getByText('Portion profitable détenue moins de 60 secondes')).toBeInTheDocument();
    expect(
      screen.getByText(/ne comptera pas pour votre évaluation, votre buffer/),
    ).toBeInTheDocument();
    // Never blocks closing despite the warning.
    expect(
      screen.getByRole('button', { name: 'Confirmer la clôture partielle' }),
    ).not.toBeDisabled();
  });

  it('does not show the short-duration warning for a losing position, even if fresh', () => {
    render(
      <PartialCloseSheet
        {...baseProps}
        position={makePosition({ openedAt: new Date().toISOString(), averageOpenPrice: '1.09000' })}
      />,
    );
    expect(
      screen.queryByText('Portion profitable détenue moins de 60 secondes'),
    ).not.toBeInTheDocument();
  });

  it('calls onSubmitPartialClose with the rounded quantity when the market is fresh', async () => {
    const user = userEvent.setup();
    const onSubmitPartialClose = vi.fn();
    render(
      <PartialCloseSheet
        {...baseProps}
        position={makePosition()}
        onSubmitPartialClose={onSubmitPartialClose}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Confirmer la clôture partielle' }));
    expect(onSubmitPartialClose).toHaveBeenCalledWith({ positionId: 'pos-1', quantity: '0.25' });
  });

  it('offers to queue the reduction instead of submitting immediately when the market is stale', async () => {
    const user = userEvent.setup();
    const onQueueReduction = vi.fn();
    const onSubmitPartialClose = vi.fn();
    render(
      <PartialCloseSheet
        {...baseProps}
        tick={STALE_TICK}
        position={makePosition()}
        onQueueReduction={onQueueReduction}
        onSubmitPartialClose={onSubmitPartialClose}
      />,
    );
    expect(screen.getByText('Prix obsolète')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mettre en file la clôture partielle' }));
    expect(onQueueReduction).toHaveBeenCalledWith({
      positionId: 'pos-1',
      mode: 'partial',
      quantity: '0.25',
    });
    expect(onSubmitPartialClose).not.toHaveBeenCalled();
  });

  it('shows the queued-reduction PENDING MARKET RESUME state with a cancel action', async () => {
    const user = userEvent.setup();
    const onCancelQueuedReduction = vi.fn();
    render(
      <PartialCloseSheet
        {...baseProps}
        tick={STALE_TICK}
        position={makePosition()}
        queuedReductions={[
          {
            id: 'queue-1',
            positionId: 'pos-1',
            symbol: 'EURUSD',
            mode: 'partial',
            requestedQuantity: '0.40',
            status: 'queued',
            queuedAt: new Date().toISOString(),
            executedAt: null,
            cancelledAt: null,
            executionOrderId: null,
            failureReason: null,
          },
        ]}
        onCancelQueuedReduction={onCancelQueuedReduction}
      />,
    );
    expect(screen.getByText('En attente de reprise du marché')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Annuler la demande en attente' }));
    expect(onCancelQueuedReduction).toHaveBeenCalledWith('queue-1');
  });
});
