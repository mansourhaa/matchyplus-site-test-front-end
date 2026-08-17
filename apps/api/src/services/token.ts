import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';

import { PrismaClient, User, UserStatus } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { AbstractServiceOptions } from '../types/services.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type AccessTokenAudience = 'member' | 'admin';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: 'refresh';
};

export type AccessTokenUser = Pick<User, 'id' | 'email' | 'phone' | 'token_version'>;

export class TokenService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  signAccessToken(
    user: AccessTokenUser,
    options: { audience: AccessTokenAudience } = { audience: 'member' },
  ): string {
    const { accessTokenSecret, accessTokenTtl } = config;
    const secret = accessTokenSecret as Secret;
    const signOptions: SignOptions = {
      expiresIn: accessTokenTtl as SignOptions['expiresIn'],
      audience: options.audience,
    };

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        tv: user.token_version ?? 0,
      },
      secret,
      signOptions,
    );
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

  /**
   * Centralized ACTIVE-status gate — every path that mints tokens (login, phone login,
   * register, OAuth exchange, refresh) goes through here, so a banned/inactive account
   * loses access uniformly instead of relying on each caller to remember its own check.
   * Same generic error as bad credentials, to avoid revealing account status.
   */
  async issueTokenPair(
    user: Pick<User, 'id' | 'email' | 'phone' | 'status' | 'token_version'>,
    options: { audience: AccessTokenAudience } = { audience: 'member' },
  ) {
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('invalid_credentials');
    }

    const [accessToken, refreshToken] = [
      this.signAccessToken(user, options),
      await this.issueRefreshToken(user.id),
    ];
    return { accessToken, refreshToken };
  }

  /** Bump token_version and revoke all refresh rows — invalidates outstanding access JWTs. */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { token_version: { increment: 1 } },
    });
    await this.revokeAllRefreshTokens(userId);
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    let payload: RefreshTokenPayload;

    try {
      payload = jwt.verify(rawToken, config.refreshTokenSecret as Secret) as RefreshTokenPayload;
    } catch {
      throw new Error('invalid_refresh_token');
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new Error('invalid_refresh_token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (
      !stored ||
      stored.revoked_at !== null ||
      stored.expires_at < new Date() ||
      stored.token_hash !== sha256(rawToken)
    ) {
      throw new Error('invalid_refresh_token');
    }

    await this.prisma.refreshToken.update({
      where: { id: payload.jti },
      data: { revoked_at: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  async refreshAccessToken(
    rawToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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
    if (!stored || stored.expires_at < new Date() || stored.token_hash !== sha256(rawToken)) {
      throw new Error('invalid_refresh_token');
    }

    if (stored.revoked_at !== null) {
      // If token was revoked more than 30s ago, treat as token theft / replay attack and revoke all sessions
      const gracePeriodMs = 30 * 1000;
      const isOutsideGracePeriod = Date.now() - stored.revoked_at.getTime() > gracePeriodMs;
      if (isOutsideGracePeriod) {
        await this.revokeAllRefreshTokens(stored.user_id);
      }
      throw new Error('invalid_refresh_token');
    }

    let user = null;
    try {
      user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    } catch {
      throw new Error('invalid_refresh_token');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('invalid_refresh_token');
    }

    // Atomic consume — a second presentation of the same refresh (reuse) sees count 0.
    const consumed = await this.prisma.refreshToken.updateMany({
      where: {
        id: payload.jti,
        revoked_at: null,
        token_hash: sha256(rawToken),
        expires_at: { gt: new Date() },
      },
      data: { revoked_at: new Date() },
    });

    if (consumed.count === 0) {
      throw new Error('invalid_refresh_token');
    }

    const refreshToken = await this.issueRefreshToken(user.id);
    return {
      accessToken: this.signAccessToken(user, { audience: 'member' }),
      refreshToken,
    };
  }
}
