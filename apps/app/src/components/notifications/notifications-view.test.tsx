import notificationsReducer from '@/features/notifications/store/notifications-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationsView } from './notifications-view';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    },
  };
});

const defaultPreferences = {
  all_enabled: true,
  matches: true,
  messages: true,
  views: true,
  email: true,
};

function mockListAndPreferences(list: { notifications: unknown[]; unread_count: number }) {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (String(url).includes('/preferences')) {
      return { data: { preferences: defaultPreferences } };
    }
    return { data: list };
  });
}

function buildStore() {
  return configureStore({ reducer: { notifications: notificationsReducer } });
}

describe('NotificationsView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no notifications', async () => {
    mockListAndPreferences({ notifications: [], unread_count: 0 });
    const store = buildStore();

    render(
      <Provider store={store}>
        <NotificationsView />
      </Provider>,
    );

    expect(await screen.findByText('Aucune notification pour l’instant')).toBeInTheDocument();
    expect(await screen.findByText('Préférences')).toBeInTheDocument();
  });

  it('renders a profile-view notification and lets the user mark it as read', async () => {
    mockListAndPreferences({
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
    // Mount fires list + preferences; mark triggers a follow-up list fetch.
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
  });

  it('keeps the already-loaded list visible when a background refetch fails', async () => {
    const store = buildStore();
    store.dispatch({
      type: 'notifications/fetch/fulfilled',
      payload: {
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
        // Matches the store's initial revision (0) — the reducer discards a fetch
        // response whose revisionAtStart doesn't match the current revision, so this
        // preload must look like a fetch dispatched before any mark action ran.
        revisionAtStart: 0,
      },
    });
    vi.mocked(api.get).mockRejectedValue(new Error('network error'));

    render(
      <Provider store={store}>
        <NotificationsView />
      </Provider>,
    );

    expect(screen.getByText('Vue de profil')).toBeInTheDocument();
    expect(
      await screen.findByText(/Impossible d.actualiser vos notifications/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Aucune notification pour l’instant')).not.toBeInTheDocument();
  });

  it('marks every notification as read from the header action', async () => {
    mockListAndPreferences({
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
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
  });
});
