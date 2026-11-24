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

function renderDiscoverView(
  initialProfiles: Array<Record<string, unknown>> = [mockFeedProfile],
  plan = 'FREE',
) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/discovery/swipe-feed') {
      return Promise.resolve({
        data: {
          profiles: initialProfiles,
          quota: {
            plan,
            unlimited: plan !== 'FREE',
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
          plan,
          unlimited: plan !== 'FREE',
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
    it('renders the 2.0.8 chips with « Pour vous » selected by default', async () => {
      renderDiscoverView();

      const allPill = await screen.findByTestId('sector-pill-all');
      expect(allPill).toBeInTheDocument();
      expect(allPill).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByTestId('sector-pill-for-you')).toHaveAttribute('aria-selected', 'true');

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

    it('keeps the chips on one row that scrolls on mobile, with « Filtres » outside it', async () => {
      renderDiscoverView();

      const chips = await screen.findByTestId('discover-sector-chips');
      expect(chips.className).toContain('overflow-x-auto');
      expect(chips.className).toContain('md:contents');
      expect(within(chips).getByTestId('sector-pill-for-you')).toBeInTheDocument();
      expect(within(chips).queryByTestId('discover-filters-trigger-btn')).not.toBeInTheDocument();
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

      expect(screen.getByTestId('sector-pill-for-you')).toHaveAttribute('aria-selected', 'true');
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

      // 2.0.8 menu: the 10 onboarding industries, sent as their key
      expect(within(dropdown).getAllByRole('tab')).toHaveLength(10);
      const commerceBtn = within(dropdown).getByTestId('sector-pill-commerce_retail');
      fireEvent.click(commerceBtn);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/discovery/swipe-feed',
          expect.objectContaining({
            params: expect.objectContaining({
              sector: 'commerce_retail',
            }),
          }),
        );
      });
      expect(screen.getByTestId('sector-search-toggle')).not.toHaveTextContent('commerce_retail');

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
    it('displays live count "1 profil" and resets all filters when clicking Réinitialiser', async () => {
      renderDiscoverView();

      // Set tech sector
      const techPill = await screen.findByTestId('sector-pill-Informatique / Tech');
      fireEvent.click(techPill);

      const liveCount = await screen.findByTestId('discover-live-count');
      expect(liveCount).toHaveTextContent('1 profil');

      const resetAllBtn = screen.getByTestId('discover-reset-all-btn');
      fireEvent.click(resetAllBtn);

      await waitFor(() => {
        expect(screen.getByTestId('sector-pill-for-you')).toHaveAttribute('aria-selected', 'true');
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

  describe('6. Home tabs (2.0.8) with the plan locks', () => {
    it('shows the card badges, the locked tabs and the daily limit for a FREE user', async () => {
      renderDiscoverView();

      expect(await screen.findByTestId('discover-card-ai-score')).toHaveTextContent('92%');
      expect(screen.getByTestId('home-tab-feed')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('home-tab-top')).toBeInTheDocument();
      expect(screen.getByTestId('home-tab-liked-me')).toBeInTheDocument();
      expect(screen.getByTestId('discover-quota-banner')).toHaveTextContent('20/20');

      fireEvent.click(screen.getByTestId('discover-go-premium'));
      expect(await screen.findByTestId('swipe-limit-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('swipe-limit-upgrade'));
      expect(pushMock).toHaveBeenCalledWith('/settings/plans');
    });

    it('locks the detailed AI score for FREE and opens it for Premium', async () => {
      const { unmount } = renderDiscoverView();
      expect(await screen.findByTestId('score-details-locked')).toHaveTextContent(
        'Le score détaillé est réservé au Premium',
      );
      unmount();

      renderDiscoverView([mockFeedProfile], 'PREMIUM');
      expect(await screen.findByTestId('discover-card-ai-score')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByTestId('score-details-locked')).not.toBeInTheDocument();
      });
    });

    it("shows the Premium card when a FREE user opens « M'a aimé »", async () => {
      renderDiscoverView([{ ...mockFeedProfile, liked_me: true }]);

      fireEvent.click(await screen.findByTestId('home-tab-liked-me'));

      expect(await screen.findByTestId('discover-plan-lock')).toHaveTextContent('Fonction Premium');
      expect(screen.queryByTestId('discover-card-ai-score')).not.toBeInTheDocument();
    });

    it('loads « Meilleurs choix IA » ranked by AI score and locks the locked profiles', async () => {
      renderDiscoverView([
        { ...mockFeedProfile, id: 'locked-1', name: 'Locked Person', is_locked: true },
      ]);

      fireEvent.click(await screen.findByTestId('home-tab-top'));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/discovery/swipe-feed',
          expect.objectContaining({
            params: expect.objectContaining({ context: 'search', sort: 'match' }),
          }),
        );
      });
      expect(screen.getByTestId('home-tab-top')).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByTestId('discover-plan-lock')).toBeInTheDocument();
    });

    it("shows « M'a aimé » for a paid plan and filters the profiles that liked me", async () => {
      renderDiscoverView(
        [
          { ...mockFeedProfile, id: 'not-liked', name: 'Karim Neutre' },
          { ...mockFeedProfile, id: 'liked', name: 'Rania Fan', liked_me: true },
        ],
        'PREMIUM',
      );

      const likedMe = await screen.findByTestId('home-tab-liked-me');
      expect(screen.queryByTestId('discover-quota-banner')).not.toBeInTheDocument();
      expect(await screen.findByTestId('discover-unlimited-pill')).toBeInTheDocument();
      fireEvent.click(likedMe);

      expect(likedMe).toHaveAttribute('aria-pressed', 'true');
      expect((await screen.findAllByText('Rania Fan')).length).toBeGreaterThan(0);
    });

    it('shows a simple empty state when nobody liked me yet', async () => {
      renderDiscoverView([mockFeedProfile], 'PREMIUM_PLUS');

      fireEvent.click(await screen.findByTestId('home-tab-liked-me'));

      expect(await screen.findByTestId('discover-liked-me-empty')).toBeInTheDocument();
    });
    it('« الكل » loads everyone nearest first and hides the sign-up hint', async () => {
      renderDiscoverView();

      expect(await screen.findByTestId('discover-cold-start')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('sector-pill-all'));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/discovery/swipe-feed',
          expect.objectContaining({ params: expect.objectContaining({ sort: 'distance' }) }),
        );
      });
      expect(screen.getByTestId('sector-pill-all')).toHaveAttribute('aria-selected', 'true');
      expect(screen.queryByTestId('discover-cold-start')).not.toBeInTheDocument();
    });

    it('refreshes the AI picks from their header button', async () => {
      renderDiscoverView();

      const refresh = await screen.findByTestId('ai-picks-refresh');
      const calls = vi.mocked(api.get).mock.calls.length;
      fireEvent.click(refresh);

      await waitFor(() => {
        expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(calls);
      });
    });
  });
});
