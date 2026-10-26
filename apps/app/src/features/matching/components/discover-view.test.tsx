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

describe('DiscoverView — Distance Radius Control (HOME-002)', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders distance presets and custom slider toggle button', async () => {
    renderDiscoverView();

    const allPreset = await screen.findByTestId('distance-preset-all');
    expect(allPreset).toBeInTheDocument();
    expect(screen.getByTestId('distance-preset-5')).toBeInTheDocument();
    expect(screen.getByTestId('distance-preset-10')).toBeInTheDocument();
    expect(screen.getByTestId('distance-preset-25')).toBeInTheDocument();
    expect(screen.getByTestId('distance-preset-50')).toBeInTheDocument();
    expect(screen.getByTestId('distance-preset-100')).toBeInTheDocument();
    expect(screen.getByTestId('distance-slider-toggle')).toBeInTheDocument();
  });

  it('filters swipe feed when a distance preset is selected', async () => {
    renderDiscoverView();

    const preset25 = await screen.findByTestId('distance-preset-25');
    fireEvent.click(preset25);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/discovery/swipe-feed',
        expect.objectContaining({
          params: expect.objectContaining({
            maxDistanceKm: 25,
          }),
        }),
      );
    });

    expect(window.localStorage.getItem('matchy_discovery_radius_km')).toBe('25');
  });

  it('opens slider popover and allows custom radius adjustment', async () => {
    renderDiscoverView();

    const toggle = await screen.findByTestId('distance-slider-toggle');
    fireEvent.click(toggle);

    const slider = await screen.findByTestId('distance-range-slider');
    expect(slider).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '15' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/discovery/swipe-feed',
        expect.objectContaining({
          params: expect.objectContaining({
            maxDistanceKm: 15,
          }),
        }),
      );
    });

    expect(window.localStorage.getItem('matchy_discovery_radius_km')).toBe('15');
  });

  it('resets distance radius filter when clicking reset button', async () => {
    renderDiscoverView();

    // Select 50km first
    fireEvent.click(await screen.findByTestId('distance-preset-50'));

    // Open popover and click reset
    fireEvent.click(screen.getByTestId('distance-slider-toggle'));
    const resetBtn = await screen.findByTestId('distance-reset-button');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/discovery/swipe-feed',
        expect.objectContaining({
          params: expect.not.objectContaining({
            maxDistanceKm: 50,
          }),
        }),
      );
    });

    expect(window.localStorage.getItem('matchy_discovery_radius_km')).toBeNull();
  });
});
