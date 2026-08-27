import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import favoritesReducer, {
  fetchFavoriteIds,
  fetchFavorites,
  removeFavorite,
  toggleFavorite,
} from './favorites-slice';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

function buildStore() {
  return configureStore({ reducer: { favorites: favoritesReducer } });
}

const mockFavoritesListResponse = {
  favorites: [
    {
      id: 'target-1',
      name: 'Alice Dupont',
      job: 'Software Engineer',
      category: 'Tech',
      city: 'Paris',
      bio: 'Fullstack developer',
      image: '/avatar.jpg',
      video: null,
      rating: 4.9,
      reviews: 12,
      profile_type: 'INDIVIDUAL',
      offer_service: true,
      service_type: 'Dev React',
      price: '500€/j',
      experience: '5 ans',
      schedule: 'Full-time',
      languages: ['French', 'English'],
      interests: ['Coding', 'Startups'],
      contact_modes: ['Email'],
      match_score: 92,
      match_type_label: 'Forte compatibilité',
      distance_km: 4.2,
      favorited_at: '2026-08-26T12:00:00.000Z',
    },
  ],
  total: 1,
};

describe('favorites-slice', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetchFavorites populates favorites list and ids from GET /favorites', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockFavoritesListResponse });
    const store = buildStore();

    await store.dispatch(fetchFavorites());

    expect(api.get).toHaveBeenCalledWith('/favorites', { params: undefined });
    expect(store.getState().favorites.favorites).toEqual(mockFavoritesListResponse.favorites);
    expect(store.getState().favorites.favoriteIds).toEqual(['target-1']);
    expect(store.getState().favorites.total).toBe(1);
    expect(store.getState().favorites.loading).toBe(false);
  });

  it('fetchFavoriteIds populates favoriteIds from GET /favorites/ids', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { favoriteIds: ['target-1', 'target-2'] } });
    const store = buildStore();

    await store.dispatch(fetchFavoriteIds());

    expect(api.get).toHaveBeenCalledWith('/favorites/ids');
    expect(store.getState().favorites.favoriteIds).toEqual(['target-1', 'target-2']);
  });

  it('toggleFavorite adds id when favorited is true', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { favorited: true, targetUserId: 'target-99' },
    });
    const store = buildStore();

    await store.dispatch(toggleFavorite('target-99'));

    expect(api.post).toHaveBeenCalledWith('/favorites/target-99');
    expect(store.getState().favorites.favoriteIds).toContain('target-99');
  });

  it('toggleFavorite removes id and item when favorited is false', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockFavoritesListResponse });
    vi.mocked(api.post).mockResolvedValue({
      data: { favorited: false, targetUserId: 'target-1' },
    });
    const store = buildStore();
    await store.dispatch(fetchFavorites());
    expect(store.getState().favorites.favorites).toHaveLength(1);

    await store.dispatch(toggleFavorite('target-1'));

    expect(store.getState().favorites.favoriteIds).not.toContain('target-1');
    expect(store.getState().favorites.favorites).toHaveLength(0);
    expect(store.getState().favorites.total).toBe(0);
  });

  it('removeFavorite removes target from favorites and favoriteIds', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockFavoritesListResponse });
    vi.mocked(api.delete).mockResolvedValue({
      data: { favorited: false, targetUserId: 'target-1' },
    });
    const store = buildStore();
    await store.dispatch(fetchFavorites());

    await store.dispatch(removeFavorite('target-1'));

    expect(api.delete).toHaveBeenCalledWith('/favorites/target-1');
    expect(store.getState().favorites.favoriteIds).not.toContain('target-1');
    expect(store.getState().favorites.favorites).toHaveLength(0);
  });
});
