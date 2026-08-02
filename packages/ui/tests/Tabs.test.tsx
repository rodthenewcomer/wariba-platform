import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Tab, TabList, TabPanel, Tabs } from '../src/components/Tabs.js';

function Example() {
  const [value, setValue] = useState('positions');
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabList aria-label="Compte">
        <Tab value="positions">Positions</Tab>
        <Tab value="orders">Ordres</Tab>
        <Tab value="history">Historique</Tab>
      </TabList>
      <TabPanel value="positions">Contenu positions</TabPanel>
      <TabPanel value="orders">Contenu ordres</TabPanel>
      <TabPanel value="history">Contenu historique</TabPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('shows only the active panel and marks the active tab selected', () => {
    render(<Example />);
    expect(screen.getByText('Contenu positions')).toBeInTheDocument();
    expect(screen.queryByText('Contenu ordres')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Positions' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves focus and selection with ArrowRight (WAI-ARIA APG tabs pattern)', async () => {
    render(<Example />);
    const positions = screen.getByRole('tab', { name: 'Positions' });
    positions.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Ordres' })).toHaveFocus();
    expect(screen.getByText('Contenu ordres')).toBeInTheDocument();
  });
});
