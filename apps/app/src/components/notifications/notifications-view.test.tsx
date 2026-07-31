import notificationsReducer from '@/features/notifications/store/notifications-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationsView } from './notifications-view';

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

describe('NotificationsView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no notifications', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { notifications: [], unread_count: 0 },
    });
    const store = buildStore();

    render(
      <Provider store={store}>
        <NotificationsView />
      </Provider>,
    );

    expect(await screen.findByText('Aucune notification pour l’instant')).toBeInTheDocument();
  });

  it('renders a profile-view notification and lets the user mark it as read', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        notifications: [
          {
            id: 'notif-1',
            type: 'PROFILE_VIEW',
            data: { viewerId: 'user-2', viewerName: 'Jane', viewerImage: null },
            read: false,
            created_at: new Date().toISOString(),
          },
        ],
        unread_count: 1,
      },
    });
    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    const store = buildStore();

    render(
      <Provider store={store}>
        <NotificationsView />
      </Provider>,
    );

    await screen.findByText('Vue de profil');
    const entry = await screen.findByText('Quelqu\'un nommé "Jane" a consulté votre profil.');
    fireEvent.click(entry);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/notif-1/read'));
  });

  it('marks every notification as read from the header action', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        notifications: [
          {
            id: 'notif-1',
            type: 'PROFILE_VIEW',
            data: { viewerId: 'user-2', viewerName: 'Jane', viewerImage: null },
            read: false,
            created_at: new Date().toISOString(),
          },
        ],
        unread_count: 1,
      },
    });
    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    const store = buildStore();

    render(
      <Provider store={store}>
        <NotificationsView />
      </Provider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Tout marquer comme lu' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/read-all'));
  });
});
