import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';

import { PrismaClient, User, UserStatus } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { AbstractServiceOptions } from '../types/services.js';
import { isAdminRole } from '../utils/roles.js';

const DAY_IN_SECONDS = 24 * 60 * 60;

export type AccessTokenAudience = 'member' | 'admin';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Admin sessions get a much shorter refresh window than members — a stolen admin cookie
 * silently renewable for the member's full 30 days is a far bigger blast radius than a
 * regular account, so an idle admin is forced back through a real login sooner.
 */
function refreshTokenTtlSeconds(audience: AccessTokenAudience): number {
  return audience === 'admin'
    ? config.adminRefreshTokenTtlSeconds
    : config.refreshTokenTtlDays * DAY_IN_SECONDS;
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

  async issueRefreshToken(
    userId: string,
    ttlSeconds: number = config.refreshTokenTtlDays * DAY_IN_SECONDS,
  ): Promise<string> {
    const { refreshTokenSecret } = config;
    const jti = nanoid();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };
    const token = jwt.sign(payload, refreshTokenSecret as Secret, {
      expiresIn: ttlSeconds,
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
      await this.issueRefreshToken(user.id, refreshTokenTtlSeconds(options.audience)),
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
    options: { audience: AccessTokenAudience } = { audience: 'member' },
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
      // A token that was already revoked could be a replay attack — but it could also be
      // a second tab or mobile process presenting the same token slightly after the first
      // one consumed it during a concurrent proactive refresh. Both tabs call refresh on
      // the same 5-minute timer, so the window between "first wins" and "second arrives"
      // can be anywhere from milliseconds to several minutes depending on browser timer
      // throttling. The grace period must be at least as long as the proactive refresh
      // interval (5 min = 300 s) to avoid false-positive replay detection; genuine theft
      // replays an already-spent token well outside that window.
      const gracePeriodMs = 5 * 60 * 1000; // 300 s — matches REFRESH_INTERVAL_MS in useProactiveRefresh
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

    // Same role gate adminLogin applies at issuance — a demotion between login and refresh
    // (or a member's refresh token presented at the admin route) must not mint a fresh
    // admin-audience token just because the underlying refresh token itself is still valid.
    if (options.audience === 'admin' && !isAdminRole(user.role)) {
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

    const refreshToken = await this.issueRefreshToken(
      user.id,
      refreshTokenTtlSeconds(options.audience),
    );
    return {
      accessToken: this.signAccessToken(user, options),
      refreshToken,
    };
  }
}
