import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OpenPositionsTable, type OpenPositionRow } from '../src/wariba/OpenPositionsTable.js';

const POSITIONS: OpenPositionRow[] = [
  {
    id: 'pos-1',
    symbol: 'EURUSD',
    sideLabel: 'Achat',
    quantityFormatted: '0.10',
    entryPriceFormatted: '1.08450',
    openedAtLabel: '4 août 2026, 09:12',
  },
];

describe('OpenPositionsTable', () => {
  it('shows an explanatory empty state instead of simulating data', () => {
    render(<OpenPositionsTable positions={[]} />);
    expect(screen.getByText('Aucune position ouverte.')).toBeInTheDocument();
  });

  it('renders every position with symbol, side, size, and entry price', () => {
    render(<OpenPositionsTable positions={POSITIONS} />);
    expect(screen.getByText('EURUSD · Achat')).toBeInTheDocument();
    expect(screen.getByText('0.10')).toBeInTheDocument();
    expect(screen.getByText('1.08450')).toBeInTheDocument();
  });

  it('never shows a PnL or live-price column (ENG-028: no live price source here)', () => {
    render(<OpenPositionsTable positions={POSITIONS} />);
    expect(screen.queryByText(/pnl/i)).not.toBeInTheDocument();
  });
});
