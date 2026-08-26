import { I18nProvider } from '@/features/i18n/i18n-provider';
import notificationsReducer from '@/features/notifications/store/notifications-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationsDropdown } from './notifications-dropdown';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

function buildStore() {
  return configureStore({ reducer: { notifications: notificationsReducer } });
}

function renderWithProviders(ui: React.ReactElement, store = buildStore()) {
  return {
    store,
    ...render(
      <I18nProvider>
        <Provider store={store}>{ui}</Provider>
      </I18nProvider>,
    ),
  };
}

describe('NotificationsDropdown', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderWithProviders(<NotificationsDropdown isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('renders empty state and preferences link when open with no notifications', () => {
    const onClose = vi.fn();

    renderWithProviders(<NotificationsDropdown isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.getByText('Notification Settings')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Notification Settings'));
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/settings/notifications');
  });

  it('renders notification items and marks item as read when clicked', async () => {
    const store = buildStore();
    store.dispatch({
      type: 'notifications/fetch/fulfilled',
      payload: {
        notifications: [
          {
            id: 'notif-1',
            type: 'MATCH',
            data: { event_type: 'match', body: 'It is a match!' },
            read: false,
            created_at: new Date().toISOString(),
          },
        ],
        unread_count: 1,
        revisionAtStart: 0,
      },
    });

    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    vi.mocked(api.get).mockResolvedValue({ data: { notifications: [], unread_count: 0 } });
    const onClose = vi.fn();

    renderWithProviders(<NotificationsDropdown isOpen={true} onClose={onClose} />, store);

    expect(screen.getByText('New Match!')).toBeInTheDocument();
    expect(screen.getByText('It is a match!')).toBeInTheDocument();

    fireEvent.click(screen.getByText('New Match!'));
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/matches'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/notif-1/read'));
  });

  it('marks all notifications as read when clicking mark all read button', async () => {
    const store = buildStore();
    store.dispatch({
      type: 'notifications/fetch/fulfilled',
      payload: {
        notifications: [
          {
            id: 'notif-1',
            type: 'MESSAGE',
            data: { event_type: 'message', sender_name: 'Alex', preview: 'Hello!' },
            read: false,
            created_at: new Date().toISOString(),
          },
        ],
        unread_count: 1,
        revisionAtStart: 0,
      },
    });

    vi.mocked(api.post).mockResolvedValue({ data: undefined });
    vi.mocked(api.get).mockResolvedValue({ data: { notifications: [], unread_count: 0 } });

    renderWithProviders(<NotificationsDropdown isOpen={true} onClose={vi.fn()} />, store);

    const markAllBtn = screen.getByText('Mark all as read');
    fireEvent.click(markAllBtn);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/read-all'));
  });

  it('displays only first name and blurred image for free users on profile views', () => {
    const store = configureStore({
      reducer: {
        notifications: notificationsReducer,
        auth: (state = { user: { id: 'u1', plan: 'FREE' } }) => state,
      },
    });

    store.dispatch({
      type: 'notifications/fetch/fulfilled',
      payload: {
        notifications: [
          {
            id: 'notif-2',
            type: 'PROFILE_VIEW',
            data: {
              viewerId: 'user-2',
              viewerName: 'Jane Smith Doe',
              viewerImage: 'https://img.com/avatar.jpg',
            },
            read: false,
            created_at: new Date().toISOString(),
          },
        ],
        unread_count: 1,
        revisionAtStart: 0,
      },
    });

    const { container } = renderWithProviders(
      <NotificationsDropdown isOpen={true} onClose={vi.fn()} />,
      store,
    );

    expect(screen.getByText('Profile view')).toBeInTheDocument();
    expect(screen.getByText('Someone named "Jane" viewed your profile.')).toBeInTheDocument();
    const img = container.querySelector('img');
    expect(img).toHaveStyle({ filter: 'blur(5px)' });
  });

  it('displays full name for non-free users on profile views', () => {
    const store = configureStore({
      reducer: {
        notifications: notificationsReducer,
        auth: (state = { user: { id: 'u1', plan: 'VIP' } }) => state,
      },
    });

    store.dispatch({
      type: 'notifications/fetch/fulfilled',
      payload: {
        notifications: [
          {
            id: 'notif-3',
            type: 'PROFILE_VIEW',
            data: {
              viewerId: 'user-2',
              viewerName: 'Jane Smith Doe',
              viewerImage: 'https://img.com/avatar.jpg',
            },
            read: false,
            created_at: new Date().toISOString(),
          },
        ],
        unread_count: 1,
        revisionAtStart: 0,
      },
    });

    renderWithProviders(<NotificationsDropdown isOpen={true} onClose={vi.fn()} />, store);

    expect(
      screen.getByText('Someone named "Jane Smith Doe" viewed your profile.'),
    ).toBeInTheDocument();
  });
});
