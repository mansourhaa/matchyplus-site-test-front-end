import favoritesReducer from '@/features/favorites/store/favorites-slice';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import matchingReducer from '@/features/matching/store/matching-slice';
import notificationsReducer from '@/features/notifications/store/notifications-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscoverView } from './discover-view';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/features/location/location-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/location/location-context')>();
  return {
    ...actual,
    useLocationGate: () => ({
      latitude: 36.8,
      longitude: 10.1,
      locationSynced: true,
      permissionDenied: false,
      locationRequired: false,
      activating: false,
      accessMessage: null,
      requestBrowserLocation: vi.fn(),
    }),
    useAutoCaptureGrantedLocation: vi.fn(),
  };
});

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

const mockFeedProfile = {
  id: 'user-profile-1',
  name: 'Amine Ben Ali',
  image: null,
  video: null,
  bio: 'Développeur Full Stack',
  job: 'Développeur Web',
  category: 'Informatique / Tech',
  city: 'Tunis',
  interests: ['React', 'TypeScript'],
  activity_sector: 'Informatique / Tech',
  service_type: 'Développement Web',
  rating: 4.9,
  distance_km: 3.5,
  match_score: 92,
  match_group: 1,
  match_type_label: 'Top Match',
  confidence: 'HIGH',
  compatibility: [],
  liked_me: false,
};

function renderDiscoverView() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/discovery/swipe-feed') {
      return Promise.resolve({
        data: {
          profiles: [mockFeedProfile],
          quota: {
            plan: 'FREE',
            unlimited: false,
            used: 0,
            limit: 20,
            remaining: 20,
            resets_at: 'midnight_utc',
          },
        },
      });
    }
    if (url === '/discovery/quota') {
      return Promise.resolve({
        data: {
          plan: 'FREE',
          unlimited: false,
          used: 0,
          limit: 20,
          remaining: 20,
          resets_at: 'midnight_utc',
        },
      });
    }
    if (url === '/discovery/sectors') {
      return Promise.resolve({
        data: {
          sectors: ['Informatique / Tech', 'BTP / Artisanat', 'Transport', 'Plomberie'],
        },
      });
    }
    if (url === '/favorites/ids') return Promise.resolve({ data: { favorite_ids: [] } });
    if (url === '/notifications')
      return Promise.resolve({ data: { notifications: [], unreadCount: 0 } });
    return Promise.reject(new Error(`unexpected get request: ${url}`));
  });

  const store = configureStore({
    reducer: {
      matching: matchingReducer,
      favorites: favoritesReducer,
      notifications: notificationsReducer,
    },
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <DiscoverView />
      </I18nProvider>
    </Provider>,
  );
}

describe('DiscoverView — Sector Filter (HOME-001)', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders sector filter pills with "Tous" selected by default', async () => {
    renderDiscoverView();

    const allPill = await screen.findByTestId('sector-pill-all');
    expect(allPill).toBeInTheDocument();
    expect(allPill).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByTestId('sector-pill-Informatique / Tech')).toBeInTheDocument();
    expect(screen.getByTestId('sector-pill-BTP / Artisanat')).toBeInTheDocument();

    const sectorToggle = screen.getByTestId('sector-search-toggle');
    expect(sectorToggle).toBeInTheDocument();
    expect(sectorToggle).toHaveTextContent('Secteur');
  });

  it('filters swipe feed when a sector pill is clicked', async () => {
    renderDiscoverView();

    const techPill = await screen.findByTestId('sector-pill-Informatique / Tech');
    fireEvent.click(techPill);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/discovery/swipe-feed',
        expect.objectContaining({
          params: expect.objectContaining({
            sector: 'Informatique / Tech',
          }),
        }),
      );
    });

    expect(techPill).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('sector-pill-all')).toHaveAttribute('aria-selected', 'false');
  });

  it('resets sector filter when clicking "Tous" or clicking the active sector pill again', async () => {
    renderDiscoverView();

    const techPill = await screen.findByTestId('sector-pill-Informatique / Tech');
    fireEvent.click(techPill);

    await waitFor(() => {
      expect(techPill).toHaveAttribute('aria-selected', 'true');
    });

    // Clicking "Tous" resets
    const allPill = screen.getByTestId('sector-pill-all');
    fireEvent.click(allPill);

    await waitFor(() => {
      expect(allPill).toHaveAttribute('aria-selected', 'true');
      expect(techPill).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('opens sector dropdown when clicking the Secteur pill trigger and allows searching', async () => {
    renderDiscoverView();

    const sectorToggle = await screen.findByTestId('sector-search-toggle');
    fireEvent.click(sectorToggle);

    const dropdown = screen.getByTestId('sector-search-dropdown');
    expect(dropdown).toBeInTheDocument();

    const searchInput = screen.getByTestId('sector-search-input');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Plomb' } });

    const plomberieOption = await screen.findByTestId('sector-pill-Plomberie');
    expect(plomberieOption).toBeInTheDocument();

    fireEvent.click(plomberieOption);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/discovery/swipe-feed',
        expect.objectContaining({
          params: expect.objectContaining({
            sector: 'Plomberie',
          }),
        }),
      );
    });
  });
});
