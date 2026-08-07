import jwt from 'jsonwebtoken';

import { PrismaClient, UserStatus } from '@saas-boilerplate/types';

import { AbstractServiceOptions } from '../types/services.js';

export type AccessTokenAudience = 'member' | 'admin';

type AccessTokenPayload = {
  id: string;
  email: string | null;
  phone?: string | null;
  tv?: number;
  aud?: string | string[];
};

export class AuthorizationService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  async verifyAccessToken(
    token: string,
    options: { audience: AccessTokenAudience } = { audience: 'member' },
  ) {
    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, process.env['ACCESS_TOKEN_SECRET'] as string, {
        audience: options.audience,
      }) as AccessTokenPayload;
    } catch (err) {
      throw err;
    }

    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: payload.id },
      });

      // The row is reloaded on every request, so a token stays usable only while the account
      // is still ACTIVE — banning or deactivating an account cuts its live sessions too.
      if (user.status !== UserStatus.ACTIVE) {
        throw new Error('account is not active');
      }

      const tokenVersion = typeof payload.tv === 'number' ? payload.tv : 0;
      const userVersion = user.token_version ?? 0;
      if (tokenVersion !== userVersion) {
        throw new Error('token_version_mismatch');
      }

      return user;
    } catch (err: any) {
      throw err;
    }
  }
}
