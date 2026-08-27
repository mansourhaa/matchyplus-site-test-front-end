import { api, apiErrorKey } from '@/lib/api';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type {
  FavoriteIdsResponse,
  FavoriteProfile,
  FavoriteToggleResponse,
  FavoritesListResponse,
  FavoritesState,
} from '../types';

const initialState: FavoritesState = {
  favorites: [],
  favoriteIds: [],
  total: 0,
  loading: false,
  actionLoading: {},
  error: null,
};

export const fetchFavorites = createAsyncThunk<
  FavoritesListResponse,
  { limit?: number; offset?: number } | undefined,
  { rejectValue: string }
>('favorites/fetchFavorites', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get<FavoritesListResponse>('/favorites', { params });
    return res.data;
  } catch (err: unknown) {
    return rejectWithValue(apiErrorKey(err));
  }
});

export const fetchFavoriteIds = createAsyncThunk<
  FavoriteIdsResponse,
  void,
  { rejectValue: string }
>('favorites/fetchFavoriteIds', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<FavoriteIdsResponse>('/favorites/ids');
    return res.data;
  } catch (err: unknown) {
    return rejectWithValue(apiErrorKey(err));
  }
});

export const toggleFavorite = createAsyncThunk<
  FavoriteToggleResponse,
  string,
  { rejectValue: string }
>('favorites/toggleFavorite', async (targetUserId, { rejectWithValue }) => {
  try {
    const res = await api.post<FavoriteToggleResponse>(`/favorites/${targetUserId}`);
    return res.data;
  } catch (err: unknown) {
    return rejectWithValue(apiErrorKey(err));
  }
});

export const removeFavorite = createAsyncThunk<
  FavoriteToggleResponse,
  string,
  { rejectValue: string }
>('favorites/removeFavorite', async (targetUserId, { rejectWithValue }) => {
  try {
    const res = await api.delete<FavoriteToggleResponse>(`/favorites/${targetUserId}`);
    return res.data;
  } catch (err: unknown) {
    return rejectWithValue(apiErrorKey(err));
  }
});

export const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    clearFavoritesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchFavorites
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action: PayloadAction<FavoritesListResponse>) => {
        state.loading = false;
        state.favorites = action.payload.favorites;
        state.total = action.payload.total;
        state.favoriteIds = action.payload.favorites.map((f) => f.id);
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to load favorites';
      })

      // fetchFavoriteIds
      .addCase(fetchFavoriteIds.fulfilled, (state, action: PayloadAction<FavoriteIdsResponse>) => {
        state.favoriteIds = action.payload.favoriteIds;
      })

      // toggleFavorite
      .addCase(toggleFavorite.pending, (state, action) => {
        state.actionLoading[action.meta.arg] = true;
      })
      .addCase(toggleFavorite.fulfilled, (state, action: PayloadAction<FavoriteToggleResponse>) => {
        delete state.actionLoading[action.payload.targetUserId];
        const { favorited, targetUserId } = action.payload;
        if (favorited) {
          if (!state.favoriteIds.includes(targetUserId)) {
            state.favoriteIds.push(targetUserId);
          }
        } else {
          state.favoriteIds = state.favoriteIds.filter((id) => id !== targetUserId);
          state.favorites = state.favorites.filter((f) => f.id !== targetUserId);
          state.total = Math.max(0, state.total - 1);
        }
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        delete state.actionLoading[action.meta.arg];
        state.error = action.payload ?? 'Failed to toggle favorite';
      })

      // removeFavorite
      .addCase(removeFavorite.pending, (state, action) => {
        state.actionLoading[action.meta.arg] = true;
      })
      .addCase(removeFavorite.fulfilled, (state, action: PayloadAction<FavoriteToggleResponse>) => {
        delete state.actionLoading[action.payload.targetUserId];
        const { targetUserId } = action.payload;
        state.favoriteIds = state.favoriteIds.filter((id) => id !== targetUserId);
        state.favorites = state.favorites.filter((f) => f.id !== targetUserId);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(removeFavorite.rejected, (state, action) => {
        delete state.actionLoading[action.meta.arg];
        state.error = action.payload ?? 'Failed to remove favorite';
      });
  },
});

export const { clearFavoritesError } = favoritesSlice.actions;

export const selectFavorites = (state: RootState): FavoritesState =>
  state.favorites ?? initialState;
export const selectIsFavorited =
  (targetUserId: string) =>
  (state: RootState): boolean =>
    (state.favorites?.favoriteIds ?? []).includes(targetUserId);

export default favoritesSlice.reducer;
