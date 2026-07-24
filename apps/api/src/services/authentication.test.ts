import { describe, expect, it, vi } from 'vitest';

import { hashVerificationCode } from '../lib/verification-code.js';
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

    const service = new AuthenticationService({
      prisma: prisma as never,
      emailClient: {} as never,
    });

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

    const service = new AuthenticationService({
      prisma: prisma as never,
      emailClient: {} as never,
    });

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

    const service = new AuthenticationService({
      prisma: prisma as never,
      emailClient: {} as never,
    });

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

    const service = new AuthenticationService({
      prisma: prisma as never,
      emailClient: {} as never,
    });

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

    const service = new AuthenticationService({
      prisma: prisma as never,
      emailClient: {} as never,
    });
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

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

      await expect(
        service.adminLogin({ email: 'admin@matchyplus.tn', password: 'matchy2026' }),
      ).rejects.toThrow('invalid_credentials');
    },
  );

  it('throws when registering an existing user', async () => {
    const prisma = createMockPrisma();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: 'hashed',
    });

    const service = new AuthenticationService({
      prisma: prisma as never,
      emailClient: {} as never,
    });

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        name: 'Test User',
      }),
    ).rejects.toThrow('user_already_exists');
  });

  describe('requestEmailVerification', () => {
    it('rejects an email already used by another account', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({ id: 'other-user' });

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {
          isConfigured: () => true,
          sendVerificationCode: vi.fn(),
        } as never,
      });

      await expect(
        service.requestEmailVerification({
          userId: 'user-1',
          email: 'taken@example.com',
        }),
      ).rejects.toThrow('email_already_used');
    });

    it('fails with smtp_not_configured when SMTP is not set up', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue(null);

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {
          isConfigured: () => false,
          sendVerificationCode: vi.fn(),
        } as never,
      });

      await expect(
        service.requestEmailVerification({
          userId: 'user-1',
          email: 'new@example.com',
        }),
      ).rejects.toThrow('smtp_not_configured');

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('stores a hash of the verification code, never the plaintext code', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue(null);

      const sendVerificationCode = vi.fn().mockResolvedValue(undefined);

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {
          isConfigured: () => true,
          sendVerificationCode,
        } as never,
      });

      await service.requestEmailVerification({
        userId: 'user-1',
        email: 'new@example.com',
      });

      expect(prisma.user.update).toHaveBeenCalledTimes(1);

      const storedCode = prisma.user.update.mock.calls.at(0)?.[0].data.email_verification_code;

      const plaintextSent = sendVerificationCode.mock.calls.at(0)?.[0].code;

      expect(plaintextSent).toBeTypeOf('string');
      expect(storedCode).toBe(hashVerificationCode(plaintextSent));
      expect(storedCode).not.toBe(plaintextSent);
    });
  });

  describe('confirmEmailVerification', () => {
    it('rejects a code that does not match the stored hash', async () => {
      const prisma = createMockPrisma();
      prisma.user.findFirst.mockResolvedValue(null);

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

      await expect(
        service.confirmEmailVerification({
          userId: 'user-1',
          code: '000000',
        }),
      ).rejects.toThrow('invalid_verification_code');

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('verifies the pending email when the hashed code matches', async () => {
      const prisma = createMockPrisma();

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        pending_email: 'new@example.com',
      });

      prisma.user.update.mockResolvedValue({
        email: 'new@example.com',
      });

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

      const result = await service.confirmEmailVerification({
        userId: 'user-1',
        code: '123456',
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
          email_verification_code: hashVerificationCode('123456'),
          pending_email: { not: null },
          email_verification_expires_at: {
            gt: expect.any(Date),
          },
        },
      });

      expect(result).toEqual({
        message: 'email_verified',
        email: 'new@example.com',
        emailVerified: true,
      });
    });
  });

  describe('deleteAccount', () => {
    it('deletes a password account when the correct current password is given', async () => {
      const prisma = createMockPrisma();
      const hashedPassword = await import('bcryptjs').then((bcrypt) =>
        bcrypt.hash('password123', 10),
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: hashedPassword,
      });
      prisma.user.delete.mockResolvedValue({ id: 'user-1' });

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

      const result = await service.deleteAccount({
        userId: 'user-1',
        confirm: true,
        currentPassword: 'password123',
      });

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual({ message: 'account_deleted' });
    });

    it('rejects a password account when the wrong current password is given', async () => {
      const prisma = createMockPrisma();
      const hashedPassword = await import('bcryptjs').then((bcrypt) =>
        bcrypt.hash('password123', 10),
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: hashedPassword,
      });

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

      await expect(
        service.deleteAccount({
          userId: 'user-1',
          confirm: true,
          currentPassword: 'wrong-password',
        }),
      ).rejects.toThrow('invalid_current_password');

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('rejects a password account when the current password is missing', async () => {
      const prisma = createMockPrisma();
      const hashedPassword = await import('bcryptjs').then((bcrypt) =>
        bcrypt.hash('password123', 10),
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: hashedPassword,
      });

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

      await expect(
        service.deleteAccount({
          userId: 'user-1',
          confirm: true,
        }),
      ).rejects.toThrow('invalid_current_password');

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('deletes a passwordless OAuth/OTP account once confirm is true', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: null,
      });
      prisma.user.delete.mockResolvedValue({ id: 'user-1' });

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

      const result = await service.deleteAccount({
        userId: 'user-1',
        confirm: true,
      });

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual({ message: 'account_deleted' });
    });

    it('rejects deletion when confirmation is false or missing, regardless of password', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: null,
      });

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

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
