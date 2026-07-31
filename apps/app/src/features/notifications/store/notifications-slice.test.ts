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
});
