import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  CompactEmptyState,
  MetricReadout,
  MobileStructuredRow,
  SegmentedControl,
  ToolbarButton,
  ToolRailButton,
  WariXFitIcon,
  WariXSelectToolIcon,
} from '../src';

describe('workstation primitives', () => {
  it('keeps cockpit metrics explicitly labelled', () => {
    render(
      <dl>
        <MetricReadout label="Equity" value="10 120,00 USD" tone="positive" />
      </dl>,
    );
    expect(screen.getByRole('term')).toHaveTextContent('Equity');
    expect(screen.getByRole('definition')).toHaveTextContent('10 120,00 USD');
  });

  it('exposes icon toolbar actions by name and pressed state', () => {
    render(<ToolbarButton label="Ajuster le graphique" icon={<WariXFitIcon />} active />);
    expect(screen.getByRole('button', { name: 'Ajuster le graphique' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps a screen-reader name when its responsive visual label is hidden', () => {
    render(
      <ToolbarButton
        label="Outils"
        showLabel
        labelClassName="hidden"
        icon={<span aria-hidden />}
      />,
    );

    expect(screen.getByRole('button', { name: 'Outils' })).toBeInTheDocument();
  });

  it('keeps drawing rail tools keyboard-readable', () => {
    render(<ToolRailButton label="Sélection" icon={<WariXSelectToolIcon />} active={false} />);
    expect(screen.getByRole('button', { name: 'Sélection' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('uses the radio arrow-key model for segmented controls', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Type d’ordre"
        value="market"
        options={[
          { value: 'market', label: 'Market' },
          { value: 'limit', label: 'Limit' },
          { value: 'stop', label: 'Stop' },
        ]}
        onValueChange={onChange}
      />,
    );
    const market = screen.getByRole('radio', { name: 'Market' });
    await user.click(market);
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('limit');
  });

  it('renders compact empty and mobile structured states without fabricated values', () => {
    render(
      <>
        <CompactEmptyState
          title="Aucune position"
          description="Les positions ouvertes apparaîtront ici."
        />
        <MobileStructuredRow primary="EURUSD · Achat" secondary="0,10 lot" trailing="+12,40 USD" />
      </>,
    );
    expect(screen.getByText('Aucune position')).toBeVisible();
    expect(screen.getByText('EURUSD · Achat')).toBeVisible();
    expect(screen.getByText('+12,40 USD')).toBeVisible();
  });
});
