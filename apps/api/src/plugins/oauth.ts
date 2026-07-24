import fastifyOauth2 from '@fastify/oauth2';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

const OAUTH_SCOPE = ['openid', 'email', 'profile'];

// @fastify/oauth2 exports GOOGLE_CONFIGURATION/LINKEDIN_CONFIGURATION as static
// properties on its default export, but its `export =` type declaration doesn't
// surface them through the default-import binding — declared directly instead.
const GOOGLE_CONFIGURATION = {
  authorizeHost: 'https://accounts.google.com',
  authorizePath: '/o/oauth2/v2/auth',
  tokenHost: 'https://www.googleapis.com',
  tokenPath: '/oauth2/v4/token',
};

const LINKEDIN_CONFIGURATION = {
  authorizeHost: 'https://www.linkedin.com',
  authorizePath: '/oauth/v2/authorization',
  tokenHost: 'https://www.linkedin.com',
  tokenPath: '/oauth/v2/accessToken',
  revokePath: '/oauth/v2/revoke',
};

// Each provider is registered independently and only when both its client id and
// secret are set — a missing pair disables just that provider (its /start route
// simply won't exist) instead of the API refusing to boot.
async function oauthPlugin(fastify: FastifyInstance) {
  if (config.googleClientId && config.googleClientSecret && config.apiBaseUrl) {
    await fastify.register(fastifyOauth2, {
      name: 'oauth2Google',
      scope: OAUTH_SCOPE,
      credentials: {
        client: { id: config.googleClientId, secret: config.googleClientSecret },
        auth: GOOGLE_CONFIGURATION,
      },
      startRedirectPath: '/api/v1/auth/oauth/google',
      callbackUri: `${config.apiBaseUrl}/api/v1/auth/oauth/google/callback`,
    });
  } else {
    fastify.log.warn('Google OAuth disabled — credentials or API_BASE_URL not configured');
  }

  if (config.linkedinClientId && config.linkedinClientSecret && config.apiBaseUrl) {
    await fastify.register(fastifyOauth2, {
      name: 'oauth2LinkedIn',
      scope: OAUTH_SCOPE,
      credentials: {
        client: { id: config.linkedinClientId, secret: config.linkedinClientSecret },
        auth: LINKEDIN_CONFIGURATION,
      },
      startRedirectPath: '/api/v1/auth/oauth/linkedin',
      callbackUri: `${config.apiBaseUrl}/api/v1/auth/oauth/linkedin/callback`,
    });
  } else {
    fastify.log.warn('LinkedIn OAuth disabled — credentials or API_BASE_URL not configured');
  }
}

export default fp(oauthPlugin, {
  name: 'oauth',
});
