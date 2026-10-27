import favoritesReducer from '@/features/favorites/store/favorites-slice';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import matchingReducer from '@/features/matching/store/matching-slice';
import notificationsReducer from '@/features/notifications/store/notifications-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscoverView } from './discover-view';

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => mockSearchParams,
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

function renderDiscoverView(initialProfiles = [mockFeedProfile]) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/discovery/swipe-feed') {
      return Promise.resolve({
        data: {
          profiles: initialProfiles,
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

describe('DiscoverView — Upgraded Filter System', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Structure & Category Chips', () => {
    it('renders single row of category chips with "Tout" selected and icons', async () => {
      renderDiscoverView();

      const allPill = await screen.findByTestId('sector-pill-all');
      expect(allPill).toBeInTheDocument();
      expect(allPill).toHaveAttribute('aria-selected', 'true');

      const techPill = screen.getByTestId('sector-pill-Informatique / Tech');
      expect(techPill).toBeInTheDocument();
      expect(techPill).toHaveAttribute('aria-selected', 'false');

      const sectorToggle = screen.getByTestId('sector-search-toggle');
      expect(sectorToggle).toBeInTheDocument();
      expect(sectorToggle).toHaveTextContent('Secteur');

      const filtresBtn = screen.getByTestId('discover-filters-trigger-btn');
      expect(filtresBtn).toBeInTheDocument();
      expect(filtresBtn).toHaveTextContent('Filtres');
    });

    it('filters swipe feed when a sector chip is clicked and displays active chip', async () => {
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

      // Removable chip displayed under the bar
      const activeSectorChip = screen.getByTestId('active-chip-sector');
      expect(activeSectorChip).toBeInTheDocument();
      expect(activeSectorChip).toHaveTextContent('Informatique / Tech');
    });

    it('resets sector when clicking active removable chip or clicking "Tout"', async () => {
      renderDiscoverView();

      const techPill = await screen.findByTestId('sector-pill-Informatique / Tech');
      fireEvent.click(techPill);

      await waitFor(() => {
        expect(techPill).toHaveAttribute('aria-selected', 'true');
      });

      const activeSectorChip = screen.getByTestId('active-chip-sector');
      fireEvent.click(activeSectorChip);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/discovery/swipe-feed',
          expect.objectContaining({
            params: expect.objectContaining({
              sector: undefined,
            }),
          }),
        );
      });

      expect(screen.getByTestId('sector-pill-all')).toHaveAttribute('aria-selected', 'true');
      expect(techPill).toHaveAttribute('aria-selected', 'false');
    });

    it('opens portaled sector search dropdown and selects a sector from dropdown', async () => {
      renderDiscoverView();

      const sectorToggle = screen.getByTestId('sector-search-toggle');
      fireEvent.click(sectorToggle);

      const dropdown = screen.getByTestId('sector-search-dropdown');
      expect(dropdown).toBeInTheDocument();

      const searchInput = screen.getByTestId('sector-search-input');
      expect(searchInput).toBeInTheDocument();

      const plomberieBtn = within(dropdown).getByTestId('sector-pill-Plomberie');
      fireEvent.click(plomberieBtn);

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

      // Dropdown closes after selection
      expect(screen.queryByTestId('sector-search-dropdown')).not.toBeInTheDocument();
      expect(screen.getByTestId('active-chip-sector')).toBeInTheDocument();
    });
  });

  describe('2. Unified Filtres Panel & Badge', () => {
    it('opens Filtres sheet when trigger button is clicked', async () => {
      renderDiscoverView();

      const filtresBtn = await screen.findByTestId('discover-filters-trigger-btn');
      fireEvent.click(filtresBtn);

      const sheet = screen.getByTestId('discover-filters-sheet');
      expect(sheet).toBeInTheDocument();
      expect(within(sheet).getByText('Rayon de distance')).toBeInTheDocument();
      expect(within(sheet).queryByText('Disponible uniquement')).not.toBeInTheDocument();
      expect(within(sheet).queryByText('Note minimale')).not.toBeInTheDocument();
      expect(within(sheet).queryByText('Trier par')).not.toBeInTheDocument();
    });

    it('adjusting distance slider updates feed query and displays active badge on button', async () => {
      renderDiscoverView();

      const filtresBtn = await screen.findByTestId('discover-filters-trigger-btn');
      fireEvent.click(filtresBtn);

      const sheet = screen.getByTestId('discover-filters-sheet');
      const slider = within(sheet).getByTestId('discover-filter-distance-slider');
      fireEvent.change(slider, { target: { value: '25' } });

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

      // Badge on Filtres button displays '1'
      const badge = screen.getByTestId('discover-filters-count-badge');
      expect(badge).toHaveTextContent('1');

      // Removable distance chip under bar
      const activeDistanceChip = screen.getByTestId('active-chip-distance');
      expect(activeDistanceChip).toHaveTextContent('≤ 25 km');
    });

    it('clicking quick preset chip in sheet updates feed query', async () => {
      renderDiscoverView();

      const filtresBtn = await screen.findByTestId('discover-filters-trigger-btn');
      fireEvent.click(filtresBtn);

      const sheet = screen.getByTestId('discover-filters-sheet');
      const chip50 = within(sheet).getByTestId('discover-filter-distance-chip-50');
      fireEvent.click(chip50);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/discovery/swipe-feed',
          expect.objectContaining({
            params: expect.objectContaining({
              maxDistanceKm: 50,
            }),
          }),
        );
      });

      const badge = screen.getByTestId('discover-filters-count-badge');
      expect(badge).toHaveTextContent('1');
      expect(screen.getByTestId('active-chip-distance')).toHaveTextContent('≤ 50 km');
    });
  });

  describe('3. Active State & Reset', () => {
    it('displays live count "1 professionnel" and resets all filters when clicking Réinitialiser', async () => {
      renderDiscoverView();

      // Set tech sector
      const techPill = await screen.findByTestId('sector-pill-Informatique / Tech');
      fireEvent.click(techPill);

      const liveCount = await screen.findByTestId('discover-live-count');
      expect(liveCount).toHaveTextContent('1 professionnel');

      const resetAllBtn = screen.getByTestId('discover-reset-all-btn');
      fireEvent.click(resetAllBtn);

      await waitFor(() => {
        expect(screen.getByTestId('sector-pill-all')).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('4. Persistence & URL synchronization', () => {
    it('restores stored distance radius on initial render', async () => {
      window.localStorage.setItem(
        'matchy_discover_filters',
        JSON.stringify({
          distanceKm: 25,
        }),
      );

      renderDiscoverView();

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

      expect(screen.getByTestId('discover-filters-count-badge')).toHaveTextContent('1');
    });
  });

  describe('5. Empty State & Expansion', () => {
    it('displays friendly empty state with one-tap radius expansion button when no profiles match', async () => {
      window.localStorage.setItem('matchy_discover_filters', JSON.stringify({ distanceKm: 10 }));

      renderDiscoverView([]);

      const emptyFeed = await screen.findByTestId('discover-empty-feed');
      expect(emptyFeed).toBeInTheDocument();
      expect(
        within(emptyFeed).getByText("Aucun résultat. Essayez d'augmenter le rayon"),
      ).toBeInTheDocument();

      const expandBtn = screen.getByTestId('empty-state-expand-radius-btn');
      expect(expandBtn).toBeInTheDocument();
      fireEvent.click(expandBtn);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/discovery/swipe-feed',
          expect.objectContaining({
            params: expect.objectContaining({
              maxDistanceKm: undefined,
            }),
          }),
        );
      });
    });
  });
});
