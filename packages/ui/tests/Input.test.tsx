import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../src/components/Input.js';

describe('Input', () => {
  it('links its suffix (unit) to the field via aria-describedby, so it is announced', () => {
    render(<Input label="Quantité" suffix="lots" />);
    const input = screen.getByLabelText('Quantité');
    const suffix = screen.getByText('lots');

    expect(suffix.id).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toContain(suffix.id);
  });

  it('includes suffix, helper text, and error text together in aria-describedby', () => {
    render(<Input label="Quantité" suffix="lots" helperText="Pas 0.01" errorText="Invalide" />);
    const input = screen.getByLabelText('Quantité');
    const describedBy = input.getAttribute('aria-describedby') ?? '';

    expect(describedBy.split(' ')).toHaveLength(3);
  });

  it('has no aria-describedby when there is no suffix, helper, or error', () => {
    render(<Input label="Quantité" />);
    expect(screen.getByLabelText('Quantité').hasAttribute('aria-describedby')).toBe(false);
  });
});
