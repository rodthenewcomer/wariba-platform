import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QualifiedDaysTracker } from '../src/wariba/QualifiedDaysTracker.js';

describe('QualifiedDaysTracker', () => {
  it('exposes each day’s qualification status as text, not color alone', () => {
    render(
      <QualifiedDaysTracker
        requiredCount={3}
        qualifiedCount={1}
        thresholdFormatted="200 USD"
        days={[
          { dateLabel: '1 août', qualified: true, finalized: true, netPnlFormatted: '250 USD' },
          { dateLabel: '2 août', qualified: false, finalized: true, netPnlFormatted: '50 USD' },
          { dateLabel: '3 août', qualified: false, finalized: false, netPnlFormatted: '—' },
        ]}
      />,
    );

    expect(screen.getByText('Qualifiée')).toBeInTheDocument();
    expect(screen.getByText('Non qualifiée')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
  });
});
