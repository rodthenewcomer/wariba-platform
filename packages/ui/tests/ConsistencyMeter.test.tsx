import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConsistencyMeter } from '../src/wariba/ConsistencyMeter.js';

describe('ConsistencyMeter', () => {
  it('never labels a non-compliant ratio as a violation (Rulebook §15.4)', () => {
    render(
      <ConsistencyMeter
        ratioPercent={50}
        limitPercent={40}
        bestDayFormatted="400 USD"
        totalProfitFormatted="800 USD"
        requiredProfitFormatted="1 000 USD"
      />,
    );
    expect(screen.queryByText(/violation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/breach/i)).not.toBeInTheDocument();
    // « Compte non conforme » disait la même chose qu'un dépassement à qui
    // lit vite. Le message dit maintenant ce qui est vrai — la journée pèse
    // trop lourd — et le test tient sur cette phrase.
    expect(screen.getByText(/pèse encore trop lourd/)).toBeInTheDocument();
  });

  it('shows no compliance disclaimer once the ratio is within the limit', () => {
    render(
      <ConsistencyMeter
        ratioPercent={35}
        limitPercent={40}
        bestDayFormatted="280 USD"
        totalProfitFormatted="800 USD"
      />,
    );
    expect(screen.queryByText(/pèse encore trop lourd/)).not.toBeInTheDocument();
  });
});
