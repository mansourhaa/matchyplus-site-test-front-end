import { describe, expect, it, vi } from 'vitest';

import { AuthenticationService } from './authentication.js';

function createMockPrisma() {
  return {
    user: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe('AuthenticationService', () => {
  it('throws when user is not found on login', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));

    const service = new AuthenticationService({ prisma: prisma as never });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow('invalid_credentials');
  });

  it('throws when password is invalid on login', async () => {
    const prisma = createMockPrisma();

    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      name: 'user@example.com',
      password: '$2a$10$invalidhashvaluexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });

    const service = new AuthenticationService({ prisma: prisma as never });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('invalid_credentials');
  });

  it('returns access token, refresh token, and safe user on successful login', async () => {
    const prisma = createMockPrisma();

    const hashedPassword = await import('bcryptjs').then((bcrypt) =>
      bcrypt.hash('password123', 10),
    );

    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: '+21612345678',
      name: 'user@example.com',
      password: hashedPassword,
      status: 'ACTIVE',
    });

    const service = new AuthenticationService({ prisma: prisma as never });

    const result = await service.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');

    expect(result.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      phone: '+21612345678',
      name: 'user@example.com',
      status: 'ACTIVE',
    });

    expect(result.user).not.toHaveProperty('password');

    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        user_id: 'user-1',
        token_hash: expect.any(String),
        expires_at: expect.any(Date),
      },
    });
  });

  it('rejects a valid non-admin account on admin login', async () => {
    const prisma = createMockPrisma();
    const hashedPassword = await import('bcryptjs').then((bcrypt) =>
      bcrypt.hash('password123', 10),
    );

    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'user@example.com',
      password: hashedPassword,
      role: 'USER',
      status: 'ACTIVE',
    });

    const service = new AuthenticationService({ prisma: prisma as never });

    await expect(
      service.adminLogin({ email: 'user@example.com', password: 'password123' }),
    ).rejects.toThrow('invalid_credentials');
  });

  it('returns access token and admin on successful admin login', async () => {
    const prisma = createMockPrisma();
    const hashedPassword = await import('bcryptjs').then((bcrypt) => bcrypt.hash('matchy2026', 10));

    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@matchyplus.tn',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    });

    const service = new AuthenticationService({ prisma: prisma as never });
    const result = await service.adminLogin({
      email: 'admin@matchyplus.tn',
      password: 'matchy2026',
    });

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.user.role).toBe('SUPER_ADMIN');
  });

  it.each(['BANNED', 'INACTIVE'])(
    'refuses a %s admin with the right password on admin login',
    async (status) => {
      const prisma = createMockPrisma();
      const hashedPassword = await import('bcryptjs').then((bcrypt) =>
        bcrypt.hash('matchy2026', 10),
      );

      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@matchyplus.tn',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status,
      });

      const service = new AuthenticationService({ prisma: prisma as never });

      await expect(
        service.adminLogin({ email: 'admin@matchyplus.tn', password: 'matchy2026' }),
      ).rejects.toThrow('invalid_credentials');
    },
  );

  describe('authCheck', () => {
    it('returns the safe profile fields the frontend needs, nothing sensitive', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        phone: '+21612345678',
        name: 'Jane Doe',
        auth_provider: 'email',
        email_verified: true,
        phone_verified: true,
        google_id: null,
        linkedin_id: null,
        verified: false,
        role: 'USER',
        onboarding_completed_at: new Date('2026-01-01'),
        password: null,
      });

      const service = new AuthenticationService({ prisma: prisma as never });

      const result = await service.authCheck({ id: 'user-1' });

      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
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

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        phone: '+21612345678',
        name: 'Jane Doe',
        auth_provider: 'email',
        email_verified: true,
        phone_verified: true,
        google_linked: false,
        linkedin_linked: false,
        has_password: false,
        verified: false,
        role: 'USER',
        onboarding_completed: true,
      });

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('status');
      expect(result).not.toHaveProperty('refresh_tokens');
      expect(result).not.toHaveProperty('onboarding_completed_at');
      expect(result).not.toHaveProperty('google_id');
      expect(result).not.toHaveProperty('linkedin_id');
    });

    it('reports onboarding_completed: false when onboarding has not been finished', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        name: 'Jane Doe',
        auth_provider: 'email',
        email_verified: false,
        phone_verified: false,
        google_id: null,
        linkedin_id: null,
        role: 'USER',
        onboarding_completed_at: null,
        password: null,
      });

      const service = new AuthenticationService({ prisma: prisma as never });

      const result = await service.authCheck({ id: 'user-1' });

      expect(result.onboarding_completed).toBe(false);
    });

    it('throws when the user no longer exists', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));

      const service = new AuthenticationService({ prisma: prisma as never });

      await expect(service.authCheck({ id: 'missing-user' })).rejects.toThrow('user_not_found');
    });
  });

  describe('deleteAccount', () => {
    it('deletes an account when confirmed', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
      });
      prisma.user.delete.mockResolvedValue({ id: 'user-1' });

      const service = new AuthenticationService({ prisma: prisma as never });

      const result = await service.deleteAccount({
        userId: 'user-1',
        confirm: true,
      });

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual({ message: 'account_deleted' });
    });

    it('rejects deletion when confirmation is false or missing', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
      });

      const service = new AuthenticationService({ prisma: prisma as never });

      await expect(service.deleteAccount({ userId: 'user-1', confirm: false })).rejects.toThrow(
        'account_deletion_not_confirmed',
      );

      await expect(service.deleteAccount({ userId: 'user-1' } as never)).rejects.toThrow(
        'account_deletion_not_confirmed',
      );

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
