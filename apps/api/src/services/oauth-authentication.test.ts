import { describe, expect, it, vi } from 'vitest';

import { OAuthAuthenticationService } from './oauth-authentication.js';
import { TokenService } from './token.js';

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    oAuthExchangeCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function createService(prisma = createMockPrisma()) {
  const service = new OAuthAuthenticationService({ prisma: prisma as never });
  return { service, prisma };
}

describe('OAuthAuthenticationService', () => {
  describe('findOrCreateOAuthUser', () => {
    it('creates a new user when no account matches the provider id or email', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce(null); // by google_id
      prisma.user.findUnique.mockResolvedValueOnce(null); // by email
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        google_id: 'google-sub-1',
        auth_provider: 'google',
      });

      const result = await service.findOrCreateOAuthUser('google', {
        id: 'google-sub-1',
        email: 'new@example.com',
        emailVerified: true,
        name: 'Jane Doe',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          email_verified: true,
          name: 'Jane Doe',
          image: null,
          auth_provider: 'google',
          google_id: 'google-sub-1',
        },
      });
      expect(result.id).toBe('user-1');
    });

    it('returns the existing user found by provider id without creating or updating', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        google_id: 'google-sub-1',
        auth_provider: 'google',
      });

      const result = await service.findOrCreateOAuthUser('google', {
        id: 'google-sub-1',
        email: 'existing@example.com',
        emailVerified: true,
        name: 'Jane Doe',
      });

      expect(result.id).toBe('user-1');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      // Only the provider-id lookup should run — no need to also check by email.
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('links the provider to an existing account when its email is verified', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce(null); // by linkedin_id
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'verified@example.com',
        email_verified: true,
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'verified@example.com',
        linkedin_id: 'linkedin-sub-1',
      });

      const result = await service.findOrCreateOAuthUser('linkedin', {
        id: 'linkedin-sub-1',
        email: 'verified@example.com',
        emailVerified: true,
        name: 'Jane Doe',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { email_verified: true, linkedin_id: 'linkedin-sub-1' },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result.linkedin_id).toBe('linkedin-sub-1');
    });

    it('refuses email merge when the provider email is unverified', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce(null); // by google_id
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'unverified@example.com',
        email_verified: false,
      });

      await expect(
        service.findOrCreateOAuthUser('google', {
          id: 'google-sub-1',
          email: 'unverified@example.com',
          emailVerified: false,
          name: 'Jane Doe',
        }),
      ).rejects.toThrow('oauth_email_unverified');

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('links when provider email is verified even if our email_verified flag was stale', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce(null); // by google_id
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'unverified@example.com',
        email_verified: false,
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'unverified@example.com',
        email_verified: true,
        google_id: 'google-sub-1',
      });

      const result = await service.findOrCreateOAuthUser('google', {
        id: 'google-sub-1',
        email: 'unverified@example.com',
        emailVerified: true,
        name: 'Jane Doe',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { email_verified: true, google_id: 'google-sub-1' },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result.email_verified).toBe(true);
    });

    it('never mints tokens while finding or creating a user', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1' });
      const issueTokenPairSpy = vi.spyOn(TokenService.prototype, 'issueTokenPair');

      await service.findOrCreateOAuthUser('google', {
        id: 'google-sub-1',
        email: null,
        emailVerified: false,
        name: null,
      });

      expect(issueTokenPairSpy).not.toHaveBeenCalled();
      issueTokenPairSpy.mockRestore();
    });
  });

  describe('createExchangeCode', () => {
    it('never mints tokens while issuing an exchange code', async () => {
      const { service, prisma } = createService();
      prisma.oAuthExchangeCode.create.mockResolvedValue({});
      const issueTokenPairSpy = vi.spyOn(TokenService.prototype, 'issueTokenPair');

      await service.createExchangeCode('user-1');

      expect(issueTokenPairSpy).not.toHaveBeenCalled();
      expect(prisma.oAuthExchangeCode.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.oAuthExchangeCode.create.mock.calls.at(0)?.[0];
      expect(createArgs.data.user_id).toBe('user-1');
      expect(createArgs.data.code_hash).toBeTypeOf('string');
      issueTokenPairSpy.mockRestore();
    });
  });

  describe('consumeExchangeCode', () => {
    it('mints tokens only at consumption time, once every check passes', async () => {
      const { service, prisma } = createService();

      prisma.oAuthExchangeCode.findUnique.mockResolvedValue({
        id: 'exchange-1',
        user_id: 'user-1',
        consumed_at: null,
        expires_at: new Date(Date.now() + 60_000),
      });

      prisma.oAuthExchangeCode.updateMany.mockResolvedValue({
        count: 1,
      });

      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        name: 'Jane Doe',
        auth_provider: 'google',
        email_verified: true,
        phone_verified: false,
        google_id: 'google-sub-1',
        linkedin_id: null,
        onboarding_completed_at: null,
      });

      const issueTokenPairSpy = vi
        .spyOn(TokenService.prototype, 'issueTokenPair')
        .mockResolvedValue({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        });

      const result = await service.consumeExchangeCode({
        code: 'raw-exchange-code',
      });

      expect(issueTokenPairSpy).toHaveBeenCalledTimes(1);

      expect(prisma.oAuthExchangeCode.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'exchange-1',
          consumed_at: null,
          expires_at: {
            gt: expect.any(Date),
          },
        },
        data: {
          consumed_at: expect.any(Date),
        },
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      // The wire response must expose the derived `onboarding_completed` boolean, not
      // the raw onboarding_completed_at timestamp — matching authCheck's shape.
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        name: 'Jane Doe',
        auth_provider: 'google',
        email_verified: true,
        phone_verified: false,
        google_linked: true,
        linkedin_linked: false,
        has_password: false,
        onboarding_completed: false,
      });

      issueTokenPairSpy.mockRestore();
    });

    it('rejects an expired exchange code without minting tokens', async () => {
      const { service, prisma } = createService();

      prisma.oAuthExchangeCode.findUnique.mockResolvedValue({
        id: 'exchange-1',
        user_id: 'user-1',
        consumed_at: null,
        expires_at: new Date(Date.now() - 1000),
      });

      prisma.oAuthExchangeCode.updateMany.mockResolvedValue({
        count: 0,
      });

      const issueTokenPairSpy = vi.spyOn(TokenService.prototype, 'issueTokenPair');

      await expect(
        service.consumeExchangeCode({
          code: 'raw-exchange-code',
        }),
      ).rejects.toThrow('invalid_exchange_code');

      expect(prisma.oAuthExchangeCode.updateMany).toHaveBeenCalledTimes(1);
      expect(issueTokenPairSpy).not.toHaveBeenCalled();

      issueTokenPairSpy.mockRestore();
    });

    it.each(['BANNED', 'INACTIVE'] as const)(
      'rejects a %s account with a distinct error, not invalid_credentials',
      async (status) => {
        const { service, prisma } = createService();

        prisma.oAuthExchangeCode.findUnique.mockResolvedValue({
          id: 'exchange-1',
          user_id: 'user-1',
          consumed_at: null,
          expires_at: new Date(Date.now() + 60_000),
        });
        prisma.oAuthExchangeCode.updateMany.mockResolvedValue({ count: 1 });
        prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'user-1', status });

        const issueTokenPairSpy = vi.spyOn(TokenService.prototype, 'issueTokenPair');

        await expect(service.consumeExchangeCode({ code: 'raw-exchange-code' })).rejects.toThrow(
          status === 'BANNED' ? 'account_banned' : 'account_inactive',
        );
        expect(issueTokenPairSpy).not.toHaveBeenCalled();

        issueTokenPairSpy.mockRestore();
      },
    );

    it('rejects an already-consumed exchange code without minting tokens', async () => {
      const { service, prisma } = createService();

      prisma.oAuthExchangeCode.findUnique.mockResolvedValue({
        id: 'exchange-1',
        user_id: 'user-1',
        consumed_at: new Date(),
        expires_at: new Date(Date.now() + 60_000),
      });

      prisma.oAuthExchangeCode.updateMany.mockResolvedValue({
        count: 0,
      });

      const issueTokenPairSpy = vi.spyOn(TokenService.prototype, 'issueTokenPair');

      await expect(
        service.consumeExchangeCode({
          code: 'raw-exchange-code',
        }),
      ).rejects.toThrow('invalid_exchange_code');

      expect(prisma.oAuthExchangeCode.updateMany).toHaveBeenCalledTimes(1);
      expect(issueTokenPairSpy).not.toHaveBeenCalled();

      issueTokenPairSpy.mockRestore();
    });

    it('rejects a code that does not exist', async () => {
      const { service, prisma } = createService();

      prisma.oAuthExchangeCode.findUnique.mockResolvedValue(null);

      await expect(
        service.consumeExchangeCode({
          code: 'unknown-code',
        }),
      ).rejects.toThrow('invalid_exchange_code');

      expect(prisma.oAuthExchangeCode.updateMany).not.toHaveBeenCalled();
    });
  });
});
