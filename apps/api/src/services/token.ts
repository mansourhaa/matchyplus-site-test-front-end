import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';

import { PrismaClient, User } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { AbstractServiceOptions } from '../types/services.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: 'refresh';
};

export class TokenService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  signAccessToken(user: Pick<User, 'id' | 'email' | 'phone'>): string {
    const { accessTokenSecret, accessTokenTtl } = config;
    const secret = accessTokenSecret as Secret;
    const signOptions: SignOptions = { expiresIn: Number(accessTokenTtl) };

    return jwt.sign({ id: user.id, email: user.email, phone: user.phone }, secret, signOptions);
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const { refreshTokenSecret, refreshTokenTtlDays } = config;
    const jti = nanoid();
    const expiresAt = new Date(Date.now() + refreshTokenTtlDays * DAY_IN_MS);

    const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };
    const token = jwt.sign(payload, refreshTokenSecret as Secret, {
      expiresIn: `${refreshTokenTtlDays}d`,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        user_id: userId,
        token_hash: sha256(token),
        expires_at: expiresAt,
      },
    });

    return token;
  }

  async issueTokenPair(user: Pick<User, 'id' | 'email' | 'phone'>) {
    const [accessToken, refreshToken] = [
      this.signAccessToken(user),
      await this.issueRefreshToken(user.id),
    ];
    return { accessToken, refreshToken };
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  async refreshAccessToken(rawToken: string): Promise<{ accessToken: string }> {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(rawToken, config.refreshTokenSecret as Secret) as RefreshTokenPayload;
    } catch {
      throw new Error('invalid_refresh_token');
    }
    if (payload.type !== 'refresh') {
      throw new Error('invalid_refresh_token');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (
      !stored ||
      stored.revoked_at !== null ||
      stored.expires_at < new Date() ||
      stored.token_hash !== sha256(rawToken)
    ) {
      throw new Error('invalid_refresh_token');
    }

    let user = null;
    try {
      user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    } catch {
      throw new Error('invalid_refresh_token');
    }

    return { accessToken: this.signAccessToken(user) };
  }
}
