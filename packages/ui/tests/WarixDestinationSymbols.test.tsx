import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WARIX_DESTINATION_IDS, WarixSymbolSpecimen, WariXDestinationIcon } from '../src';

describe('WariX destination symbols', () => {
  it('exposes exactly seven unique destination identities', () => {
    const { container } = render(
      <>
        {WARIX_DESTINATION_IDS.map((destination) => (
          <WariXDestinationIcon destination={destination} key={destination} />
        ))}
      </>,
    );

    const symbols = Array.from(container.querySelectorAll('[data-warix-symbol]'));
    expect(symbols).toHaveLength(7);
    expect(new Set(symbols.map((symbol) => symbol.getAttribute('data-warix-symbol')))).toEqual(
      new Set(WARIX_DESTINATION_IDS),
    );
  });

  it('keeps the rail optical size and SVGs decorative by default', () => {
    const { container } = render(<WariXDestinationIcon destination="trade" />);
    const symbol = container.querySelector('svg');

    expect(symbol).toHaveAttribute('width', '24');
    expect(symbol).toHaveAttribute('height', '24');
    expect(symbol).toHaveAttribute('aria-hidden', 'true');
    expect(symbol).toHaveAttribute('focusable', 'false');
  });

  it('renders the internal native, state, rail, and 4x audit surfaces', () => {
    render(<WarixSymbolSpecimen />);

    expect(screen.getByTestId('warix-symbol-family-native')).toBeInTheDocument();
    expect(screen.getByTestId('warix-symbol-family-4x')).toBeInTheDocument();
    expect(screen.getByText('États fonctionnels')).toBeInTheDocument();
    expect(screen.getByText('Rail 48 px')).toBeInTheDocument();
  });
});
