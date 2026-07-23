export type PhoneCountry = {
  iso: string;
  dialCode: string;
  flag: string;
  nationalLength: number;
  label: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'TN', dialCode: '+216', flag: '🇹🇳', nationalLength: 8, label: 'Tunisia' },
  { iso: 'DZ', dialCode: '+213', flag: '🇩🇿', nationalLength: 9, label: 'Algeria' },
  { iso: 'MA', dialCode: '+212', flag: '🇲🇦', nationalLength: 9, label: 'Morocco' },
  { iso: 'FR', dialCode: '+33', flag: '🇫🇷', nationalLength: 9, label: 'France' },
  { iso: 'BE', dialCode: '+32', flag: '🇧🇪', nationalLength: 9, label: 'Belgium' },
  { iso: 'CH', dialCode: '+41', flag: '🇨🇭', nationalLength: 9, label: 'Switzerland' },
  { iso: 'CA', dialCode: '+1', flag: '🇨🇦', nationalLength: 10, label: 'Canada' },
  { iso: 'US', dialCode: '+1', flag: '🇺🇸', nationalLength: 10, label: 'United States' },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

export function getPhoneCountry(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.iso === iso) ?? DEFAULT_PHONE_COUNTRY;
}

export function composeE164Phone(countryIso: string, nationalNumber: string): string {
  return `${getPhoneCountry(countryIso).dialCode}${nationalNumber}`;
}

export function sanitizeNationalPhone(value: string, countryIso: string): string {
  return value.replace(/\D/g, '').slice(0, getPhoneCountry(countryIso).nationalLength);
}
