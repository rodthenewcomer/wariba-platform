import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityTimeline, type ActivityTimelineItem } from '../src/wariba/ActivityTimeline.js';

const ITEMS: ActivityTimelineItem[] = [
  {
    id: 'transition-1',
    label: 'Objectif de profit atteint',
    detail: 'active → pass_pending',
    timestampLabel: '3 août 2026, 14:05',
    severity: 'success',
  },
  {
    id: 'violation-1',
    label: 'Limite de perte quotidienne',
    detail: 'Seuil 300 USD · observé 305 USD',
    timestampLabel: '2 août 2026, 09:12',
    severity: 'warning',
  },
];

describe('ActivityTimeline', () => {
  it('shows an explanatory empty state instead of simulating data', () => {
    render(<ActivityTimeline items={[]} />);
    expect(screen.getByText('Aucune activité pour l’instant.')).toBeInTheDocument();
  });

  it('renders every item with its label, detail, and timestamp', () => {
    render(<ActivityTimeline items={ITEMS} />);
    expect(screen.getByText('Objectif de profit atteint')).toBeInTheDocument();
    expect(screen.getByText('active → pass_pending')).toBeInTheDocument();
    expect(screen.getByText('3 août 2026, 14:05')).toBeInTheDocument();
    expect(screen.getByText(/Seuil 300 USD/)).toBeInTheDocument();
  });

  it('omits the detail line when none is provided', () => {
    render(
      <ActivityTimeline
        items={[
          {
            id: 'fill-1',
            label: 'Achat EURUSD',
            timestampLabel: '1 août 2026, 10:00',
            severity: 'information',
          },
        ]}
      />,
    );
    expect(screen.getByText('Achat EURUSD')).toBeInTheDocument();
  });
});
