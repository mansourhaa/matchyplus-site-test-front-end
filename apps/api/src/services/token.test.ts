import jwt, { JwtPayload } from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import { config } from '../config.js';
import { TokenService } from './token.js';

function createMockPrisma() {
  return {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

const activeUser = {
  id: 'user-1',
  email: 'user@example.com',
  phone: '+21612345678',
  status: 'ACTIVE' as const,
  token_version: 0,
};

describe('TokenService', () => {
  it('signs an access token with the user claims', () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const token = service.signAccessToken({
      id: 'user-1',
      email: 'user@example.com',
      phone: '+21612345678',
      token_version: 0,
    });

    const payload = jwt.decode(token) as JwtPayload;

    expect(payload.id).toBe('user-1');
    expect(payload.email).toBe('user@example.com');
    expect(payload.phone).toBe('+21612345678');
    expect(payload.tv).toBe(0);
    expect(payload.aud).toBe('member');
  });

  it('issues and refreshes a valid refresh token', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const refreshToken = await service.issueRefreshToken('user-1');

    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);

    const createCall = prisma.refreshToken.create.mock.calls[0];
    expect(createCall).toBeDefined();

    const createArgs = createCall?.[0];
    expect(createArgs).toBeDefined();
    expect(createArgs.data.user_id).toBe('user-1');
    expect(createArgs.data.token_hash).toBeTypeOf('string');
    expect(createArgs.data.token_hash).not.toBe(refreshToken);
    expect(createArgs.data.expires_at).toBeInstanceOf(Date);

    const decoded = jwt.decode(refreshToken) as JwtPayload & {
      jti: string;
    };

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: decoded.jti,
      user_id: 'user-1',
      token_hash: createArgs.data.token_hash,
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    });

    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: '+21612345678',
      status: 'ACTIVE',
      token_version: 0,
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.refreshAccessToken(refreshToken);

    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: {
        id: decoded.jti,
      },
    });

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');

    const refreshedPayload = jwt.decode(result.accessToken) as JwtPayload;

    expect(refreshedPayload.id).toBe('user-1');
    expect(refreshedPayload.email).toBe('user@example.com');
    expect(refreshedPayload.phone).toBe('+21612345678');
    expect(refreshedPayload.aud).toBe('member');
  });

  it('rejects an invalid JWT during refresh', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    await expect(service.refreshAccessToken('not-a-valid-jwt')).rejects.toThrow(
      'invalid_refresh_token',
    );

    expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a JWT that is not a refresh token', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const token = jwt.sign(
      {
        sub: 'user-1',
        jti: 'access-like-token',
        type: 'access',
      },
      config.refreshTokenSecret as string,
      {
        expiresIn: '30d',
      },
    );

    await expect(service.refreshAccessToken(token)).rejects.toThrow('invalid_refresh_token');

    expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a revoked refresh token', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const token = jwt.sign(
      {
        sub: 'user-1',
        jti: 'revoked-token',
        type: 'refresh',
      },
      config.refreshTokenSecret as string,
      {
        expiresIn: '30d',
      },
    );

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'revoked-token',
      user_id: 'user-1',
      token_hash: 'hash',
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: new Date(),
    });

    await expect(service.refreshAccessToken(token)).rejects.toThrow('invalid_refresh_token');

    expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('rejects an expired stored refresh token', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const token = jwt.sign(
      {
        sub: 'user-1',
        jti: 'expired-stored-token',
        type: 'refresh',
      },
      config.refreshTokenSecret as string,
      {
        expiresIn: '30d',
      },
    );

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'expired-stored-token',
      user_id: 'user-1',
      token_hash: 'hash',
      expires_at: new Date(Date.now() - 60_000),
      revoked_at: null,
    });

    await expect(service.refreshAccessToken(token)).rejects.toThrow('invalid_refresh_token');

    expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('rejects a refresh token with a hash mismatch', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const token = jwt.sign(
      {
        sub: 'user-1',
        jti: 'hash-mismatch',
        type: 'refresh',
      },
      config.refreshTokenSecret as string,
      {
        expiresIn: '30d',
      },
    );

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'hash-mismatch',
      user_id: 'user-1',
      token_hash: 'not-the-real-hash',
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    });

    await expect(service.refreshAccessToken(token)).rejects.toThrow('invalid_refresh_token');

    expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('rejects a refresh token when the user no longer exists', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const refreshToken = await service.issueRefreshToken('user-1');

    const createArgs = prisma.refreshToken.create.mock.calls[0]?.[0];
    const decoded = jwt.decode(refreshToken) as JwtPayload & {
      jti: string;
    };

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: decoded.jti,
      user_id: 'user-1',
      token_hash: createArgs.data.token_hash,
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    });

    prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('user_not_found'));

    await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow('invalid_refresh_token');
  });

  it('revokes all active refresh tokens for a user', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    await service.revokeAllRefreshTokens('user-1');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        user_id: 'user-1',
        revoked_at: null,
      },
      data: {
        revoked_at: expect.any(Date),
      },
    });
  });

  it('revokes one refresh token', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const refreshToken = await service.issueRefreshToken('user-1');

    const decoded = jwt.decode(refreshToken) as JwtPayload & {
      jti: string;
    };

    const createArgs = prisma.refreshToken.create.mock.calls[0]?.[0];

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: decoded.jti,
      user_id: 'user-1',
      token_hash: createArgs.data.token_hash,
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    });

    await service.revokeRefreshToken(refreshToken);

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: decoded.jti },
      data: { revoked_at: expect.any(Date) },
    });

    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('issues a token pair for an active user', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const result = await service.issueTokenPair(activeUser);

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
  });

  it.each(['INACTIVE', 'BANNED'] as const)(
    'refuses to issue a token pair for a %s user',
    async (status) => {
      const prisma = createMockPrisma();
      const service = new TokenService({ prisma: prisma as never });

      await expect(service.issueTokenPair({ ...activeUser, status })).rejects.toThrow(
        'invalid_credentials',
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    },
  );

  it.each(['INACTIVE', 'BANNED'] as const)(
    'refuses to refresh a token for a %s user',
    async (status) => {
      const prisma = createMockPrisma();
      const service = new TokenService({ prisma: prisma as never });

      const refreshToken = await service.issueRefreshToken('user-1');
      const createArgs = prisma.refreshToken.create.mock.calls[0]?.[0];
      const decoded = jwt.decode(refreshToken) as JwtPayload & { jti: string };

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: decoded.jti,
        user_id: 'user-1',
        token_hash: createArgs.data.token_hash,
        expires_at: new Date(Date.now() + 60_000),
        revoked_at: null,
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...activeUser, status });

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        'invalid_refresh_token',
      );
      // Only ever revoke the stored token once its owner is confirmed still active.
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    },
  );

  it('revokes the used refresh token and issues a replacement on refresh', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const refreshToken = await service.issueRefreshToken('user-1');
    const decoded = jwt.decode(refreshToken) as JwtPayload & {
      jti: string;
    };

    const storedTokenHash = await import('node:crypto').then((crypto) =>
      crypto.createHash('sha256').update(refreshToken).digest('hex'),
    );

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: decoded.jti,
      user_id: 'user-1',
      token_hash: storedTokenHash,
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: '+21612345678',
      status: 'ACTIVE',
      token_version: 0,
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.refreshAccessToken(refreshToken);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: decoded.jti,
        revoked_at: null,
        token_hash: storedTokenHash,
        expires_at: { gt: expect.any(Date) },
      },
      data: { revoked_at: expect.any(Date) },
    });
    expect(result.refreshToken).toBeTypeOf('string');
  });

  it('treats refresh reuse outside grace period as theft and revokes all sessions', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const refreshToken = await service.issueRefreshToken('user-1');
    const decoded = jwt.decode(refreshToken) as JwtPayload & { jti: string };
    const storedTokenHash = await import('node:crypto').then((crypto) =>
      crypto.createHash('sha256').update(refreshToken).digest('hex'),
    );

    // Revoked 60 seconds ago (outside 30s grace window)
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: decoded.jti,
      user_id: 'user-1',
      token_hash: storedTokenHash,
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: new Date(Date.now() - 60_000),
    });

    await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow('invalid_refresh_token');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { user_id: 'user-1', revoked_at: null },
      data: { revoked_at: expect.any(Date) },
    });
  });

  it('rejects reuse within grace period without revoking all user sessions', async () => {
    const prisma = createMockPrisma();
    const service = new TokenService({ prisma: prisma as never });

    const refreshToken = await service.issueRefreshToken('user-1');
    const decoded = jwt.decode(refreshToken) as JwtPayload & { jti: string };
    const storedTokenHash = await import('node:crypto').then((crypto) =>
      crypto.createHash('sha256').update(refreshToken).digest('hex'),
    );

    // Revoked 5 seconds ago (within 30s grace window for concurrent race)
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: decoded.jti,
      user_id: 'user-1',
      token_hash: storedTokenHash,
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: new Date(Date.now() - 5_000),
    });

    await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow('invalid_refresh_token');
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  describe('admin audience', () => {
    const activeAdmin = { ...activeUser, role: 'SUPER_ADMIN' as const };

    it('mints a much shorter-lived refresh token for the admin audience than the member default', async () => {
      const prisma = createMockPrisma();
      const service = new TokenService({ prisma: prisma as never });

      await service.issueTokenPair(activeAdmin, { audience: 'admin' });

      const { expires_at } = prisma.refreshToken.create.mock.calls[0]![0].data;
      const ttlSeconds = (expires_at.getTime() - Date.now()) / 1000;

      // ADMIN_REFRESH_TOKEN_TTL=12h in vitest.config.ts vs. REFRESH_TOKEN_TTL_DAYS=120 for
      // members — asserting well under a day is enough to prove the shorter TTL was used,
      // without coupling the test to the exact configured value.
      expect(ttlSeconds).toBeLessThan(24 * 60 * 60);
    });

    it('refreshes into a new admin-audience access token for an admin user', async () => {
      const prisma = createMockPrisma();
      const service = new TokenService({ prisma: prisma as never });

      const refreshToken = await service.issueRefreshToken('admin-1');
      const decoded = jwt.decode(refreshToken) as JwtPayload & { jti: string };
      const createArgs = prisma.refreshToken.create.mock.calls[0]?.[0];

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: decoded.jti,
        user_id: 'admin-1',
        token_hash: createArgs.data.token_hash,
        expires_at: new Date(Date.now() + 60_000),
        revoked_at: null,
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...activeAdmin, id: 'admin-1' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.refreshAccessToken(refreshToken, { audience: 'admin' });

      const payload = jwt.decode(result.accessToken) as JwtPayload;
      expect(payload.aud).toBe('admin');
    });

    // Regression: refreshAccessToken must re-check the admin role at refresh time, not just
    // trust that the refresh token itself is still valid — otherwise a demotion between
    // login and refresh (or a member's own refresh token presented at the admin route)
    // would still mint a fresh admin-audience access token.
    it('refuses to mint an admin-audience token when the user is not an admin role', async () => {
      const prisma = createMockPrisma();
      const service = new TokenService({ prisma: prisma as never });

      const refreshToken = await service.issueRefreshToken('user-1');
      const decoded = jwt.decode(refreshToken) as JwtPayload & { jti: string };
      const createArgs = prisma.refreshToken.create.mock.calls[0]?.[0];

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: decoded.jti,
        user_id: 'user-1',
        token_hash: createArgs.data.token_hash,
        expires_at: new Date(Date.now() + 60_000),
        revoked_at: null,
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...activeUser, role: 'USER' });

      await expect(service.refreshAccessToken(refreshToken, { audience: 'admin' })).rejects.toThrow(
        'invalid_refresh_token',
      );
      // Never consumed: a demoted/non-admin user must not burn their refresh token on a
      // rejected admin-audience attempt.
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
