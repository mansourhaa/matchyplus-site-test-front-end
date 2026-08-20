import { adminApi } from '@/lib/admin-api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AdminCreateUserInput } from '../types';
import reducer, { createAdminUser } from './admin-users-slice';

function buildStore() {
  return configureStore({ reducer: { adminUsers: reducer } });
}

const INPUT: AdminCreateUserInput = {
  name: 'Amine Ben Salah',
  phone: '20123456',
  password: 'Matchy2026!',
  profileType: 'INDIVIDUAL',
  job: 'Plombier',
  interests: ['Plomberie'],
  selectedGoals: ['Trouver un job'],
  image: 'data:image/png;base64,aaaa',
};

describe('admin-users-slice createAdminUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prepends the created user and bumps the total on success', async () => {
    vi.spyOn(adminApi, 'post').mockResolvedValue({
      data: { user: { id: 'u1', name: 'Amine Ben Salah' } },
    });
    const store = buildStore();

    await store.dispatch(createAdminUser(INPUT));

    const state = store.getState().adminUsers;
    expect(state.users).toEqual([{ id: 'u1', name: 'Amine Ben Salah' }]);
    expect(state.total).toBe(1);
    expect(state.creatingUser).toBe(false);
    expect(state.error).toBeNull();
  });

  it('surfaces the backend message and leaves the list untouched on failure', async () => {
    vi.spyOn(adminApi, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'phone already registered' } },
    });
    const store = buildStore();

    await store.dispatch(createAdminUser(INPUT));

    const state = store.getState().adminUsers;
    expect(state.users).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.creatingUser).toBe(false);
    expect(state.error).toBe('phone already registered');
  });

  it('falls back to a generic message when the failure carries no server message', async () => {
    vi.spyOn(adminApi, 'post').mockRejectedValue(new Error('network down'));
    const store = buildStore();

    await store.dispatch(createAdminUser(INPUT));

    expect(store.getState().adminUsers.error).toBe("Impossible de créer l'utilisateur.");
  });
});
