import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import _ from 'lodash';

import { config } from '../../../config.js';
import { RATE_LIMIT_STRICT } from '../../../constants.js';
import { fetchGoogleProfile } from '../../../lib/google-oauth.js';
import { fetchLinkedInProfile } from '../../../lib/linkedin-oauth.js';
import {
  adminLoginSchema,
  adminLogoutSchema,
  authCheckSchema,
  changePasswordSchema,
  confirmPasswordResetSchema,
  confirmPhoneLinkSchema,
  deleteAccountSchema,
  loginPhoneSchema,
  oauthExchangeSchema,
  refreshSchema,
  registerPhoneSchema,
  requestPasswordResetSchema,
  requestPhoneLinkSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../../../schemas/v1/index.js';
import { AuthenticationService } from '../../../services/authentication.js';
import { OAuthAuthenticationService } from '../../../services/oauth-authentication.js';
import { PhoneAuthenticationService } from '../../../services/phone-authentication.js';
import { TokenService } from '../../../services/token.js';
import {
  ChangePasswordPayload,
  ConfirmPasswordResetPayload,
  ConfirmPhoneLinkPayload,
  DeleteAccountPayload,
  LoginPayload,
  LoginPhonePayload,
  OAuthExchangePayload,
  RegisterPhonePayload,
  RequestPasswordResetPayload,
  RequestPhoneLinkPayload,
  SendOtpPayload,
  VerifyOtpPayload,
} from '../../../types/auth.js';
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  clearAdminSessionCookieOptions,
} from '../../../utils/admin-session.js';
import {
  MEMBER_ACCESS_COOKIE,
  MEMBER_REFRESH_COOKIE,
  clearMemberAccessCookieOptions,
  clearMemberRefreshCookieOptions,
  memberAccessCookieOptions,
  memberRefreshCookieOptions,
} from '../../../utils/member-session.js';
import { isAuthorizedMobileClient } from '../../../utils/mobile-client.js';

const ERROR_STATUS: Record<
  string,
  | 'badRequest'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'serviceUnavailable'
  | 'badGateway'
> = {
  invalid_phone: 'badRequest',
  invalid_otp: 'badRequest',
  otp_resend_too_soon: 'badRequest',
  invalid_signup_grant: 'badRequest',
  invalid_credentials: 'unauthorized',
  invalid_refresh_token: 'unauthorized',
  oauth_only_account: 'forbidden',
  phone_not_verified: 'forbidden',
  phone_already_registered: 'conflict',
  phone_not_found: 'notFound',
  user_not_found: 'notFound',
  password_not_set: 'badRequest',
  invalid_current_password: 'badRequest',
  phone_link_not_allowed: 'forbidden',
  phone_already_linked: 'badRequest',
  invalid_exchange_code: 'unauthorized',
  oauth_profile_fetch_failed: 'badGateway',
  oauth_provider_not_configured: 'serviceUnavailable',
  account_deletion_not_confirmed: 'badRequest',
  sms_service_not_configured: 'serviceUnavailable',
  sms_delivery_failed: 'badGateway',
};

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma, smsClient, httpErrors } = fastify;
  const authService = new AuthenticationService({ prisma });
  const phoneAuthService = new PhoneAuthenticationService({
    prisma,
    smsClient,
    logger: fastify.log,
  });
  const oauthAuthService = new OAuthAuthenticationService({ prisma });
  const tokenService = new TokenService({ prisma });

  function mapError(err: Error, request: FastifyRequest) {
    const kind = ERROR_STATUS[err.message];

    if (!kind) {
      // The client only ever gets the generic message below — without logging the
      // original error here first, an unmapped exception (e.g. a raw Twilio SDK error)
      // is otherwise discarded with no trace of what it actually was.
      request.log.error({ err }, 'unmapped auth error');

      const mapped = httpErrors.internalServerError(
        request.t('internal_error', {
          defaultValue: 'An unexpected error occurred',
        }),
      );

      mapped.code = 'internal_error';
      return mapped;
    }

    const mapped = httpErrors[kind](
      request.t(err.message, {
        defaultValue: err.message,
      }),
    );

    mapped.code = err.message;
    return mapped;
  }

  function translate(request: FastifyRequest, code: string) {
    return request.t(code, { defaultValue: code });
  }

  // Browser: tokens leave only as HttpOnly cookies.
  // Capacitor: authorized mobile clients (label + MOBILE_CLIENT_SECRET) also get
  // accessToken/refreshToken in the JSON body — see doc/features/authentication.md.
  function setMemberSessionCookies(
    reply: import('fastify').FastifyReply,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    reply.setCookie(MEMBER_ACCESS_COOKIE, tokens.accessToken, memberAccessCookieOptions());
    reply.setCookie(MEMBER_REFRESH_COOKIE, tokens.refreshToken, memberRefreshCookieOptions());
  }

  function clearMemberSessionCookies(reply: import('fastify').FastifyReply) {
    reply.clearCookie(MEMBER_ACCESS_COOKIE, clearMemberAccessCookieOptions());
    reply.clearCookie(MEMBER_REFRESH_COOKIE, clearMemberRefreshCookieOptions());
  }

  function memberSessionResponse(
    request: FastifyRequest,
    tokens: { accessToken: string; refreshToken: string },
    user: unknown,
  ) {
    if (!isAuthorizedMobileClient(request)) {
      return { user };
    }
    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Body JWTs on refresh only when the presented refresh token came from the body
   * (Cap without cookies). A credentialed browser that spoofs the mobile label but
   * still sends the HttpOnly refresh cookie must never receive JWTs in JSON.
   */
  function memberRefreshResponse(
    request: FastifyRequest,
    tokens: { accessToken: string; refreshToken: string },
    source: 'cookie' | 'body',
  ) {
    if (!isAuthorizedMobileClient(request) || source !== 'body') {
      return { ok: true as const };
    }
    return {
      ok: true as const,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  type RefreshTokenSource =
    | { token: string; source: 'cookie' | 'body' }
    | { token?: undefined; source: 'none' };

  function readRefreshToken(request: FastifyRequest): RefreshTokenSource {
    const body = request.body as { refreshToken?: string } | null;
    const fromBody = body?.refreshToken?.trim();

    // Authorized Cap may still receive Set-Cookie on login. Prefer an explicit body
    // refreshToken so memberRefreshResponse can return rotated JWTs for Bearer storage.
    // Cookie-only (no body) stays cookie-sourced and never emits body JWTs — browsers
    // that lack the mobile secret cannot take this path.
    if (isAuthorizedMobileClient(request) && fromBody) {
      return { token: fromBody, source: 'body' };
    }

    const fromCookie = request.cookies?.[MEMBER_REFRESH_COOKIE];
    if (fromCookie) {
      return { token: fromCookie, source: 'cookie' };
    }

    return { source: 'none' };
  }

  /**
   * The global limit (100/min) is far too generous for credential checking, so both login
   * routes get their own budget. @fastify/rate-limit evaluates at `onRequest`, before the body
   * is parsed, so this can only be keyed per IP (the plugin default) — a per-account key is not
   * reachable here. Successful logins count towards the budget too.
   */
  const loginRateLimit = {
    rateLimit: {
      max: 10,
      timeWindow: '15 minutes',
    },
  };

  fastify.post<{ Body: LoginPayload }>(
    '/admin/login',
    {
      schema: adminLoginSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await authService.adminLogin(request.body);

        // The panel never receives the token in the body: it goes out as an HttpOnly cookie
        // the browser replays on its own, so no script running in the panel can read it.
        reply.setCookie(ADMIN_SESSION_COOKIE, data.accessToken, adminSessionCookieOptions());

        return reply.code(200).send({
          user: _.omit(data.user, ['password']),
        });
      } catch (err) {
        throw err;
      }
    },
  );

  /**
   * An HttpOnly cookie cannot be cleared by the panel, so ending a session has to come back
   * here. Unauthenticated on purpose: it only clears a cookie, and a caller whose session
   * already expired must still be able to tidy up.
   */
  fastify.post('/admin/logout', { schema: adminLogoutSchema }, async (request, reply) => {
    reply.clearCookie(ADMIN_SESSION_COOKIE, clearAdminSessionCookieOptions());
    return reply.code(200).send({ ok: true });
  });
  fastify.get(
    '/authcheck',
    {
      schema: authCheckSchema,
      preHandler: [fastify.verifyToken],
    },
    async (request, reply) => {
      try {
        const data = await authService.authCheck({
          id: request.loggedUser.id,
        });
        return reply.code(200).send({ user: data });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: SendOtpPayload }>(
    '/otp/send',
    {
      schema: sendOtpSchema,
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.sendOtp(request.body);
        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: VerifyOtpPayload }>(
    '/otp/verify',
    {
      schema: verifyOtpSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.verifyOtp(request.body);
        return reply.code(200).send({
          verified: data.verified,
          phone: data.phone,
          signupToken: data.signupToken,
        });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: LoginPhonePayload }>(
    '/login-phone',
    {
      schema: loginPhoneSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.loginWithPhone(request.body);
        setMemberSessionCookies(reply, data);
        return reply.code(200).send(memberSessionResponse(request, data, data.user));
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: RegisterPhonePayload }>(
    '/register-phone',
    {
      schema: registerPhoneSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.registerWithPhone(request.body);
        setMemberSessionCookies(reply, data);
        return reply.code(201).send(memberSessionResponse(request, data, data.user));
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: { refreshToken?: string } }>(
    '/refresh',
    {
      schema: refreshSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const presented = readRefreshToken(request);
        if (!presented.token) {
          throw new Error('invalid_refresh_token');
        }

        const data = await tokenService.refreshAccessToken(presented.token);
        setMemberSessionCookies(reply, data);
        return reply.code(200).send(memberRefreshResponse(request, data, presented.source));
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: { refreshToken?: string } }>('/logout', {}, async (request, reply) => {
    try {
      const presented = readRefreshToken(request);
      if (presented.token) {
        // Best-effort: an already-expired or already-revoked token must not block the
        // client from clearing its own (now-stale) cookies / stored tokens.
        await tokenService.revokeRefreshToken(presented.token).catch(() => undefined);
      }

      clearMemberSessionCookies(reply);

      return reply.code(200).send({
        message: translate(request, 'logout_successful'),
        code: 'logout_successful',
      });
    } catch (err) {
      throw mapError(err as Error, request);
    }
  });

  fastify.post<{ Body: RequestPasswordResetPayload }>(
    '/password-reset/request',
    {
      schema: requestPasswordResetSchema,
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.requestPasswordReset(request.body);
        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: ConfirmPasswordResetPayload }>(
    '/password-reset/confirm',
    {
      schema: confirmPasswordResetSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.confirmPasswordReset(request.body);
        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: Omit<ChangePasswordPayload, 'userId'> }>(
    '/change-password',
    {
      schema: changePasswordSchema,
      preHandler: [fastify.verifyToken],
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await authService.changePassword({
          ...request.body,
          userId: request.loggedUser.id,
        });

        // changePassword revokes every refresh token, but the caller's own access
        // token is still a cryptographically valid, unexpired JWT — without clearing
        // its cookie too, this browser would keep looking authenticated (to
        // proxy.ts's middleware and to /authcheck) until that token's TTL runs out.
        clearMemberSessionCookies(reply);

        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: Omit<RequestPhoneLinkPayload, 'userId'> }>(
    '/phone-link/request',
    {
      schema: requestPhoneLinkSchema,
      preHandler: [fastify.verifyToken],
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.requestPhoneLink({
          ...request.body,
          userId: request.loggedUser.id,
        });
        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: Omit<ConfirmPhoneLinkPayload, 'userId'> }>(
    '/phone-link/confirm',
    {
      schema: confirmPhoneLinkSchema,
      preHandler: [fastify.verifyToken],
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.confirmPhoneLink({
          ...request.body,
          userId: request.loggedUser.id,
        });
        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.delete<{ Body: Omit<DeleteAccountPayload, 'userId'> }>(
    '/account',
    {
      schema: deleteAccountSchema,
      preHandler: [fastify.verifyToken],
      config: { rateLimit: RATE_LIMIT_STRICT },
    },
    async (request, reply) => {
      try {
        if (request.body?.reason) {
          request.log.info(
            { userId: request.loggedUser.id, reason: request.body.reason },
            'account_deletion_requested',
          );
        }

        const data = await authService.deleteAccount({
          ...request.body,
          userId: request.loggedUser.id,
        });

        // The user row is gone, so the next request would 401 anyway — but clearing
        // the cookies here avoids a stale "still logged in" flash before that happens.
        clearMemberSessionCookies(reply);

        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  // The redirect back from Google/LinkedIn is a top-level browser navigation, not an
  // XHR the SPA can read a JSON error from — so both outcomes redirect to the SPA's
  // own callback route (implemented separately from this API) with either `code` or
  // `error` in the query string, instead of returning an HTTP error response here.
  async function handleOAuthCallback(
    request: FastifyRequest,
    reply: import('fastify').FastifyReply,
    provider: 'google' | 'linkedin',
  ) {
    const oauth2 = provider === 'google' ? fastify.oauth2Google : fastify.oauth2LinkedIn;

    try {
      if (!oauth2) {
        throw new Error('oauth_provider_not_configured');
      }

      const { token } = await oauth2.getAccessTokenFromAuthorizationCodeFlow(request);
      const profile =
        provider === 'google'
          ? await fetchGoogleProfile(token.access_token)
          : await fetchLinkedInProfile(token.access_token);

      const user = await oauthAuthService.findOrCreateOAuthUser(provider, profile);
      const code = await oauthAuthService.createExchangeCode(user.id);

      return reply.redirect(`${config.frontendUrl}/oauth-callback?code=${code}`);
    } catch (err) {
      const message = (err as Error).message || 'oauth_profile_fetch_failed';
      return reply.redirect(
        `${config.frontendUrl}/oauth-callback?error=${encodeURIComponent(message)}`,
      );
    }
  }

  fastify.get('/oauth/google/callback', async (request, reply) => {
    return handleOAuthCallback(request, reply, 'google');
  });

  fastify.get('/oauth/linkedin/callback', async (request, reply) => {
    return handleOAuthCallback(request, reply, 'linkedin');
  });

  fastify.post<{ Body: OAuthExchangePayload }>(
    '/oauth/exchange',
    {
      schema: oauthExchangeSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await oauthAuthService.consumeExchangeCode(request.body);
        setMemberSessionCookies(reply, data);
        return reply.code(200).send(memberSessionResponse(request, data, data.user));
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );
};

export default routes;
