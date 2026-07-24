import { PrismaClient, UserStatus } from '@saas-boilerplate/types';

import { isAdminRole } from '../constants.js';
import { EmailClient } from '../lib/email.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateNumericCode, hashVerificationCode } from '../lib/verification-code.js';
import {
  AuthCheckPayload,
  ChangePasswordPayload,
  ConfirmEmailVerificationPayload,
  DeleteAccountPayload,
  LoginPayload,
  RegisterPayload,
  RequestEmailVerificationPayload,
} from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';
import { TokenService } from './token.js';

const EMAIL_VERIFICATION_TTL_MINUTES = 30;

export type AuthenticationServiceOptions = AbstractServiceOptions & {
  emailClient: EmailClient;
};

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
    let user;

    try {
      user = await this.prisma.user.findUniqueOrThrow({
        where: {
          email: payload.email.toLowerCase(),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          password: true,
          role: true,
          status: true,
        },
      });
    } catch {
      throw new Error('invalid_credentials');
    }

    if (!user.password) {
      throw new Error('invalid_credentials');
    }

    const isPasswordValid = await verifyPassword(payload.password, user.password);

    if (!isPasswordValid) {
      throw new Error('invalid_credentials');
    }

    // Do not reveal whether the account is banned, inactive, or nonexistent.
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('invalid_credentials');
    }

    const tokens = await this.tokenService.issueTokenPair({
      id: user.id,
      email: user.email,
      phone: user.phone,
    });

    const { password: _password, ...safeUser } = user;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: safeUser,
    };
  }

  /**
   * Authenticates against the admin panel. Non-admin accounts are rejected with
   * the same error as invalid credentials so roles cannot be enumerated.
   */
  async adminLogin(payload: LoginPayload) {
    const data = await this.login(payload);

    if (!isAdminRole(data.user.role)) {
      throw new Error('invalid_credentials');
    }

    return data;
  }

  async register(payload: RegisterPayload) {
    let user = await this.prisma.user.findUnique({
      where: {
        email: payload.email.toLowerCase(),
      },
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
        email: payload.email.toLowerCase(),
        password: hashedPassword,
        name: payload.email,
      },
    });

    return user;
  }

  async authCheck(payload: AuthCheckPayload) {
    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: {
          id: payload.id,
        },
        select: {
          email: true,
          id: true,
        },
      });
    } catch {
      throw new Error('user_not_found');
    }
  }

  async changePassword(payload: ChangePasswordPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user || !user.password) {
      throw new Error('password_not_set');
    }

    const isValid = await verifyPassword(payload.currentPassword, user.password);

    if (!isValid) {
      throw new Error('invalid_current_password');
    }

    const hashedPassword = await hashPassword(payload.newPassword);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    await this.tokenService.revokeAllRefreshTokens(user.id);

    return {
      message: 'password_changed',
      forceLogout: true,
    };
  }

  async requestEmailVerification(payload: RequestEmailVerificationPayload) {
    const email = payload.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existing && existing.id !== payload.userId) {
      throw new Error('email_already_used');
    }

    if (!this.emailClient.isConfigured()) {
      throw new Error('smtp_not_configured');
    }

    const code = generateNumericCode(6);

    await this.prisma.user.update({
      where: {
        id: payload.userId,
      },
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

    return {
      message: 'verification_code_sent',
      email,
    };
  }

  async confirmEmailVerification(payload: ConfirmEmailVerificationPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.userId,
        email_verification_code: hashVerificationCode(payload.code),
        pending_email: {
          not: null,
        },
        email_verification_expires_at: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('invalid_verification_code');
    }

    const nextEmail = user.pending_email as string;

    const updated = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        email: nextEmail,
        email_verified: true,
        pending_email: null,
        email_verification_code: null,
        email_verification_expires_at: null,
      },
    });

    return {
      message: 'email_verified',
      email: updated.email as string,
      emailVerified: true,
    };
  }

  async deleteAccount(payload: DeleteAccountPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      throw new Error('user_not_found');
    }

    if (!payload.confirm) {
      throw new Error('account_deletion_not_confirmed');
    }

    if (user.password) {
      if (!payload.currentPassword) {
        throw new Error('invalid_current_password');
      }

      const isValid = await verifyPassword(payload.currentPassword, user.password);

      if (!isValid) {
        throw new Error('invalid_current_password');
      }
    }

    await this.prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    return {
      message: 'account_deleted',
    };
  }
}
