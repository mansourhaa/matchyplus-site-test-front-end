import { describe, expect, it, vi } from 'vitest';

import { AuthenticationService } from './authentication.js';

function createMockPrisma() {
  return {
    user: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('AuthenticationService', () => {
  it('throws when user is not found on login', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));

    const service = new AuthenticationService({ prisma: prisma as never });

    await expect(
      service.login({ email: 'user@example.com', password: 'password123' }),
    ).rejects.toThrow('invalid credentials');
  });

  it('throws when password is invalid on login', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'user@example.com',
      password: '$2a$10$invalidhashvaluexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });

    const service = new AuthenticationService({ prisma: prisma as never });

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toThrow('invalid credentials');
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
      status: 'ACTIVE',
    });

    const service = new AuthenticationService({ prisma: prisma as never });
    const result = await service.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.user.email).toBe('user@example.com');
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
    ).rejects.toThrow('invalid credentials');
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
      ).rejects.toThrow('invalid credentials');
    },
  );

  it('throws when registering an existing user', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: 'hashed',
    });

    const service = new AuthenticationService({ prisma: prisma as never });

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        name: 'Test User',
      }),
    ).rejects.toThrow('user already exist');
  });
});
