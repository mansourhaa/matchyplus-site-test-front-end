import jwt from 'jsonwebtoken';

import { Prisma, PrismaClient, UserStatus } from '@saas-boilerplate/types';

import { AbstractServiceOptions } from '../types/services.js';

export class AuthorizationService {
  prisma: PrismaClient;
  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  async verifyAccessToken(token: string) {
    let payload = null;
    try {
      payload = jwt.verify(token, process.env['ACCESS_TOKEN_SECRET'] as string) as {
        id: string;
        email: string;
      };
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

      return user;
    } catch (err: any) {
      throw err;
    }
  }
}
