import { OtpPurpose, PrismaClient } from '@saas-boilerplate/types';

import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  AuthCheckPayload,
  ChangePasswordPayload,
  DeleteAccountPayload,
  LoginPayload,
} from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';
import { assertPasswordPolicy } from '../utils/password-policy.js';
import { isAdminRole } from '../utils/roles.js';
import { OtpChallengeService } from './otp-challenge.js';
import { TokenService } from './token.js';

export class AuthenticationService {
  prisma: PrismaClient;
  tokenService: TokenService;
  otpChallengeService: OtpChallengeService;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
    this.tokenService = new TokenService({ prisma: options.prisma });
    this.otpChallengeService = new OtpChallengeService({ prisma: options.prisma });
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
          token_version: true,
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

    // Do not reveal whether the account is banned, inactive, or nonexistent — issueTokenPair's
    // ACTIVE-status gate throws the same invalid_credentials error as a bad password.
    const tokens = await this.tokenService.issueTokenPair(user, { audience: 'member' });

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
          token_version: true,
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

    if (!isAdminRole(user.role)) {
      throw new Error('invalid_credentials');
    }

    // Do not reveal whether the account is banned/inactive — issueTokenPair's ACTIVE-status
    // gate throws the same invalid_credentials error as a bad password.
    const tokens = await this.tokenService.issueTokenPair(user, { audience: 'admin' });
    const { password: _password, ...safeUser } = user;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: safeUser,
    };
  }

  async authCheck(payload: AuthCheckPayload) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id: payload.id,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          image: true,
          auth_provider: true,
          email_verified: true,
          phone_verified: true,
          google_id: true,
          linkedin_id: true,
          verified: true,
          role: true,
          onboarding_completed_at: true,
          password: true,
        },
      });

      const { onboarding_completed_at, google_id, linkedin_id, password, ...rest } = user;
      return {
        ...rest,
        has_password: Boolean(password),
        google_linked: Boolean(google_id),
        linkedin_linked: Boolean(linkedin_id),
        onboarding_completed: Boolean(onboarding_completed_at),
      };
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

    assertPasswordPolicy(payload.newPassword);

    const hashedPassword = await hashPassword(payload.newPassword);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    await this.tokenService.revokeAllSessions(user.id);

    return {
      message: 'password_changed',
      forceLogout: true,
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
