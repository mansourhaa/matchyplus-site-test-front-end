import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import _ from 'lodash';

import { config } from '../../../config.js';
import { RATE_LIMIT_STRICT } from '../../../constants.js';
import { handleProviderOAuthCallback } from '../../../lib/oauth-callback-handler.js';
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
  requestAccountDeleteOtpSchema,
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
import {
  OAUTH_LINK_COOKIE,
  createOAuthLinkIntentValue,
  oauthLinkCookieOptions,
} from '../../../utils/oauth-link-intent.js';

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
  oauth_email_unverified: 'forbidden',
  oauth_link_conflict: 'conflict',
  oauth_link_email_mismatch: 'badRequest',
  account_deletion_not_confirmed: 'badRequest',
  account_deletion_otp_required: 'badRequest',
  account_deletion_use_password: 'badRequest',
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
    // Never leave an admin JWT sticky when a member session is established (AUTH-01).
    reply.clearCookie(ADMIN_SESSION_COOKIE, clearAdminSessionCookieOptions());
  }

  function clearMemberSessionCookies(reply: import('fastify').FastifyReply) {
    reply.clearCookie(MEMBER_ACCESS_COOKIE, clearMemberAccessCookieOptions());
    reply.clearCookie(MEMBER_REFRESH_COOKIE, clearMemberRefreshCookieOptions());
  }

  function setAdminSessionCookie(reply: import('fastify').FastifyReply, accessToken: string) {
    reply.setCookie(ADMIN_SESSION_COOKIE, accessToken, adminSessionCookieOptions());
    // Admin login must not leave a member session usable on shared cookie domain.
    clearMemberSessionCookies(reply);
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
   * Authorized Cap (label + MOBILE_CLIENT_SECRET) gets rotated JWTs in the body so
   * Bearer storage can update. Browsers lack the secret, so spoofing X-Matchy-Client
   * alone never yields body JWTs.
   */
  function memberRefreshResponse(
    request: FastifyRequest,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    if (!isAuthorizedMobileClient(request)) {
      return { ok: true as const };
    }
    return {
      ok: true as const,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  type RefreshTokenSource =
    { token: string; source: 'cookie' | 'body' } | { token?: undefined; source: 'none' };

  function readRefreshToken(request: FastifyRequest): RefreshTokenSource {
    const body = request.body as { refreshToken?: string } | null;
    const fromBody = body?.refreshToken?.trim();

    // Prefer body for authorized Cap so Bearer storage stays the primary Cap path.
    // Stale body + valid cookie is handled by falling back in the refresh route.
    if (isAuthorizedMobileClient(request) && fromBody) {
      return { token: fromBody, source: 'body' };
    }

    const fromCookie = request.cookies?.[MEMBER_REFRESH_COOKIE];
    if (fromCookie) {
      return { token: fromCookie, source: 'cookie' };
    }

    return { source: 'none' };
  }

  function cookieRefreshToken(request: FastifyRequest): string | undefined {
    return request.cookies?.[MEMBER_REFRESH_COOKIE] || undefined;
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
        setAdminSessionCookie(reply, data.accessToken);

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
          // Logged-out browsers hit this after authcheck 401 — return 401 without
          // throwing so the global error handler does not log a full stack as ERROR.
          return reply.code(401).send({
            status: 401,
            code: 'invalid_refresh_token',
            message: translate(request, 'invalid_refresh_token'),
          });
        }

        let data: { accessToken: string; refreshToken: string };
        try {
          data = await tokenService.refreshAccessToken(presented.token);
        } catch (err) {
          // Cap may send a stale localStorage refresh alongside a still-valid cookie.
          const cookieToken = cookieRefreshToken(request);
          if (
            presented.source === 'body' &&
            cookieToken &&
            cookieToken !== presented.token &&
            (err as Error).message === 'invalid_refresh_token'
          ) {
            data = await tokenService.refreshAccessToken(cookieToken);
          } else {
            throw err;
          }
        }

        setMemberSessionCookies(reply, data);
        return reply.code(200).send(memberRefreshResponse(request, data));
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: { refreshToken?: string } }>('/logout', {}, async (request, reply) => {
    try {
      // Cap may present a stale body refreshToken while the rotated cookie is still
      // active — revoke every distinct candidate (body + cookie) best-effort.
      const candidates = new Set<string>();
      const cookieToken = cookieRefreshToken(request);
      if (cookieToken) candidates.add(cookieToken);
      const bodyToken = (request.body as { refreshToken?: string } | null)?.refreshToken?.trim();
      if (bodyToken) candidates.add(bodyToken);

      await Promise.all(
        [...candidates].map((token) =>
          tokenService.revokeRefreshToken(token).catch(() => undefined),
        ),
      );

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

  fastify.post(
    '/account/delete-otp',
    {
      schema: requestAccountDeleteOtpSchema,
      preHandler: [fastify.verifyToken],
      config: { rateLimit: RATE_LIMIT_STRICT },
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.requestAccountDeleteOtp(request.loggedUser.id);
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
  // Provider redirect_uri is GOOGLE_REDIRECT_URI / LINKEDIN_REDIRECT_URI (plugins/oauth.ts).
  async function startOAuthLink(
    request: FastifyRequest,
    reply: import('fastify').FastifyReply,
    provider: 'google' | 'linkedin',
  ) {
    const oauth2 = provider === 'google' ? fastify.oauth2Google : fastify.oauth2LinkedIn;
    if (!oauth2) {
      throw mapError(new Error('oauth_provider_not_configured'), request);
    }

    reply.setCookie(
      OAUTH_LINK_COOKIE,
      createOAuthLinkIntentValue({ userId: request.loggedUser.id, provider }),
      oauthLinkCookieOptions(),
    );

    const uri = await oauth2.generateAuthorizationUri(request, reply);
    return reply.redirect(uri);
  }

  fastify.get(
    '/oauth/google/link',
    { preHandler: [fastify.verifyToken], config: { rateLimit: RATE_LIMIT_STRICT } },
    async (request, reply) => startOAuthLink(request, reply, 'google'),
  );

  fastify.get(
    '/oauth/linkedin/link',
    { preHandler: [fastify.verifyToken], config: { rateLimit: RATE_LIMIT_STRICT } },
    async (request, reply) => startOAuthLink(request, reply, 'linkedin'),
  );

  fastify.get('/oauth/google/callback', async (request, reply) => {
    return handleProviderOAuthCallback(fastify, request, reply, 'google', oauthAuthService);
  });

  fastify.get('/oauth/linkedin/callback', async (request, reply) => {
    return handleProviderOAuthCallback(fastify, request, reply, 'linkedin', oauthAuthService);
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
