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

  it('discards a stale fetch response — including its loading flag — when a mark-read commits while it was still in flight', async () => {
    let resolveStaleFetch!: (value: { data: typeof listResponse }) => void;
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStaleFetch = resolve;
      }),
    );
    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    const store = buildStore();

    // Dispatched while state.revision is still 0 — this is what the fetch captures as
    // revisionAtStart, before its GET has resolved.
    const stalePromise = store.dispatch(fetchNotifications());

    // A mark-read commits (bumping revision to 1) before the GET above resolves.
    await store.dispatch(markNotificationRead('notif-1'));
    expect(store.getState().notifications.revision).toBe(1);

    // The GET finally resolves with a stale snapshot (captured before the mark-read).
    // Its loading=false is dropped too — a fresher fetch (dispatched right after the
    // mark, see notifications-view.tsx) is what will actually settle loading, and this
    // stale settle must not flip it to false out from under that still-pending fetch.
    resolveStaleFetch({ data: listResponse });
    await stalePromise;

    expect(store.getState().notifications.items).toEqual([]);
    expect(store.getState().notifications.unreadCount).toBe(0);
    expect(store.getState().notifications.loading).toBe(true);

    // The fresh fetch that follows the mark captures the now-current revision and
    // applies (and settles loading) cleanly.
    vi.mocked(api.get).mockResolvedValueOnce({ data: { notifications: [], unread_count: 0 } });
    await store.dispatch(fetchNotifications());

    expect(store.getState().notifications.loading).toBe(false);
  });

  it('discards a stale fetch rejection the same way — a 401 from a superseded request must not set error', async () => {
    let rejectStaleFetch!: (reason: unknown) => void;
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectStaleFetch = reject;
      }),
    );
    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    const store = buildStore();

    const stalePromise = store.dispatch(fetchNotifications());
    await store.dispatch(markNotificationRead('notif-1'));
    expect(store.getState().notifications.revision).toBe(1);

    rejectStaleFetch(new Error('network error'));
    await stalePromise;

    expect(store.getState().notifications.error).toBeNull();
  });

  it('ignores a mark-read that resolves after the session was reset while it was in flight', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: listResponse });
    const store = buildStore();
    await store.dispatch(fetchNotifications());

    let resolveMark!: (value: { data: undefined }) => void;
    vi.mocked(api.post).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMark = resolve;
      }),
    );
    const markPromise = store.dispatch(markNotificationRead('notif-1'));

    store.dispatch(logout.fulfilled(undefined, 'req-1', undefined));
    expect(store.getState().notifications.revision).toBe(1);

    resolveMark({ data: undefined });
    await markPromise;

    // The mark's revisionAtStart (0) no longer matches — applying it now (including the
    // revision bump, which would wrongly invalidate the next session's own in-flight
    // fetch) would be acting on a session that no longer exists.
    expect(store.getState().notifications.revision).toBe(1);
    expect(store.getState().notifications.items).toEqual([]);
  });

  it('ignores a mark-all-read that resolves after the session was reset while it was in flight', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: listResponse });
    const store = buildStore();
    await store.dispatch(fetchNotifications());

    let resolveMarkAll!: (value: { data: undefined }) => void;
    vi.mocked(api.post).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMarkAll = resolve;
      }),
    );
    const markAllPromise = store.dispatch(markAllNotificationsRead());

    store.dispatch(logout.fulfilled(undefined, 'req-1', undefined));
    expect(store.getState().notifications.revision).toBe(1);

    resolveMarkAll({ data: undefined });
    await markAllPromise;

    expect(store.getState().notifications.revision).toBe(1);
    expect(store.getState().notifications.items).toEqual([]);
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
