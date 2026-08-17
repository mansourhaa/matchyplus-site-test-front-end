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
  tokenHost: 'https://oauth2.googleapis.com',
  tokenPath: '/token',
};

const LINKEDIN_CONFIGURATION = {
  authorizeHost: 'https://www.linkedin.com',
  authorizePath: '/oauth/v2/authorization',
  tokenHost: 'https://www.linkedin.com',
  tokenPath: '/oauth/v2/accessToken',
  revokePath: '/oauth/v2/revoke',
};

/**
 * Shared cookie options for the OAuth state (and PKCE verifier) cookies.
 *
 * Without an explicit `path: '/'`, @fastify/cookie derives the path from
 * `startRedirectPath` (e.g. `/api/v1/auth/oauth/`). That usually still matches
 * `/…/callback`, but browsers and cookie jars disagree in edge cases and the
 * callback then fails closed with `Invalid state`. Path=/ is the fix recommended
 * by @fastify/oauth2 (see fastify/fastify-oauth2#218 / #255).
 *
 * Each provider also gets its own cookie name so Google and LinkedIn cannot
 * clobber each other's in-flight state.
 */
const OAUTH_STATE_COOKIE = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
};

// Each provider is registered independently and only when both its client id and
// secret are set — a missing pair disables just that provider (its /start route
// simply won't exist) instead of the API refusing to boot.
//
// callbackUri must match the provider console Authorized redirect URI and the
// v1 handler in routes/v1/auth (`/api/v1/auth/oauth/<provider>/callback`).
async function oauthPlugin(fastify: FastifyInstance) {
  if (config.googleClientId && config.googleClientSecret && config.apiBaseUrl) {
    console.log(`[oauth] Google callback url → ${config.googleRedirectUri}`);
    await fastify.register(fastifyOauth2, {
      name: 'oauth2Google',
      scope: OAUTH_SCOPE,
      credentials: {
        client: { id: config.googleClientId, secret: config.googleClientSecret },
        auth: GOOGLE_CONFIGURATION,
        options: {
          bodyFormat: 'form',
          authorizationMethod: 'body',
        },
      },
      startRedirectPath: '/api/v1/auth/oauth/google',
      callbackUri: config.googleRedirectUri,
      cookie: OAUTH_STATE_COOKIE,
      redirectStateCookieName: 'oauth2-google-state',
      verifierCookieName: 'oauth2-google-verifier',
    });
  } else {
    fastify.log.warn('Google OAuth disabled — credentials or API_BASE_URL not configured');
  }

  if (config.linkedinClientId && config.linkedinClientSecret && config.apiBaseUrl) {
    console.log(`[oauth] LinkedIn callback url → ${config.linkedinRedirectUri}`);
    await fastify.register(fastifyOauth2, {
      name: 'oauth2LinkedIn',
      scope: OAUTH_SCOPE,
      credentials: {
        client: { id: config.linkedinClientId, secret: config.linkedinClientSecret },
        auth: LINKEDIN_CONFIGURATION,
        options: {
          bodyFormat: 'form',
          authorizationMethod: 'body',
        },
      },
      startRedirectPath: '/api/v1/auth/oauth/linkedin',
      callbackUri: config.linkedinRedirectUri,
      cookie: OAUTH_STATE_COOKIE,
      redirectStateCookieName: 'oauth2-linkedin-state',
      verifierCookieName: 'oauth2-linkedin-verifier',
    });
  } else {
    fastify.log.warn('LinkedIn OAuth disabled — credentials or API_BASE_URL not configured');
  }
}

export default fp(oauthPlugin, {
  name: 'oauth',
});
