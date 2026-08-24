import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RiskRibbon } from '../src/wariba/RiskRibbon.js';

describe('RiskRibbon', () => {
  it('renders a text label alongside color for every status (never color alone)', () => {
    render(
      <RiskRibbon
        status="soft-lock"
        dailyLossRemaining="0 USD"
        maximumLossRemaining="400 USD"
        nextResetLabel="00:00 UTC"
        connectionOk
      />,
    );
    expect(screen.getByText('Blocage temporaire')).toBeInTheDocument();
    // « DLL » était l'acronyme interne de la perte quotidienne. Le ruban
    // portait un nom que le centre d'aide n'emploie nulle part.
    expect(screen.getByText(/Perte quotidienne restante/)).toBeInTheDocument();
    expect(screen.getByText('0 USD')).toBeInTheDocument();
  });

  it('shows the restriction label only when provided', () => {
    const { rerender } = render(
      <RiskRibbon
        status="normal"
        dailyLossRemaining="400 USD"
        maximumLossRemaining="800 USD"
        nextResetLabel="00:00 UTC"
        connectionOk
      />,
    );
    expect(screen.queryByText(/Weekend/)).not.toBeInTheDocument();

    rerender(
      <RiskRibbon
        status="normal"
        dailyLossRemaining="400 USD"
        maximumLossRemaining="800 USD"
        nextResetLabel="00:00 UTC"
        restrictionLabel="Weekend dans 2h"
        connectionOk
      />,
    );
    expect(screen.getByText('Weekend dans 2h')).toBeInTheDocument();
  });
});
