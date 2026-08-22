import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Guardian } from '../src/wariba/Guardian.js';

describe('Guardian', () => {
  it('shows the deterministic figures — margin, DLL, and max loss remaining', () => {
    render(
      <Guardian
        symbol="EURUSD"
        quantityFormatted="0.10"
        marginEstimatedFormatted="108.50 USD"
        dailyLossRemainingFormatted="180.00 USD"
        maximumLossRemainingFormatted="949.30 USD"
        concentration={[]}
        isPriceStale={false}
      />,
    );
    expect(screen.getByText('Marge estimée')).toBeInTheDocument();
    expect(screen.getByText('108.50 USD')).toBeInTheDocument();
    expect(screen.getByText('180.00 USD')).toBeInTheDocument();
    expect(screen.getByText('949.30 USD')).toBeInTheDocument();
  });

  it('never recommends a side — no buy/sell/setup/probability copy anywhere', () => {
    render(
      <Guardian
        symbol="EURUSD"
        quantityFormatted="0.10"
        marginEstimatedFormatted="108.50 USD"
        dailyLossRemainingFormatted="180.00 USD"
        maximumLossRemainingFormatted="949.30 USD"
        concentration={[]}
        isPriceStale={false}
      />,
    );
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/achetez|vendez|setup fort|probabilit/i);
  });

  it('renders a concentration bar per bucket with an accessible progressbar role', () => {
    render(
      <Guardian
        symbol="EURUSD"
        quantityFormatted="0.10"
        marginEstimatedFormatted="108.50 USD"
        dailyLossRemainingFormatted="180.00 USD"
        maximumLossRemainingFormatted="949.30 USD"
        concentration={[
          {
            bucket: 'forex',
            label: 'Forex (EUR/USD, GBP/USD, USD/JPY)',
            usedFormatted: '0.30',
            limitFormatted: '1.00',
            usedRatioPercent: 30,
          },
        ]}
        isPriceStale={false}
      />,
    );
    expect(screen.getByText('Forex (EUR/USD, GBP/USD, USD/JPY)')).toBeInTheDocument();
    expect(screen.getByText('0.30 / 1.00')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '30');
  });

  it('shows a stale-price warning only when the price is stale', () => {
    const { rerender } = render(
      <Guardian
        symbol="EURUSD"
        quantityFormatted="0.10"
        marginEstimatedFormatted="108.50 USD"
        dailyLossRemainingFormatted="180.00 USD"
        maximumLossRemainingFormatted="949.30 USD"
        concentration={[]}
        isPriceStale={false}
      />,
    );
    expect(screen.queryByText(/Cours non actualisé/)).not.toBeInTheDocument();

    rerender(
      <Guardian
        symbol="EURUSD"
        quantityFormatted="0.10"
        marginEstimatedFormatted="108.50 USD"
        dailyLossRemainingFormatted="180.00 USD"
        maximumLossRemainingFormatted="949.30 USD"
        concentration={[]}
        isPriceStale
      />,
    );
    expect(screen.getByText(/Cours non actualisé/)).toBeInTheDocument();
  });

  it('shows the restriction label only when provided', () => {
    render(
      <Guardian
        symbol="EURUSD"
        quantityFormatted="0.10"
        marginEstimatedFormatted="108.50 USD"
        dailyLossRemainingFormatted="180.00 USD"
        maximumLossRemainingFormatted="949.30 USD"
        concentration={[]}
        isPriceStale={false}
        restrictionLabel="Weekend dans 2h"
      />,
    );
    expect(screen.getByText('Weekend dans 2h')).toBeInTheDocument();
  });
});
