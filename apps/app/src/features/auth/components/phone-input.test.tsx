import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PhoneInput } from './phone-input';

describe('PhoneInput', () => {
  it('renders visible typed text (explicit text color, not just inherited from theme)', () => {
    render(
      <PhoneInput
        countryIso="TN"
        nationalNumber="12345678"
        onCountryChange={vi.fn()}
        onNationalNumberChange={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('XX XXX XXX');
    expect(input).toHaveClass('text-[#353535]');
    expect(input).toHaveValue('12345678');
  });

  it('shows a country-specific example placeholder, matching the legacy phone screen', () => {
    const { rerender } = render(
      <PhoneInput
        countryIso="TN"
        nationalNumber=""
        onCountryChange={vi.fn()}
        onNationalNumberChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('XX XXX XXX')).toBeInTheDocument();

    rerender(
      <PhoneInput
        countryIso="CA"
        nationalNumber=""
        onCountryChange={vi.fn()}
        onNationalNumberChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('(XXX) XXX-XXXX')).toBeInTheDocument();
  });

  it('sanitizes and forwards typed digits for the selected country', () => {
    const onNationalNumberChange = vi.fn();
    render(
      <PhoneInput
        countryIso="TN"
        nationalNumber=""
        onCountryChange={vi.fn()}
        onNationalNumberChange={onNationalNumberChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('XX XXX XXX'), {
      target: { value: '12 345 678 999' },
    });

    // Tunisia's nationalLength is 8 — extra digits are truncated.
    expect(onNationalNumberChange).toHaveBeenCalledWith('12345678');
  });
});
