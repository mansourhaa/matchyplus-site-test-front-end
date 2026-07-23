import jwt, { Secret, SignOptions } from 'jsonwebtoken';

import { PrismaClient } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { EmailClient } from '../lib/email.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateNumericCode, hashVerificationCode } from '../lib/verification-code.js';
import {
  AuthCheckPayload,
  ChangePasswordPayload,
  ConfirmEmailVerificationPayload,
  LoginPayload,
  RegisterPayload,
  RequestEmailVerificationPayload,
} from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';
import { TokenService } from './token.js';

const EMAIL_VERIFICATION_TTL_MINUTES = 30;

export type AuthenticationServiceOptions = AbstractServiceOptions & { emailClient: EmailClient };

export class AuthenticationService {
  prisma: PrismaClient;
  tokenService: TokenService;
  emailClient: EmailClient;
  constructor(options: AuthenticationServiceOptions) {
    this.prisma = options.prisma;
    this.tokenService = new TokenService({ prisma: options.prisma });
    this.emailClient = options.emailClient;
  }

  async login(payload: LoginPayload) {
    const { accessTokenSecret, accessTokenTtl } = config;

    const secret = accessTokenSecret as Secret;
    const signOptions: SignOptions = { expiresIn: accessTokenTtl as SignOptions['expiresIn'] };

    let user = null;
    try {
      user = await this.prisma.user.findUniqueOrThrow({
        where: { email: payload.email.toLowerCase() },
        select: {
          email: true,
          name: true,
          id: true,
          password: true,
        },
      });
    } catch {
      throw new Error('invalid_credentials');
    }
    const isPasswordValid = await verifyPassword(payload.password, user.password as string);

    if (!isPasswordValid) {
      throw new Error('invalid_credentials');
    }
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.email,
    };
    const accessToken = jwt.sign(tokenPayload, secret, signOptions);
    return {
      accessToken,
      user,
    };
  }

  async register(payload: RegisterPayload) {
    let user = null;
    user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: {
        email: true,
        id: true,
        password: true,
      },
    });
    if (user) {
      throw new Error('user_already_exists');
    }

    const hashedPassword = await hashPassword(payload.password);
    user = await this.prisma.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
        name: payload.email,
      },
    });
    return user;
  }

  async authCheck(payload: AuthCheckPayload) {
    let user = null;

    try {
      user = await this.prisma.user.findUniqueOrThrow({
        where: { id: payload.id },
        select: {
          email: true,
          id: true,
        },
      });
    } catch {
      throw new Error('user_not_found');
    }
    return user;
  }

  async changePassword(payload: ChangePasswordPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.password) {
      throw new Error('password_not_set');
    }

    const isValid = await verifyPassword(payload.currentPassword, user.password);
    if (!isValid) {
      throw new Error('invalid_current_password');
    }

    const hashedPassword = await hashPassword(payload.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.tokenService.revokeAllRefreshTokens(user.id);

    return { message: 'password_changed', forceLogout: true };
  }

  async requestEmailVerification(payload: RequestEmailVerificationPayload) {
    const email = payload.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== payload.userId) {
      throw new Error('email_already_used');
    }

    if (!this.emailClient.isConfigured()) {
      throw new Error('smtp_not_configured');
    }

    const code = generateNumericCode(6);
    await this.prisma.user.update({
      where: { id: payload.userId },
      data: {
        pending_email: email,
        email_verification_code: hashVerificationCode(code),
        email_verification_expires_at: new Date(
          Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000,
        ),
      },
    });

    await this.emailClient.sendVerificationCode({
      to: email,
      code,
      expiresMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
    });

    return { message: 'verification_code_sent', email };
  }

  async confirmEmailVerification(payload: ConfirmEmailVerificationPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.userId,
        email_verification_code: hashVerificationCode(payload.code),
        pending_email: { not: null },
        email_verification_expires_at: { gt: new Date() },
      },
    });
    if (!user) {
      throw new Error('invalid_verification_code');
    }

    const nextEmail = user.pending_email as string;
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: nextEmail,
        email_verified: true,
        pending_email: null,
        email_verification_code: null,
        email_verification_expires_at: null,
      },
    });

    return { message: 'email_verified', email: updated.email as string, emailVerified: true };
  }
}
