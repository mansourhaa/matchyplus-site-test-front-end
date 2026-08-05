export type IpGeolocationQuery = {
  /** Optional IP to look up; defaults to the authenticated requester's client IP. */
  ip?: string;
};

export type IpGeolocationResult = {
  success: boolean;
  provider: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  formattedAddress: string | null;
  error?: string;
  isDefault?: boolean;
};

export type ReverseGeocodeQuery = {
  lat: string;
  lon: string;
};

export type ReverseGeocodeResult = {
  success: boolean;
  provider: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  formattedAddress: string | null;
  error?: string;
};
