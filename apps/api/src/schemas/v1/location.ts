const errorResponses = {
  '4xx': {
    type: 'object',
    properties: {
      status: { type: 'number' },
      code: { type: 'string' },
      message: { type: 'string' },
    },
  },
  500: {
    description: 'Error response',
    type: 'object',
    properties: {
      status: { type: 'number', default: 500 },
      code: { type: 'string' },
      message: { type: 'string' },
    },
  },
};

const ipGeolocationResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    provider: { type: 'string', nullable: true },
    latitude: { type: 'number', nullable: true },
    longitude: { type: 'number', nullable: true },
    city: { type: 'string', nullable: true },
    region: { type: 'string', nullable: true },
    country: { type: 'string', nullable: true },
    formattedAddress: { type: 'string', nullable: true },
    error: { type: 'string' },
    isDefault: { type: 'boolean' },
  },
};

const reverseGeocodeResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    provider: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    region: { type: 'string', nullable: true },
    country: { type: 'string', nullable: true },
    formattedAddress: { type: 'string', nullable: true },
    error: { type: 'string' },
  },
};

/** GET /location/ip-geolocation */
export const ipGeolocationSchema = {
  tags: ['location'],
  summary: 'IP geolocation proxy',
  description:
    'Returns approximate location for the authenticated requester IP only. ' +
    'Tries multiple HTTPS upstream providers with failover. Requires JWT. ' +
    'Used as a GPS fallback for discovery matching when browser geolocation is unavailable.',
  security: [{ http: [] }],
  querystring: {
    type: 'object',
    additionalProperties: false,
    maxProperties: 0,
    properties: {},
  },
  response: {
    200: {
      description: 'Successful response (success may still be false when all providers fail)',
      ...ipGeolocationResponse,
    },
    ...errorResponses,
  },
};

/** GET /location/reverse-geocode */
export const reverseGeocodeSchema = {
  tags: ['location'],
  summary: 'Reverse geocode proxy',
  description:
    'Converts latitude/longitude to a human-readable address via Nominatim and HTTPS fallbacks. Requires JWT.',
  security: [{ http: [] }],
  querystring: {
    type: 'object',
    additionalProperties: false,
    required: ['lat', 'lon'],
    properties: {
      lat: { type: 'string', description: 'Latitude as a decimal string' },
      lon: { type: 'string', description: 'Longitude as a decimal string' },
    },
  },
  response: {
    200: {
      description: 'Successful response (success may still be false when all providers fail)',
      ...reverseGeocodeResponse,
    },
    ...errorResponses,
  },
};
