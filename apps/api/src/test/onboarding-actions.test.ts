import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';

function signAccessToken(userId: string) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, 'test-access-token-secret');
}

const activeUser = { id: 'user-1', status: 'ACTIVE' };

describe('GET /api/v1/users/me/profile', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/users/me/profile' });

    expect(response.statusCode).toBe(401);
  });

  it('returns onboardingCompleted: false and never leaks the password field', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            ...activeUser,
            name: 'Jane Doe',
            job: null,
            interests: [],
            onboarding_completed_at: null,
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/profile',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ onboardingCompleted: false });
    expect(response.body).not.toContain('password');
  });
});

describe('PATCH /api/v1/users/me/profile', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('saves only the fields sent for this step', async () => {
    const updateMock = vi.fn().mockResolvedValue({
      ...activeUser,
      job: 'Électricien',
      bio: 'Bio text',
      interests: [],
      onboarding_completed_at: null,
    });
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(activeUser),
          update: updateMock,
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/profile',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: { job: 'Électricien', bio: 'Bio text' },
    });

    expect(response.statusCode).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { job: 'Électricien', bio: 'Bio text' },
      }),
    );
  });
});

describe('POST /api/v1/users/me/profile/complete', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('rejects with 400 onboarding_incomplete when required fields are missing', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            ...activeUser,
            name: 'Jane Doe',
            job: null,
            auth_provider: 'google',
            image: null,
            profile_type: 'INDIVIDUAL',
            interests: [],
            selected_goals: [],
            offer_service: false,
            service_type: null,
            price: null,
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile/complete',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'onboarding_incomplete' });
  });

  it('completes onboarding once every required field is present', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            ...activeUser,
            name: 'Jane Doe',
            job: 'Électricien',
            auth_provider: 'google',
            image: null,
            profile_type: 'INDIVIDUAL',
            interests: ['Bricolage'],
            selected_goals: ['Trouver un job'],
            offer_service: false,
            service_type: null,
            price: null,
          }),
          update: vi.fn().mockResolvedValue({
            ...activeUser,
            job: 'Électricien',
            interests: ['Bricolage'],
            onboarding_completed_at: new Date('2026-01-01'),
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile/complete',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ onboardingCompleted: true });
  });
});
