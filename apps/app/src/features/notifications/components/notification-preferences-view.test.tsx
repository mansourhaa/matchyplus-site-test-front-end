import { I18nProvider } from '@/features/i18n/i18n-provider';
import notificationsReducer from '@/features/notifications/store/notifications-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationPreferencesView } from './notification-preferences-view';

const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
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
  views: false,
  email: false,
};

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

describe('NotificationPreferencesView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders preference items and active service count banner', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { preferences: defaultPreferences } });
    const store = buildStore();

    renderWithProviders(<NotificationPreferencesView />, store);

    expect(screen.getByText('Master Notifications')).toBeInTheDocument();
    expect(screen.getByText('New Matches')).toBeInTheDocument();
    expect(screen.getByText('New Messages')).toBeInTheDocument();
    expect(screen.getByText('Profile Views')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();

    // Coming soon / extra items are hidden/commented out
    expect(screen.queryByText('Push Notifications')).not.toBeInTheDocument();
    expect(screen.queryByText('Promotions & Offers')).not.toBeInTheDocument();
  });

  it('toggles all_enabled preference', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { preferences: defaultPreferences } });
    vi.mocked(api.put).mockResolvedValue({
      data: { preferences: { ...defaultPreferences, all_enabled: false } },
    });
    const store = buildStore();

    renderWithProviders(<NotificationPreferencesView />, store);

    await screen.findByText('Master Notifications');
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/notifications/preferences', { all_enabled: false });
    });
  });

  it('toggles matches preference', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { preferences: defaultPreferences } });
    vi.mocked(api.put).mockResolvedValue({
      data: { preferences: { ...defaultPreferences, matches: false } },
    });
    const store = buildStore();

    renderWithProviders(<NotificationPreferencesView />, store);

    await screen.findByText('New Matches');
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/notifications/preferences', { matches: false });
    });
  });

  it('toggles messages preference', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { preferences: defaultPreferences } });
    vi.mocked(api.put).mockResolvedValue({
      data: { preferences: { ...defaultPreferences, messages: false } },
    });
    const store = buildStore();

    renderWithProviders(<NotificationPreferencesView />, store);

    await screen.findByText('New Messages');
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[2]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/notifications/preferences', { messages: false });
    });
  });

  it('toggles views preference', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { preferences: defaultPreferences } });
    vi.mocked(api.put).mockResolvedValue({
      data: { preferences: { ...defaultPreferences, views: true } },
    });
    const store = buildStore();

    renderWithProviders(<NotificationPreferencesView />, store);

    await screen.findByText('Profile Views');
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[3]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/notifications/preferences', { views: true });
    });
  });

  it('toggles email preference', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { preferences: defaultPreferences } });
    vi.mocked(api.put).mockResolvedValue({
      data: { preferences: { ...defaultPreferences, email: true } },
    });
    const store = buildStore();

    renderWithProviders(<NotificationPreferencesView />, store);

    await screen.findByText('Email Notifications');
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[4]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/notifications/preferences', { email: true });
    });
  });
});
