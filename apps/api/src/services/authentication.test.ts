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
      service.login({ email: 'user@example.com', password: 'password123' }),
    ).rejects.toThrow('invalid_credentials');
  });

  it('throws when password is invalid on login', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'user@example.com',
      password: '$2a$10$invalidhashvaluexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });

    const service = new AuthenticationService({
      prisma: prisma as never,
      emailClient: {} as never,
    });

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toThrow('invalid_credentials');
  });

  it('returns access token and user on successful login', async () => {
    const prisma = createMockPrisma();
    const hashedPassword = await import('bcryptjs').then((bcrypt) =>
      bcrypt.hash('password123', 10),
    );

    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'user@example.com',
      password: hashedPassword,
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
    expect(result.user.email).toBe('user@example.com');
  });

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
        emailClient: { isConfigured: () => true, sendVerificationCode: vi.fn() } as never,
      });

      await expect(
        service.requestEmailVerification({ userId: 'user-1', email: 'taken@example.com' }),
      ).rejects.toThrow('email_already_used');
    });

    it('fails with smtp_not_configured when SMTP is not set up', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue(null);

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: { isConfigured: () => false, sendVerificationCode: vi.fn() } as never,
      });

      await expect(
        service.requestEmailVerification({ userId: 'user-1', email: 'new@example.com' }),
      ).rejects.toThrow('smtp_not_configured');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('stores a hash of the verification code, never the plaintext code', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue(null);
      const sendVerificationCode = vi.fn().mockResolvedValue(undefined);

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: { isConfigured: () => true, sendVerificationCode } as never,
      });

      await service.requestEmailVerification({ userId: 'user-1', email: 'new@example.com' });

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
        service.confirmEmailVerification({ userId: 'user-1', code: '000000' }),
      ).rejects.toThrow('invalid_verification_code');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('verifies the pending email when the hashed code matches', async () => {
      const prisma = createMockPrisma();
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        pending_email: 'new@example.com',
      });
      prisma.user.update.mockResolvedValue({ email: 'new@example.com' });

      const service = new AuthenticationService({
        prisma: prisma as never,
        emailClient: {} as never,
      });

      const result = await service.confirmEmailVerification({ userId: 'user-1', code: '123456' });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
          email_verification_code: hashVerificationCode('123456'),
          pending_email: { not: null },
          email_verification_expires_at: { gt: expect.any(Date) },
        },
      });
      expect(result).toEqual({
        message: 'email_verified',
        email: 'new@example.com',
        emailVerified: true,
      });
    });
  });
});
