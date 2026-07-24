export type PhoneCountry = {
  iso: string;
  dialCode: string;
  flag: string;
  nationalLength: number;
  label: string;
  placeholder: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    iso: 'TN',
    dialCode: '+216',
    flag: '🇹🇳',
    nationalLength: 8,
    label: 'Tunisia',
    placeholder: 'XX XXX XXX',
  },
  {
    iso: 'DZ',
    dialCode: '+213',
    flag: '🇩🇿',
    nationalLength: 9,
    label: 'Algeria',
    placeholder: 'XXX XX XX XX',
  },
  {
    iso: 'MA',
    dialCode: '+212',
    flag: '🇲🇦',
    nationalLength: 9,
    label: 'Morocco',
    placeholder: 'XXX XX XX XX',
  },
  {
    iso: 'FR',
    dialCode: '+33',
    flag: '🇫🇷',
    nationalLength: 9,
    label: 'France',
    placeholder: 'X XX XX XX XX',
  },
  {
    iso: 'BE',
    dialCode: '+32',
    flag: '🇧🇪',
    nationalLength: 9,
    label: 'Belgium',
    placeholder: 'XXX XX XX XX',
  },
  {
    iso: 'CH',
    dialCode: '+41',
    flag: '🇨🇭',
    nationalLength: 9,
    label: 'Switzerland',
    placeholder: 'XX XXX XX XX',
  },
  {
    iso: 'CA',
    dialCode: '+1',
    flag: '🇨🇦',
    nationalLength: 10,
    label: 'Canada',
    placeholder: '(XXX) XXX-XXXX',
  },
  {
    iso: 'US',
    dialCode: '+1',
    flag: '🇺🇸',
    nationalLength: 10,
    label: 'United States',
    placeholder: '(XXX) XXX-XXXX',
  },
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
