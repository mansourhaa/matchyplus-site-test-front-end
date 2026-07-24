import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import _ from 'lodash';

import {
  authCheckSchema,
  changePasswordSchema,
  confirmEmailVerificationSchema,
  confirmPasswordResetSchema,
  confirmPhoneLinkSchema,
  loginPhoneSchema,
  loginSchema,
  refreshSchema,
  registerPhoneSchema,
  registerSchema,
  requestEmailVerificationSchema,
  requestPasswordResetSchema,
  requestPhoneLinkSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../../../schemas/v1/index.js';
import { AuthenticationService } from '../../../services/authentication.js';
import { PhoneAuthenticationService } from '../../../services/phone-authentication.js';
import { TokenService } from '../../../services/token.js';
import {
  ChangePasswordPayload,
  ConfirmEmailVerificationPayload,
  ConfirmPasswordResetPayload,
  ConfirmPhoneLinkPayload,
  LoginPayload,
  LoginPhonePayload,
  RefreshPayload,
  RegisterPayload,
  RegisterPhonePayload,
  RequestEmailVerificationPayload,
  RequestPasswordResetPayload,
  RequestPhoneLinkPayload,
  SendOtpPayload,
  VerifyOtpPayload,
} from '../../../types/auth.js';

const ERROR_STATUS: Record<
  string,
  'badRequest' | 'unauthorized' | 'forbidden' | 'notFound' | 'conflict' | 'serviceUnavailable'
> = {
  invalid_phone: 'badRequest',
  invalid_otp: 'badRequest',
  invalid_credentials: 'unauthorized',
  invalid_refresh_token: 'unauthorized',
  phone_already_registered: 'conflict',
  user_already_exists: 'conflict',
  phone_not_found: 'notFound',
  user_not_found: 'notFound',
  password_not_set: 'badRequest',
  invalid_current_password: 'badRequest',
  phone_link_not_allowed: 'forbidden',
  phone_already_linked: 'badRequest',
  email_already_used: 'conflict',
  invalid_verification_code: 'badRequest',
  smtp_not_configured: 'serviceUnavailable',
};

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma, otpClient, emailClient, httpErrors } = fastify;
  const authService = new AuthenticationService({ prisma, emailClient });
  const phoneAuthService = new PhoneAuthenticationService({ prisma, otpClient });
  const tokenService = new TokenService({ prisma });

  function mapError(err: Error, request: FastifyRequest) {
    const kind = ERROR_STATUS[err.message];

    if (!kind) {
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

  fastify.post<{ Body: LoginPayload }>(
    '/login',
    {
      schema: loginSchema,
    },
    async (request, reply) => {
      try {
        const data = await authService.login(request.body);

        // Generating Token
        return reply.code(200).send({
          access_token: data.accessToken,
          user: _.omit(data.user, ['password']),
        });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );
  fastify.post<{ Body: RegisterPayload }>(
    '/register',
    {
      schema: registerSchema,
    },
    async (request, reply) => {
      try {
        const data = await authService.register(request.body);
        return reply.code(200).send({
          message: request.t('account_created_successfully'),
          code: 'account_created_successfully',
        });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );
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
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.verifyOtp(request.body);
        return reply.code(200).send({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
          user: _.omit(data.user, ['password']),
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
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.loginWithPhone(request.body);
        return reply.code(200).send({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
          user: _.omit(data.user, ['password']),
        });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: RegisterPhonePayload }>(
    '/register-phone',
    {
      schema: registerPhoneSchema,
    },
    async (request, reply) => {
      try {
        const data = await phoneAuthService.registerWithPhone(request.body);
        return reply.code(201).send({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
          user: _.omit(data.user, ['password']),
        });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: RefreshPayload }>(
    '/refresh',
    {
      schema: refreshSchema,
    },
    async (request, reply) => {
      try {
        const data = await tokenService.refreshAccessToken(request.body.refresh_token);
        return reply.code(200).send({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: RefreshPayload }>(
    '/logout',
    {
      schema: refreshSchema,
    },
    async (request, reply) => {
      try {
        await tokenService.revokeRefreshToken(request.body.refresh_token);

        return reply.code(200).send({
          message: translate(request, 'logout_successful'),
          code: 'logout_successful',
        });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: RequestPasswordResetPayload }>(
    '/password-reset/request',
    {
      schema: requestPasswordResetSchema,
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
    },
    async (request, reply) => {
      try {
        const data = await authService.changePassword({
          ...request.body,
          userId: request.loggedUser.id,
        });
        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: Omit<RequestEmailVerificationPayload, 'userId'> }>(
    '/email-verification/request',
    {
      schema: requestEmailVerificationSchema,
      preHandler: [fastify.verifyToken],
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      try {
        const data = await authService.requestEmailVerification({
          ...request.body,
          userId: request.loggedUser.id,
        });
        return reply.code(200).send({ ...data, message: translate(request, data.message) });
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: Omit<ConfirmEmailVerificationPayload, 'userId'> }>(
    '/email-verification/confirm',
    {
      schema: confirmEmailVerificationSchema,
      preHandler: [fastify.verifyToken],
    },
    async (request, reply) => {
      try {
        const data = await authService.confirmEmailVerification({
          ...request.body,
          userId: request.loggedUser.id,
        });
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
};

export default routes;
