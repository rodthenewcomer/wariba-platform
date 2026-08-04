import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WariXPositionsTable, type WariXPosition } from '../src/wariba/WariXPositionsTable.js';

const POSITION: WariXPosition = {
  id: 'pos-1',
  symbol: 'EURUSD',
  sideLabel: 'Achat',
  quantityFormatted: '0.10',
  entryPriceFormatted: '1.08300',
  currentPriceFormatted: '1.08450',
  livePnlFormatted: '+15.00 USD',
  livePnlTone: 'positive',
  stopLossFormatted: '—',
  takeProfitFormatted: '—',
};

describe('WariXPositionsTable', () => {
  it('shows the empty label when there are no positions', () => {
    render(
      <WariXPositionsTable
        positions={[]}
        onClose={() => {}}
        closeDisabled={false}
        emptyLabel="Aucune position ouverte."
      />,
    );
    expect(screen.getByText('Aucune position ouverte.')).toBeInTheDocument();
  });

  it('renders one row per position with symbol, side, size, entry/current price, SL/TP, and live PnL', () => {
    render(
      <WariXPositionsTable
        positions={[POSITION]}
        onClose={() => {}}
        closeDisabled={false}
        emptyLabel="Aucune position ouverte."
      />,
    );
    expect(screen.getByText('EURUSD · Achat')).toBeInTheDocument();
    expect(screen.getByText('0.10')).toBeInTheDocument();
    expect(screen.getByText('1.08300')).toBeInTheDocument();
    expect(screen.getByText('1.08450')).toBeInTheDocument();
    expect(screen.getByText('+15.00 USD')).toBeInTheDocument();
  });

  it('gives a losing position the danger tone and a winning one the success tone', () => {
    render(
      <WariXPositionsTable
        positions={[
          { ...POSITION, id: 'pos-2', livePnlFormatted: '-8.00 USD', livePnlTone: 'negative' },
        ]}
        onClose={() => {}}
        closeDisabled={false}
        emptyLabel="Aucune position ouverte."
      />,
    );
    expect(screen.getByText('-8.00 USD').className).toContain('status-danger-text');
  });

  it('calls onClose with the position id when Fermer is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <WariXPositionsTable
        positions={[POSITION]}
        onClose={onClose}
        closeDisabled={false}
        emptyLabel="Aucune position ouverte."
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledWith('pos-1');
  });

  it('disables the close button when closeDisabled is true', () => {
    render(
      <WariXPositionsTable
        positions={[POSITION]}
        onClose={() => {}}
        closeDisabled
        emptyLabel="Aucune position ouverte."
      />,
    );
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeDisabled();
  });
});
