import { PrismaClient } from '@saas-boilerplate/types';

import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  AuthCheckPayload,
  ChangePasswordPayload,
  DeleteAccountPayload,
  LoginPayload,
} from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';
import { isAdminRole } from '../utils/roles.js';
import { TokenService } from './token.js';

export class AuthenticationService {
  prisma: PrismaClient;
  tokenService: TokenService;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
    this.tokenService = new TokenService({ prisma: options.prisma });
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

    // Do not reveal whether the account is banned, inactive, or nonexistent — issueTokenPair's
    // ACTIVE-status gate throws the same invalid_credentials error as a bad password.
    const tokens = await this.tokenService.issueTokenPair(user);

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

  async authCheck(payload: AuthCheckPayload) {
    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: {
          id: payload.id,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          auth_provider: true,
          email_verified: true,
          role: true,
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
