import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { config } from '../config.js';
import { OAuthAuthenticationService } from '../services/oauth-authentication.js';
import {
  OAUTH_LINK_COOKIE,
  clearOAuthLinkCookieOptions,
  parseOAuthLinkIntentValue,
} from '../utils/oauth-link-intent.js';
import { fetchGoogleProfile } from './google-oauth.js';
import { fetchLinkedInProfile } from './linkedin-oauth.js';
import { normalizeOAuthCallbackError } from './oauth-callback-error.js';

/**
 * Shared Google/LinkedIn OAuth callback for
 * `/api/v1/auth/oauth/<provider>/callback` (see routes/v1/auth/actions.ts).
 */
export async function handleProviderOAuthCallback(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  provider: 'google' | 'linkedin',
  oauthAuthService: OAuthAuthenticationService,
) {
  const oauth2 = provider === 'google' ? fastify.oauth2Google : fastify.oauth2LinkedIn;
  const linkRaw = request.cookies?.[OAUTH_LINK_COOKIE];
  const linkIntent = parseOAuthLinkIntentValue(linkRaw);
  reply.clearCookie(OAUTH_LINK_COOKIE, clearOAuthLinkCookieOptions());

  const isMobile =
    request.cookies?.['oauth-platform'] === 'mobile' ||
    (request.query as { platform?: string } | undefined)?.platform === 'mobile';
  reply.clearCookie('oauth-platform', { path: '/' });

  const appScheme = config.mobileAppScheme || 'matchy';

  const redirectOAuthError = (raw: string | undefined | null) => {
    const code = normalizeOAuthCallbackError(raw);
    request.log.warn({ provider, oauthError: code, raw }, 'oauth callback failed');
    if (isMobile) {
      if (linkIntent) {
        return reply.redirect(`${appScheme}://account-profile?error=${encodeURIComponent(code)}`);
      }
      return reply.redirect(`${appScheme}://oauth-callback?error=${encodeURIComponent(code)}`);
    }
    if (linkIntent) {
      const finalCallbackUrl = `${config.frontendUrl}/account-profile?error=${encodeURIComponent(code)}`;
      return reply.redirect(finalCallbackUrl);
    }
    const finalCallbackUrl = `${config.frontendUrl}/oauth-callback?error=${encodeURIComponent(code)}`;
    return reply.redirect(finalCallbackUrl);
  };

  try {
    if (!oauth2) {
      throw new Error('oauth_provider_not_configured');
    }

    // Google/LinkedIn may bounce here with ?error=access_denied (user cancelled) —
    // do not call the token endpoint with an empty code (that yields a noisy 400).
    const providerError = (request.query as { error?: string }).error;
    if (providerError) {
      return redirectOAuthError(providerError);
    }

    const { token } = await oauth2.getAccessTokenFromAuthorizationCodeFlow(request, reply);
    const profile =
      provider === 'google'
        ? await fetchGoogleProfile(token.access_token)
        : await fetchLinkedInProfile(token.access_token);

    if (linkIntent) {
      if (linkIntent.provider !== provider) {
        throw new Error('oauth_link_conflict');
      }
      await fastify.verifyToken(request);
      if (!request.loggedUser || request.loggedUser.id !== linkIntent.userId) {
        throw new Error('oauth_link_conflict');
      }
      await oauthAuthService.linkOAuthProvider(linkIntent.userId, provider, profile);
      if (isMobile) {
        return reply.redirect(
          `${appScheme}://account-profile?linked=${encodeURIComponent(provider)}`,
        );
      }
      return reply.redirect(
        `${config.frontendUrl}/account-profile?linked=${encodeURIComponent(provider)}`,
      );
    }

    const user = await oauthAuthService.findOrCreateOAuthUser(provider, profile);
    const code = await oauthAuthService.createExchangeCode(user.id);

    if (isMobile) {
      const finalCallbackUrl = `${appScheme}://oauth-callback?code=${code}`;
      request.log.info({ provider, finalCallbackUrl }, 'oauth callback success → Mobile App');
      return reply.redirect(finalCallbackUrl);
    }

    const finalCallbackUrl = `${config.frontendUrl}/oauth-callback?code=${code}`;
    request.log.info({ provider, finalCallbackUrl }, 'oauth callback success → SPA');
    return reply.redirect(finalCallbackUrl);
  } catch (err) {
    request.log.error({ err, provider }, 'OAuth callback exception');
    return redirectOAuthError((err as Error).message || 'oauth_profile_fetch_failed');
  }
}
