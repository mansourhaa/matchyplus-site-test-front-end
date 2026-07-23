'use client';

import { PHONE_COUNTRIES, getPhoneCountry, sanitizeNationalPhone } from '@/lib/phone-countries';

type PhoneInputProps = {
  id?: string;
  countryIso: string;
  nationalNumber: string;
  onCountryChange: (iso: string) => void;
  onNationalNumberChange: (value: string) => void;
  disabled?: boolean;
};

export function PhoneInput({
  id,
  countryIso,
  nationalNumber,
  onCountryChange,
  onNationalNumberChange,
  disabled,
}: PhoneInputProps) {
  const country = getPhoneCountry(countryIso);

  return (
    <div
      dir="ltr"
      className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-3.5"
      style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
    >
      <span aria-hidden>{country.flag}</span>
      <select
        aria-label="Country code"
        value={country.iso}
        disabled={disabled}
        onChange={(event) => onCountryChange(event.target.value)}
        className="bg-transparent text-[#353535] outline-none"
        style={{ fontSize: 13, fontWeight: 600, minWidth: 74 }}
      >
        {PHONE_COUNTRIES.map((option) => (
          <option key={option.iso} value={option.iso}>
            {option.dialCode}
          </option>
        ))}
      </select>
      <span className="h-5 w-px bg-[#E0E0E0]" />
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder="Phone number"
        value={nationalNumber}
        disabled={disabled}
        onChange={(event) =>
          onNationalNumberChange(sanitizeNationalPhone(event.target.value, country.iso))
        }
        className="flex-1 bg-transparent outline-none"
        style={{ fontSize: 15, direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}
        required
      />
    </div>
  );
}
