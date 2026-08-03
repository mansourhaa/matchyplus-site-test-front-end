import { logout, resetAuthState } from '@/features/auth/store/auth-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import notificationsReducer, {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications-slice';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

function buildStore() {
  return configureStore({ reducer: { notifications: notificationsReducer } });
}

const listResponse = {
  notifications: [
    {
      id: 'notif-1',
      type: 'PROFILE_VIEW' as const,
      data: { viewerId: 'user-2', viewerName: 'Jane Doe' },
      read: false,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'notif-2',
      type: 'PROFILE_VIEW' as const,
      data: { viewerId: 'user-3', viewerName: 'John Doe' },
      read: true,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  unread_count: 1,
};

describe('notifications-slice', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetchNotifications populates the list and unread count from GET /notifications', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: listResponse });
    const store = buildStore();

    await store.dispatch(fetchNotifications());

    expect(api.get).toHaveBeenCalledWith('/notifications');
    expect(store.getState().notifications.items).toEqual(listResponse.notifications);
    expect(store.getState().notifications.unreadCount).toBe(1);
  });

  it('markNotificationRead flips the item locally and decrements the unread count', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: listResponse });
    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    const store = buildStore();
    await store.dispatch(fetchNotifications());

    await store.dispatch(markNotificationRead('notif-1'));

    expect(api.post).toHaveBeenCalledWith('/notifications/notif-1/read');
    expect(store.getState().notifications.items[0].read).toBe(true);
    expect(store.getState().notifications.unreadCount).toBe(0);
  });

  it('markAllNotificationsRead flips every item locally and zeroes the unread count', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: listResponse });
    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    const store = buildStore();
    await store.dispatch(fetchNotifications());

    await store.dispatch(markAllNotificationsRead());

    expect(api.post).toHaveBeenCalledWith('/notifications/read-all');
    expect(store.getState().notifications.items.every((item) => item.read)).toBe(true);
    expect(store.getState().notifications.unreadCount).toBe(0);
  });

  it('discards a fetch response entirely when a mark-read commits while it was still in flight', async () => {
    let resolveFetch!: (value: { data: typeof listResponse }) => void;
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    const store = buildStore();

    // Dispatched while state.revision is still 0 — this is what the fetch captures as
    // revisionAtStart, before its GET has resolved.
    const fetchPromise = store.dispatch(fetchNotifications());

    // A mark-read commits (bumping revision to 1) before the GET above resolves.
    await store.dispatch(markNotificationRead('notif-1'));
    expect(store.getState().notifications.revision).toBe(1);

    // The GET finally resolves with a stale snapshot (captured before the mark-read).
    resolveFetch({ data: listResponse });
    await fetchPromise;

    // revisionAtStart (0) no longer matches the current revision (1) — the response is
    // dropped rather than applied, so it can neither resurrect notif-1 as unread nor
    // overwrite unreadCount with a stale total.
    expect(store.getState().notifications.items).toEqual([]);
    expect(store.getState().notifications.unreadCount).toBe(0);
    expect(store.getState().notifications.loading).toBe(false);
  });

  it('applies a fetch dispatched after mark-all-read normally, trusting the server snapshot directly', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: listResponse });
    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    const store = buildStore();
    await store.dispatch(fetchNotifications());
    await store.dispatch(markAllNotificationsRead());
    expect(store.getState().notifications.unreadCount).toBe(0);

    // A fresh fetch dispatched after the mark-all committed — its revisionAtStart matches
    // the current revision, so it's trusted directly (a real server response at this
    // point would already reflect the mark-all, unlike this canned mock).
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { notifications: listResponse.notifications, unread_count: 0 },
    });
    await store.dispatch(fetchNotifications());

    expect(store.getState().notifications.unreadCount).toBe(0);
  });

  it('clears items, unread count, and error on logout, and bumps revision so an old in-flight fetch cannot resurface after it', async () => {
    let resolveFetch!: (value: { data: typeof listResponse }) => void;
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const store = buildStore();

    // A fetch for the outgoing user is still in flight (revisionAtStart captured as 0).
    const fetchPromise = store.dispatch(fetchNotifications());

    store.dispatch(logout.fulfilled(undefined, 'req-1', undefined));

    expect(store.getState().notifications).toMatchObject({
      items: [],
      unreadCount: 0,
      error: null,
      revision: 1,
    });

    // The stale GET for the previous account resolves after logout — it must not
    // repopulate the now-logged-out (or next-logged-in) state with the old user's data.
    resolveFetch({ data: listResponse });
    await fetchPromise;

    expect(store.getState().notifications.items).toEqual([]);
    expect(store.getState().notifications.unreadCount).toBe(0);
  });

  it('clears notifications on resetAuthState (a failed token refresh), the same as an explicit logout', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: listResponse });
    const store = buildStore();
    await store.dispatch(fetchNotifications());
    expect(store.getState().notifications.items).toHaveLength(2);

    store.dispatch(resetAuthState());

    expect(store.getState().notifications).toMatchObject({
      items: [],
      unreadCount: 0,
      revision: 1,
    });
  });
});
