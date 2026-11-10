import { describe, expect, it, vi } from 'vitest';

import { AdminService, normalizeAdminUser } from './admin.js';

function createMockPrisma() {
  return {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    plan: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    match: {
      count: vi.fn().mockResolvedValue(0),
    },
    refreshToken: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe('AdminService', () => {
  it('filters users by status, plan and a case-insensitive search', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const service = new AdminService({ prisma: prisma as never });
    await service.listUsers(
      { id: 'sa1', role: 'SUPER_ADMIN' } as never,
      {
        search: 'karim',
        status: 'BANNED',
        plan: 'FREE',
      } as never,
    );

    const { where } = prisma.user.findMany.mock.calls[0][0];
    expect(where.status).toBe('BANNED');
    expect(where.plan).toBe('FREE');
    expect(where.OR).toEqual([
      { name: { contains: 'karim', mode: 'insensitive' } },
      { email: { contains: 'karim', mode: 'insensitive' } },
      { job: { contains: 'karim', mode: 'insensitive' } },
    ]);
  });

  it('filters by a real category name', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const service = new AdminService({ prisma: prisma as never });
    await service.listUsers(
      { id: 'sa1', role: 'SUPER_ADMIN' } as never,
      {
        category: 'Électricité',
      } as never,
    );

    expect(prisma.user.findMany.mock.calls[0][0].where.category).toBe('Électricité');
  });

  it('never selects the password column', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const service = new AdminService({ prisma: prisma as never });
    await service.listUsers({ id: 'sa1', role: 'SUPER_ADMIN' } as never, {});

    const { select } = prisma.user.findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty('password');
    expect(select.email).toBe(true);
  });

  it.each(['SUPPORT', 'MODERATOR', 'SUPER_ADMIN'])(
    'scopes the list a %s sees to members only, regardless of their own role',
    async (role) => {
      const prisma = createMockPrisma();
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const service = new AdminService({ prisma: prisma as never });
      await service.listUsers({ id: 'a1', role } as never, {});

      const { where } = prisma.user.findMany.mock.calls[0][0];
      expect(where.role).toBe('USER');
      // The count has to be scoped the same way or pagination advertises hidden rows.
      expect(prisma.user.count.mock.calls[0][0].where.role).toBe('USER');
    },
  );

  it('refuses to let a moderator open a super admin profile', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    const rejection = service.getUserById({ id: 'm1', role: 'MODERATOR' } as never, 'sa1');

    await expect(rejection).rejects.toThrow('insufficient privileges');
    await expect(rejection).rejects.toMatchObject({ statusCode: 403 });
    // Nothing about the higher-ranked account is read, not even the projection.
    expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('lets an admin open a profile below them', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', email: 'u1@x.tn' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.getUserById({ id: 's1', role: 'SUPPORT' } as never, 'u1'),
    ).resolves.toMatchObject({ id: 'u1' });
  });

  it('extracts the filename from a user with a real uploaded photo', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'USER',
      image: '/uploads/photos/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.jpg',
    });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.getUserPhotoFilename({ id: 's1', role: 'SUPPORT' } as never, 'u1'),
    ).resolves.toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.jpg');
  });

  it.each([
    ['no image at all', null],
    ['a legacy base64 data URL', 'data:image/png;base64,abc'],
    ['an external OAuth avatar URL', 'https://lh3.googleusercontent.com/a/foo'],
  ])('rejects with photo not found when the user has %s', async (_label, image) => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER', image });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.getUserPhotoFilename({ id: 's1', role: 'SUPPORT' } as never, 'u1'),
    ).rejects.toMatchObject({ message: 'photo not found', statusCode: 404 });
  });

  it('refuses to serve a photo for a user the actor cannot manage', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.getUserPhotoFilename({ id: 'm1', role: 'MODERATOR' } as never, 'sa1'),
    ).rejects.toThrow('insufficient privileges');
  });

  it('extracts the filename from a user with a real uploaded video', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'USER',
      video: '/uploads/videos/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.mp4',
    });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.getUserVideoFilename({ id: 's1', role: 'SUPPORT' } as never, 'u1'),
    ).resolves.toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.mp4');
  });

  it.each([
    ['no video at all', null],
    [
      'a stored photo path (wrong kind)',
      '/uploads/photos/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.jpg',
    ],
  ])('rejects with video not found when the user has %s', async (_label, video) => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER', video });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.getUserVideoFilename({ id: 's1', role: 'SUPPORT' } as never, 'u1'),
    ).rejects.toMatchObject({ message: 'video not found', statusCode: 404 });
  });

  it('refuses to serve a video for a user the actor cannot manage', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.getUserVideoFilename({ id: 'm1', role: 'MODERATOR' } as never, 'sa1'),
    ).rejects.toThrow('insufficient privileges');
  });

  it('ignores fields that are not admin-editable', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.update.mockResolvedValue({ id: 'u1' });

    const service = new AdminService({ prisma: prisma as never });
    await service.updateUser({ id: 'a1', role: 'SUPER_ADMIN' } as never, 'u1', {
      city: 'Tunis',
      role: 'SUPER_ADMIN',
      rating: 9999,
      // `plan` is not editable here: granting a paid tier must not ride the generic update
      // path, it is reserved to the SUPER_ADMIN-gated plan management.
      plan: 'PREMIUM_PLUS',
    } as never);

    const { data } = prisma.user.update.mock.calls[0][0];
    expect(data).toEqual({ city: 'Tunis' });
  });

  it('refuses to let a lower role act on a higher one', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.updateUserStatus({ id: 's1', role: 'SUPPORT' } as never, 'sa1', 'BANNED' as never),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to let a role act on a peer', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'm2', role: 'MODERATOR' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.updateUserStatus({ id: 'm1', role: 'MODERATOR' } as never, 'm2', 'BANNED' as never),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to let an admin act on their own account', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.updateUserStatus(
        { id: 'sa1', role: 'SUPER_ADMIN' } as never,
        'sa1',
        'BANNED' as never,
      ),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('lets a moderator ban a regular member', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.update.mockResolvedValue({ id: 'u1', status: 'BANNED' });

    const service = new AdminService({ prisma: prisma as never });
    await service.updateUserStatus(
      { id: 'm1', role: 'MODERATOR' } as never,
      'u1',
      'BANNED' as never,
    );

    const { where, data } = prisma.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: 'u1' });
    expect(data).toEqual({ status: 'BANNED' });
  });

  it('refuses to delete an admin account', async () => {
    const prisma = createMockPrisma();
    // A target the actor does outrank, so the refusal comes from the admin-account rule
    // rather than from the hierarchy guard in front of it.
    prisma.user.findUnique.mockResolvedValue({ id: 'm1', role: 'MODERATOR' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.deleteUser({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'm1'),
    ).rejects.toThrow('cannot delete an admin account');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('deletes a regular member', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.delete.mockResolvedValue({ id: 'u1' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.deleteUser({ id: 'm1', role: 'MODERATOR' } as never, 'u1'),
    ).resolves.toEqual({ deleted: true });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('refuses to let a lower role delete a peer or a superior', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(service.deleteUser({ id: 's1', role: 'SUPPORT' } as never, 'sa1')).rejects.toThrow(
      'insufficient privileges',
    );
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to let an admin delete their own account', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.deleteUser({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'sa1'),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('reports a missing user as a 404 rather than a server error', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.getUserById({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'ghost'),
    ).rejects.toMatchObject({ message: 'user not found', statusCode: 404 });
  });

  it('reports a refusal to delete an admin as a 403', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'm1', role: 'MODERATOR' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.deleteUser({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'm1'),
    ).rejects.toMatchObject({ message: 'cannot delete an admin account', statusCode: 403 });
  });

  it('reports a missing plan as a 404', async () => {
    const prisma = createMockPrisma();
    prisma.plan.update.mockRejectedValue(new Error('no row'));

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.updatePlan({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'PREMIUM' as never, {}),
    ).rejects.toMatchObject({ message: 'plan not found', statusCode: 404 });
  });

  it('reports zero for statuses and plans with no rows', async () => {
    const prisma = createMockPrisma();
    prisma.user.count.mockResolvedValue(2);
    prisma.user.groupBy
      .mockResolvedValueOnce([{ status: 'ACTIVE', _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ plan: 'FREE', _count: { _all: 2 } }]);

    const service = new AdminService({ prisma: prisma as never });

    await expect(service.getStats()).resolves.toEqual({
      totalUsers: 2,
      activeUsers: 2,
      inactiveUsers: 0,
      bannedUsers: 0,
      freeUsers: 2,
      premiumUsers: 0,
      premiumPlusUsers: 0,
    });
  });

  // Regression: totalUsers counted every account in the table, including admin/support/
  // moderator accounts that aren't members at all — the dashboard total must match what the
  // members-only Users page actually lists, not the whole User table.
  it('scopes the stats to members only', async () => {
    const prisma = createMockPrisma();
    prisma.user.count.mockResolvedValue(0);
    prisma.user.groupBy.mockResolvedValue([]);

    const service = new AdminService({ prisma: prisma as never });
    await service.getStats();

    expect(prisma.user.count.mock.calls[0][0].where.role).toBe('USER');
    expect(prisma.user.groupBy.mock.calls[0][0].where.role).toBe('USER');
    expect(prisma.user.groupBy.mock.calls[1][0].where.role).toBe('USER');
  });
});

describe('AdminService createUser', () => {
  function validPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      name: 'Amine Ben Salah',
      phone: '20123456',
      password: 'Matchy2026!',
      profileType: 'INDIVIDUAL',
      job: 'Plombier',
      interests: ['bricolage'],
      selectedGoals: ['find-clients'],
      image: 'data:image/png;base64,aaaa',
      ...overrides,
    } as never;
  }

  it('creates a member account with the phone normalized and the password hashed', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1' });

    const service = new AdminService({ prisma: prisma as never });
    const result = await service.createUser(validPayload());

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { phone: '+21620123456' } });
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.phone).toBe('+21620123456');
    expect(data.auth_provider).toBe('phone');
    expect(data.phone_verified).toBe(true);
    expect(data.password).not.toBe('Matchy2026!');
    expect(result).toEqual({ id: 'u1' });
  });

  it('rejects an unparseable phone number', async () => {
    const prisma = createMockPrisma();
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload({ phone: '   ' }))).rejects.toMatchObject({
      message: 'invalid phone number',
      statusCode: 400,
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a phone that is already registered', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload())).rejects.toMatchObject({
      message: 'phone already registered',
      statusCode: 400,
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects an email that is already registered', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // phone lookup
      .mockResolvedValueOnce({ id: 'existing' }); // email lookup
    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.createUser(validPayload({ email: 'Amine@Example.com' })),
    ).rejects.toMatchObject({ message: 'email already registered', statusCode: 400 });
    expect(prisma.user.findUnique).toHaveBeenLastCalledWith({
      where: { email: 'amine@example.com' },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a password that fails the security policy', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload({ password: 'weakpass' }))).rejects.toMatchObject({
      message: 'password does not meet the security policy',
      statusCode: 400,
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a blank name', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload({ name: '   ' }))).rejects.toMatchObject({
      message: 'name is required',
      statusCode: 400,
    });
  });

  it('requires a job for an individual profile', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload({ job: undefined }))).rejects.toMatchObject({
      message: 'job is required for an individual profile',
      statusCode: 400,
      code: 'onboarding_incomplete',
    });
  });

  it('does not require a job for a provider profile', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.createUser(validPayload({ profileType: 'PROVIDER', job: undefined })),
    ).resolves.toEqual({ id: 'u1' });
  });

  it('requires at least one interest', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload({ interests: [] }))).rejects.toMatchObject({
      message: 'at least one interest is required',
      statusCode: 400,
    });
  });

  it('requires at least one goal', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload({ selectedGoals: [] }))).rejects.toMatchObject({
      message: 'at least one goal is required',
      statusCode: 400,
    });
  });

  it('requires service type and price when offering a service', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload({ offerService: true }))).rejects.toMatchObject({
      message: 'service type and price are required when offering a service',
      statusCode: 400,
    });
  });

  it('accepts a service offer once type and price are provided', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.createUser(
        validPayload({ offerService: true, serviceType: 'Plomberie', price: '50 DT' }),
      ),
    ).resolves.toEqual({ id: 'u1' });
  });

  it('allows creating a user without a profile photo', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    const service = new AdminService({ prisma: prisma as never });

    await expect(service.createUser(validPayload({ image: undefined }))).resolves.toEqual({
      id: 'u1',
    });
  });

  it('allows creating a user without a password, generating an activation token and link', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u-lead' });

    const service = new AdminService({ prisma: prisma as never });
    const payload = validPayload({ password: '' });
    const result = await service.createUser(payload);

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.password).toBeNull();
    expect(data.must_change_password).toBe(true);
    expect(data.activation_token_hash).toBeDefined();
    expect(data.activation_token_expires_at).toBeInstanceOf(Date);
    expect(result.id).toBe('u-lead');
    expect(result.activationToken).toBeDefined();
    expect(result.activationLink).toContain('/activer?token=');
  });

  it('rejects an image that is already a stored media path', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.createUser(
        validPayload({ image: '/uploads/photos/11111111-1111-1111-1111-111111111111.jpg' }),
      ),
    ).rejects.toMatchObject({
      message: 'image must be a newly uploaded photo, not a stored path',
      statusCode: 400,
    });
  });
});

describe('AdminService regenerateActivationToken', () => {
  it('regenerates an activation link and token for an existing member', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', role: 'USER' }) // for assertCanManage target
      .mockResolvedValueOnce({ id: 'u1', status: 'ACTIVE' }); // for target lookup
    prisma.user.update.mockResolvedValue({ id: 'u1' });

    const service = new AdminService({ prisma: prisma as never });
    const actor: AdminActor = { id: 'admin-1', role: 'SUPER_ADMIN' };

    const result = await service.regenerateActivationToken(actor, 'u1');

    expect(result.activationToken).toBeDefined();
    expect(result.activationLink).toContain('/activer?token=');
    expect(result.expiresAt).toBeDefined();

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          must_change_password: true,
          activation_token_hash: expect.any(String),
          activation_token_expires_at: expect.any(Date),
        }),
      }),
    );
  });

  it('refuses to regenerate activation for a banned user', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', role: 'USER' })
      .mockResolvedValueOnce({ id: 'u1', status: 'BANNED' });

    const service = new AdminService({ prisma: prisma as never });
    const actor: AdminActor = { id: 'admin-1', role: 'SUPER_ADMIN' };

    await expect(service.regenerateActivationToken(actor, 'u1')).rejects.toMatchObject({
      message: 'cannot regenerate activation for a banned user',
      statusCode: 400,
    });
  });
});

describe('AdminService listTeamMembers', () => {
  it('refuses a SUPPORT actor outright, without touching the database', async () => {
    const prisma = createMockPrisma();
    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.listTeamMembers({ id: 's1', role: 'SUPPORT' } as never, {}),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['MODERATOR', ['SUPPORT']],
    ['SUPER_ADMIN', ['SUPPORT', 'MODERATOR']],
  ])('scopes the team a %s sees to staff roles below them', async (role, visible) => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const service = new AdminService({ prisma: prisma as never });
    await service.listTeamMembers({ id: 'a1', role } as never, {});

    const { where, select } = prisma.user.findMany.mock.calls[0][0];
    expect(where.role.in).toEqual(visible);
    expect(select).not.toHaveProperty('password');
    expect(prisma.user.count.mock.calls[0][0].where.role.in).toEqual(visible);
  });

  it('applies a case-insensitive name/email search', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const service = new AdminService({ prisma: prisma as never });
    await service.listTeamMembers({ id: 'sa1', role: 'SUPER_ADMIN' } as never, {
      search: 'sami',
    });

    const { where } = prisma.user.findMany.mock.calls[0][0];
    expect(where.OR).toEqual([
      { name: { contains: 'sami', mode: 'insensitive' } },
      { email: { contains: 'sami', mode: 'insensitive' } },
    ]);
  });
});

describe('AdminService createTeamMember', () => {
  function validPayload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      name: 'Sami Ben Ali',
      email: 'sami@matchyplus.tn',
      password: 'Matchy2026!',
      role: 'SUPPORT',
      ...overrides,
    } as never;
  }

  it('refuses a SUPPORT actor outright, without touching the database', async () => {
    const prisma = createMockPrisma();
    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.createTeamMember({ id: 's1', role: 'SUPPORT' } as never, validPayload()),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each(['MODERATOR', 'SUPER_ADMIN'])(
    'refuses a %s creating a role they do not outrank',
    async (role) => {
      const prisma = createMockPrisma();
      const service = new AdminService({ prisma: prisma as never });

      await expect(
        service.createTeamMember(
          { id: 'a1', role } as never,
          validPayload({ role: role === 'MODERATOR' ? 'MODERATOR' : 'SUPER_ADMIN' }),
        ),
      ).rejects.toThrow('insufficient privileges');
      expect(prisma.user.create).not.toHaveBeenCalled();
    },
  );

  it('lets a MODERATOR create a SUPPORT account', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 't1' });

    const service = new AdminService({ prisma: prisma as never });
    const result = await service.createTeamMember(
      { id: 'm1', role: 'MODERATOR' } as never,
      validPayload(),
    );

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.email).toBe('sami@matchyplus.tn');
    expect(data.role).toBe('SUPPORT');
    expect(data.status).toBe('ACTIVE');
    expect(data.auth_provider).toBe('email');
    expect(data.email_verified).toBe(true);
    expect(data.password).not.toBe('Matchy2026!');
    expect(result).toEqual({ id: 't1' });
  });

  it('lets a SUPER_ADMIN create a MODERATOR account', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 't1' });

    const service = new AdminService({ prisma: prisma as never });
    await service.createTeamMember(
      { id: 'sa1', role: 'SUPER_ADMIN' } as never,
      validPayload({ role: 'MODERATOR' }),
    );

    expect(prisma.user.create.mock.calls[0][0].data.role).toBe('MODERATOR');
  });

  it('rejects an email that is already registered', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

    const service = new AdminService({ prisma: prisma as never });
    await expect(
      service.createTeamMember({ id: 'sa1', role: 'SUPER_ADMIN' } as never, validPayload()),
    ).rejects.toMatchObject({ message: 'email already registered', statusCode: 400 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a phone that is already registered', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // email lookup
      .mockResolvedValueOnce({ id: 'existing' }); // phone lookup

    const service = new AdminService({ prisma: prisma as never });
    await expect(
      service.createTeamMember(
        { id: 'sa1', role: 'SUPER_ADMIN' } as never,
        validPayload({ phone: '20123456' }),
      ),
    ).rejects.toMatchObject({ message: 'phone already registered', statusCode: 400 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a password that fails the security policy', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new AdminService({ prisma: prisma as never });
    await expect(
      service.createTeamMember(
        { id: 'sa1', role: 'SUPER_ADMIN' } as never,
        validPayload({ password: 'weakpass' }),
      ),
    ).rejects.toMatchObject({
      message: 'password does not meet the security policy',
      statusCode: 400,
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a blank name', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new AdminService({ prisma: prisma as never });
    await expect(
      service.createTeamMember(
        { id: 'sa1', role: 'SUPER_ADMIN' } as never,
        validPayload({ name: '   ' }),
      ),
    ).rejects.toMatchObject({ message: 'name is required', statusCode: 400 });
  });
});

describe('AdminService plan management', () => {
  it.each(['SUPPORT', 'MODERATOR'])('refuses to let a %s edit a plan', async (role) => {
    const prisma = createMockPrisma();
    const service = new AdminService({ prisma: prisma as never });

    const rejection = service.updatePlan({ id: 'a1', role } as never, 'PREMIUM' as never, {
      price: 0,
    });

    await expect(rejection).rejects.toThrow('insufficient privileges');
    await expect(rejection).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.plan.update).not.toHaveBeenCalled();
  });

  it('lets a super admin edit a plan', async () => {
    const prisma = createMockPrisma();
    prisma.plan.update.mockResolvedValue({ id: 'PREMIUM', price: 12.9 });

    const service = new AdminService({ prisma: prisma as never });
    await service.updatePlan({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'PREMIUM' as never, {
      price: 12.9,
    });

    expect(prisma.plan.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'PREMIUM' },
      data: { price: 12.9 },
    });
  });
});

describe('AdminService analytics', () => {
  const members = [
    {
      category: 'Ménage',
      city: 'Tunis',
      matches: 89,
      plan: 'FREE',
      create_at: new Date('2026-06-04'),
    },
    {
      category: 'Ménage',
      city: 'Tunis',
      matches: 11,
      plan: 'PREMIUM',
      create_at: new Date('2026-07-02'),
    },
    {
      category: 'Plomberie',
      city: 'Ariana',
      matches: 8,
      plan: 'PREMIUM_PLUS',
      create_at: new Date('2026-07-09'),
    },
    { category: null, city: null, matches: 3, plan: 'FREE', create_at: new Date('2026-07-11') },
  ];

  const plans = [
    { id: 'FREE', name: 'Gratuit', price: 0, sort_order: 0 },
    { id: 'PREMIUM', name: 'Premium', price: 9.9, sort_order: 1 },
    { id: 'PREMIUM_PLUS', name: 'Premium+', price: 19.9, sort_order: 2 },
  ];

  function serviceWithData() {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue(members);
    prisma.plan.findMany.mockResolvedValue(plans);
    return new AdminService({ prisma: prisma as never });
  }

  it('estimates revenue as plan price times subscriber count, ignoring the free plan', async () => {
    const result = await serviceWithData().getAnalytics();

    expect(result.revenueByPlan).toEqual([
      { plan: 'Premium', users: 1, monthlyRevenue: 9.9 },
      { plan: 'Premium+', users: 1, monthlyRevenue: 19.9 },
    ]);
    expect(result.estimatedMonthlyRevenue).toBe(29.8);
  });

  it('builds a continuous cumulative platform timeline, filling gap months', async () => {
    const result = await serviceWithData().getAnalytics();

    // Signups land in 2026-06 (1 free) and 2026-07 (premium+premium_plus+free). July is a
    // single month here, so the running totals accumulate across the two present months.
    expect(result.platformTimeline).toEqual([
      { month: '2026-06', users: 1, revenue: 0 },
      { month: '2026-07', users: 4, revenue: 29.8 },
    ]);
  });

  it('carries the running total across months with no signups', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([
      { category: 'A', city: 'X', matches: 0, plan: 'PREMIUM', create_at: new Date('2026-01-10') },
      { category: 'A', city: 'X', matches: 0, plan: 'PREMIUM', create_at: new Date('2026-03-10') },
    ]);
    prisma.plan.findMany.mockResolvedValue(plans);

    const result = await new AdminService({ prisma: prisma as never }).getAnalytics();

    // February has no signups but must still appear, carrying January's cumulative total.
    expect(result.platformTimeline).toEqual([
      { month: '2026-01', users: 1, revenue: 9.9 },
      { month: '2026-02', users: 1, revenue: 9.9 },
      { month: '2026-03', users: 2, revenue: 19.8 },
    ]);
  });

  it('computes real month-over-month trends, including a diluted conversion', async () => {
    const prisma = createMockPrisma();
    // June: 4 paying members (100% conversion). July: 1 free member joins (0 matches, 0 revenue).
    prisma.user.findMany.mockResolvedValue([
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-01') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-02') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-03') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-04') },
      { category: 'A', city: 'X', matches: 0, plan: 'FREE', create_at: new Date('2026-07-01') },
    ]);
    prisma.plan.findMany.mockResolvedValue(plans);

    const result = await new AdminService({ prisma: prisma as never }).getAnalytics();

    expect(result.trends).toEqual({
      users: 25, // 4 → 5
      revenue: 0, // free member adds nothing
      matches: 0, // free member adds no matches
      conversion: -20, // 100% → 80%
    });
  });

  it('returns null trends when there is only one month of data', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([
      { category: 'A', city: 'X', matches: 1, plan: 'PREMIUM', create_at: new Date('2026-07-01') },
    ]);
    prisma.plan.findMany.mockResolvedValue(plans);

    const result = await new AdminService({ prisma: prisma as never }).getAnalytics();
    expect(result.trends).toBeNull();
    expect(result.planTrends).toEqual({ FREE: null, PREMIUM: null, PREMIUM_PLUS: null });
  });

  it('computes a per-plan subscriber trend, including a plan with no members at all', async () => {
    const prisma = createMockPrisma();
    // June: 4 new Premium subscribers. July: 1 new Free member, no new Premium/Premium+.
    prisma.user.findMany.mockResolvedValue([
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-01') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-02') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-03') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-04') },
      { category: 'A', city: 'X', matches: 0, plan: 'FREE', create_at: new Date('2026-07-01') },
    ]);
    prisma.plan.findMany.mockResolvedValue(plans);

    const result = await new AdminService({ prisma: prisma as never }).getAnalytics();

    expect(result.planTrends).toEqual({
      FREE: 100, // 0 → 1 subscriber
      PREMIUM: 0, // cumulative stayed at 4 both months
      PREMIUM_PLUS: 0, // no members at all — 0 → 0, not treated as "no data"
    });
  });

  it('groups signups by calendar month, oldest first', async () => {
    const result = await serviceWithData().getAnalytics();

    expect(result.signupsTimeline).toEqual([
      { month: '2026-06', users: 1 },
      { month: '2026-07', users: 3 },
    ]);
  });

  it('sums matches per category and skips members with no category', async () => {
    const result = await serviceWithData().getAnalytics();

    expect(result.matchesByCategory).toEqual([
      { name: 'Ménage', value: 100 },
      { name: 'Plomberie', value: 8 },
    ]);
    // Every member counts toward the total, including the uncategorised one.
    expect(result.totalMatches).toBe(111);
  });

  it('counts matches this month from the real Match table, not the denormalised counter', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue(members);
    prisma.plan.findMany.mockResolvedValue(plans);
    prisma.match.count.mockResolvedValue(42);

    const result = await new AdminService({ prisma: prisma as never }).getAnalytics();

    expect(result.matchesThisMonth).toBe(42);
    expect(prisma.match.count).toHaveBeenCalledWith({
      where: { matched_at: { gte: expect.any(Date) } },
    });
  });

  it('counts categories and cities, ignoring blanks', async () => {
    const result = await serviceWithData().getAnalytics();

    expect(result.categoryDistribution).toEqual([
      { name: 'Ménage', value: 2 },
      { name: 'Plomberie', value: 1 },
    ]);
    expect(result.topCities).toEqual([
      { city: 'Tunis', users: 2 },
      { city: 'Ariana', users: 1 },
    ]);
  });

  it('excludes admin accounts from analytics', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.plan.findMany.mockResolvedValue(plans);

    await new AdminService({ prisma: prisma as never }).getAnalytics();

    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: 'USER' });
  });
});

describe('AdminService password change', () => {
  async function hash(password: string) {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 10);
  }

  it('rejects a wrong current password without writing', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'a1', password: await hash('matchy2026') });

    const service = new AdminService({ prisma: prisma as never });

    // 403 rather than 401: a mistyped password must not trip the panel's session
    // interceptor and log the admin out.
    await expect(
      service.changePassword('a1', { currentPassword: 'nope', newPassword: 'newpass2026' }),
    ).rejects.toMatchObject({ message: 'invalid current password', statusCode: 403 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a short new password before touching the database', async () => {
    const prisma = createMockPrisma();
    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.changePassword('a1', { currentPassword: 'matchy2026', newPassword: 'short' }),
    ).rejects.toMatchObject({ message: 'password too short', statusCode: 400 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('stores the new password hashed, never in clear text', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'a1', password: await hash('matchy2026') });
    prisma.user.update.mockResolvedValue({ id: 'a1' });

    const service = new AdminService({ prisma: prisma as never });
    await service.changePassword('a1', {
      currentPassword: 'matchy2026',
      newPassword: 'newpass2026',
    });

    const stored = prisma.user.update.mock.calls[0][0].data.password;
    expect(stored).not.toBe('newpass2026');
    const bcrypt = await import('bcryptjs');
    await expect(bcrypt.compare('newpass2026', stored)).resolves.toBe(true);
  });

  describe('normalizeAdminUser', () => {
    it('falls back to sector, industry label, or activity sector when category is empty', () => {
      expect(
        normalizeAdminUser({
          id: 'u1',
          category: null,
          sector: 'Développement Web',
        }),
      ).toMatchObject({
        category: 'Développement Web',
      });

      expect(
        normalizeAdminUser({
          id: 'u2',
          category: null,
          sector: null,
          industry: 'tech_digital',
        }),
      ).toMatchObject({
        category: 'Technologie & Digital',
      });

      expect(
        normalizeAdminUser({
          id: 'u3',
          category: null,
          sector: null,
          industry: null,
          activity_sector: 'Artisanat',
        }),
      ).toMatchObject({
        category: 'Artisanat',
      });
    });

    it('falls back to looking_for when bio is empty', () => {
      expect(
        normalizeAdminUser({
          id: 'u1',
          bio: null,
          looking_for: 'Cherche partenaires SaaS',
        }),
      ).toMatchObject({
        bio: 'Cherche partenaires SaaS',
      });
    });

    it('falls back to service_type when job is empty', () => {
      expect(
        normalizeAdminUser({
          id: 'u1',
          job: null,
          service_type: 'Plombier',
        }),
      ).toMatchObject({
        job: 'Plombier',
      });
    });
  });
});
