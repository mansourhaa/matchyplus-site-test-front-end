import { FastifyPluginAsync } from 'fastify';
import _ from 'lodash';

import {
  authCheckSchema,
  changePasswordSchema,
  confirmPasswordResetSchema,
  loginPhoneSchema,
  loginSchema,
  refreshSchema,
  registerPhoneSchema,
  registerSchema,
  requestPasswordResetSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../../../schemas/v1/index.js';
import { AuthenticationService } from '../../../services/authentication.js';
import { PhoneAuthenticationService } from '../../../services/phone-authentication.js';
import { TokenService } from '../../../services/token.js';
import {
  ChangePasswordPayload,
  ConfirmPasswordResetPayload,
  LoginPayload,
  LoginPhonePayload,
  RefreshPayload,
  RegisterPayload,
  RegisterPhonePayload,
  RequestPasswordResetPayload,
  ResetPayload,
  SendOtpPayload,
  VerifyOtpPayload,
} from '../../../types/auth.js';

const ERROR_STATUS: Record<string, 'badRequest' | 'unauthorized' | 'notFound' | 'conflict'> = {
  invalid_phone: 'badRequest',
  invalid_otp: 'badRequest',
  invalid_credentials: 'unauthorized',
  invalid_refresh_token: 'unauthorized',
  phone_already_registered: 'conflict',
  phone_not_found: 'notFound',
  password_not_set: 'badRequest',
  invalid_current_password: 'badRequest',
};

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma, otpClient, httpErrors } = fastify;
  const authService = new AuthenticationService({ prisma });
  const phoneAuthService = new PhoneAuthenticationService({ prisma, otpClient });
  const tokenService = new TokenService({ prisma });

  function mapError(err: Error) {
    const kind = ERROR_STATUS[err.message];
    return kind ? httpErrors[kind](err.message) : err;
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
        throw err;
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
        throw err;
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
        throw err;
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
        return reply.code(200).send(data);
      } catch (err) {
        throw mapError(err as Error);
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
        throw mapError(err as Error);
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
        throw mapError(err as Error);
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
        throw mapError(err as Error);
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
        return reply.code(200).send({ access_token: data.accessToken });
      } catch (err) {
        throw mapError(err as Error);
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
        return reply.code(200).send(data);
      } catch (err) {
        throw mapError(err as Error);
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
        return reply.code(200).send(data);
      } catch (err) {
        throw mapError(err as Error);
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
        return reply.code(200).send(data);
      } catch (err) {
        throw mapError(err as Error);
      }
    },
  );
};

export default routes;
