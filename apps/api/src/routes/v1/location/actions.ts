import { FastifyPluginAsync } from 'fastify';

import { GEOLOCATION_RATE_LIMIT } from '../../../constants.js';
import { ipGeolocationSchema, reverseGeocodeSchema } from '../../../schemas/v1/location.js';
import { GeolocationService } from '../../../services/geolocation.js';
import {
  IpGeolocationQuery,
  IpGeolocationResult,
  ReverseGeocodeQuery,
  ReverseGeocodeResult,
} from '../../../types/geolocation.js';
import { badRequest } from '../../../utils/http-errors.js';
import { parseLatLon } from '../../../utils/geo-coords.js';
import { parseIpAddress } from '../../../utils/ip.js';

const CACHE_CONTROL_NO_STORE = 'private, no-store';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const geolocation = new GeolocationService();

  fastify.get<{ Querystring: IpGeolocationQuery; Reply: IpGeolocationResult }>(
    '/ip-geolocation',
    {
      schema: ipGeolocationSchema,
      config: { rateLimit: GEOLOCATION_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const queryIp = request.query.ip?.trim() || undefined;
        let ip: string | undefined;

        if (queryIp) {
          const parsed = parseIpAddress(queryIp);
          if (!parsed) {
            throw badRequest('Invalid IP address', 'invalid_ip');
          }
          ip = parsed;
        } else {
          // Prefer Fastify's resolved client IP (trustProxy enabled in createServerApp).
          ip = parseIpAddress(request.ip) ?? undefined;
        }

        const result = await geolocation.getIpGeolocation(ip);
        reply.header('Cache-Control', CACHE_CONTROL_NO_STORE);
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get<{ Querystring: ReverseGeocodeQuery; Reply: ReverseGeocodeResult }>(
    '/reverse-geocode',
    {
      schema: reverseGeocodeSchema,
      config: { rateLimit: GEOLOCATION_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const coords = parseLatLon(request.query.lat, request.query.lon);
        if (!coords) {
          throw badRequest('Invalid lat or lon values', 'invalid_params');
        }

        const result = await geolocation.reverseGeocode(coords.lat, coords.lon);
        reply.header('Cache-Control', CACHE_CONTROL_NO_STORE);
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
