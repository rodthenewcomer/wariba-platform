import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TradingDaysList, type TradingDayItem } from '../src/wariba/TradingDaysList.js';

const DAYS: TradingDayItem[] = [
  { dateLabel: '04 août', finalized: false, netPnlFormatted: '+120 USD' },
  { dateLabel: '03 août', finalized: true, netPnlFormatted: '-45 USD' },
];

describe('TradingDaysList', () => {
  it('shows an explanatory empty state instead of simulating data', () => {
    render(<TradingDaysList days={[]} />);
    expect(screen.getByText('Aucune journée finalisée pour l’instant.')).toBeInTheDocument();
  });

  it('renders every day with its date and net PnL, never a "qualified" label (ONE-024)', () => {
    render(<TradingDaysList days={DAYS} />);
    expect(screen.getByText('04 août')).toBeInTheDocument();
    expect(screen.getByText('+120 USD')).toBeInTheDocument();
    expect(screen.getByText('03 août')).toBeInTheDocument();
    expect(screen.getByText('-45 USD')).toBeInTheDocument();
    expect(screen.queryByText(/qualifi/i)).not.toBeInTheDocument();
  });

  it('marks the still-open day as "En cours" instead of a finalized figure', () => {
    render(<TradingDaysList days={DAYS} />);
    expect(screen.getByText('En cours')).toBeInTheDocument();
  });
});
