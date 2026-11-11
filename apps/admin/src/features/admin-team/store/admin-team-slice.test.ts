import { adminApi } from '@/lib/admin-api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AdminCreateTeamMemberInput, AdminTeamMember } from '../types';
import reducer, {
  createAdminTeamMember,
  fetchAdminTeam,
  updateAdminTeamMember,
  updateAdminTeamMemberStatus,
} from './admin-team-slice';

function buildStore() {
  return configureStore({ reducer: { adminTeam: reducer } });
}

const INPUT: AdminCreateTeamMemberInput = {
  name: 'Sami Ben Ali',
  email: 'sami@matchyplus.tn',
  password: 'Matchy2026!',
  role: 'SUPPORT',
};

const MEMBER: AdminTeamMember = {
  id: 't1',
  name: 'Sami Ben Ali',
  email: 'sami@matchyplus.tn',
  phone: null,
  role: 'SUPPORT',
  status: 'ACTIVE',
  last_login: null,
  create_at: '2026-01-01T00:00:00.000Z',
};

describe('admin-team-slice fetchAdminTeam', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores the fetched team and total', async () => {
    vi.spyOn(adminApi, 'get').mockResolvedValue({ data: { team: [MEMBER], total: 1 } });
    const store = buildStore();

    await store.dispatch(fetchAdminTeam({ search: '' }));

    const state = store.getState().adminTeam;
    expect(state.members).toEqual([MEMBER]);
    expect(state.total).toBe(1);
    expect(state.loading).toBe(false);
  });

  it('surfaces an error message on failure', async () => {
    vi.spyOn(adminApi, 'get').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'insufficient privileges' } },
    });
    const store = buildStore();

    await store.dispatch(fetchAdminTeam({ search: '' }));

    expect(store.getState().adminTeam.error).toBe('insufficient privileges');
  });
});

describe('admin-team-slice createAdminTeamMember', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prepends the created member and bumps the total on success', async () => {
    vi.spyOn(adminApi, 'post').mockResolvedValue({ data: { member: MEMBER } });
    const store = buildStore();

    await store.dispatch(createAdminTeamMember(INPUT));

    const state = store.getState().adminTeam;
    expect(state.members).toEqual([MEMBER]);
    expect(state.total).toBe(1);
    expect(state.creating).toBe(false);
    expect(state.error).toBeNull();
  });

  it('surfaces the backend message on failure', async () => {
    vi.spyOn(adminApi, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'email already registered' } },
    });
    const store = buildStore();

    await store.dispatch(createAdminTeamMember(INPUT));

    const state = store.getState().adminTeam;
    expect(state.members).toEqual([]);
    expect(state.error).toBe('email already registered');
  });
});

describe('admin-team-slice updateAdminTeamMember / updateAdminTeamMemberStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces the matching member in place after an edit', async () => {
    vi.spyOn(adminApi, 'put').mockResolvedValue({
      data: { user: { ...MEMBER, name: 'Sami Ben Ali Jr.' } },
    });
    const store = configureStore({
      reducer: { adminTeam: reducer },
      preloadedState: {
        adminTeam: { ...reducer(undefined, { type: '@@init' }), members: [MEMBER] },
      },
    });

    await store.dispatch(
      updateAdminTeamMember({ id: 't1', changes: { name: 'Sami Ben Ali Jr.' } }),
    );

    expect(store.getState().adminTeam.members[0].name).toBe('Sami Ben Ali Jr.');
  });

  it('replaces the matching member in place after a status change', async () => {
    vi.spyOn(adminApi, 'patch').mockResolvedValue({
      data: { user: { ...MEMBER, status: 'BANNED' } },
    });
    const store = configureStore({
      reducer: { adminTeam: reducer },
      preloadedState: {
        adminTeam: { ...reducer(undefined, { type: '@@init' }), members: [MEMBER] },
      },
    });

    await store.dispatch(updateAdminTeamMemberStatus({ id: 't1', status: 'BANNED' }));

    expect(store.getState().adminTeam.members[0].status).toBe('BANNED');
  });

  it('surfaces the backend message when a status change fails', async () => {
    vi.spyOn(adminApi, 'patch').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'insufficient privileges' } },
    });
    const store = buildStore();

    await store.dispatch(updateAdminTeamMemberStatus({ id: 't1', status: 'BANNED' }));

    expect(store.getState().adminTeam.error).toBe('insufficient privileges');
  });
});
