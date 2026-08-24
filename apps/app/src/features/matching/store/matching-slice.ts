import {
  changePassword,
  deleteAccount,
  fetchCurrentUser,
  logout,
  resetAuthState,
} from '@/features/auth/store/auth-slice';
import { api, apiErrorKey } from '@/lib/api';
import type { RootState } from '@/lib/store';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type {
  DiscoveryFeedQuery,
  MatchStateResponse,
  MatchingState,
  SwipeFeedResponse,
  SwipeProfileInput,
  SwipeProfileResult,
  SwipeQuota,
  SwipeResult,
} from '../types';

const initialState: MatchingState = {
  feed: [],
  feedLoading: false,
  feedError: null,
  feedLoaded: false,
  matches: [],
  pending: [],
  matchesLoading: false,
  matchesError: null,
  quota: null,
  quotaLoading: false,
  quotaError: null,
  swipeLoading: false,
  swipeError: null,
  withdrawLoadingId: null,
  celebrationProfile: null,
  showQuotaModal: false,
};

function resetForNewSession(state: MatchingState) {
  Object.assign(state, initialState);
}

export const fetchSwipeFeed = createAsyncThunk(
  'matching/fetchSwipeFeed',
  async (coords: DiscoveryFeedQuery | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get<SwipeFeedResponse>('/discovery/swipe-feed', {
        params: coords,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'matching.errors.feed'));
    }
  },
);

export const fetchQuota = createAsyncThunk(
  'matching/fetchQuota',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<SwipeQuota>('/discovery/quota');
      return response.data;
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'matching.errors.quota'));
    }
  },
);

export const fetchMatchState = createAsyncThunk(
  'matching/fetchMatchState',
  async (_, { rejectWithValue }) => {
    try {
      const [matchesRes, pendingRes] = await Promise.all([
        api.get<{ matches: MatchStateResponse['matches'] }>('/swipe/matches'),
        api.get<{ pending: MatchStateResponse['pending'] }>('/swipe/pending'),
      ]);
      return {
        matches: matchesRes.data.matches ?? [],
        pending: pendingRes.data.pending ?? [],
      } satisfies MatchStateResponse;
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'matching.errors.matches'));
    }
  },
);

export const swipeProfile = createAsyncThunk(
  'matching/swipeProfile',
  async (input: SwipeProfileInput, { rejectWithValue }) => {
    try {
      const response = await api.post<SwipeResult>('/discovery/swipe', {
        target_user_id: input.targetUserId,
        direction: input.direction,
      });
      return {
        ...response.data,
        targetUserId: input.targetUserId,
        direction: input.direction,
        profile: input.profile ?? null,
      } satisfies SwipeProfileResult;
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'matching.errors.swipe'));
    }
  },
);

export const withdrawPending = createAsyncThunk(
  'matching/withdrawPending',
  async (targetUserId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/swipe/pending/${targetUserId}`);
      return { targetUserId };
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'matching.errors.withdraw'));
    }
  },
);

export const unmatchUser = createAsyncThunk(
  'matching/unmatchUser',
  async (targetUserId: string, { rejectWithValue }) => {
    try {
      await api.post(`/swipe/unmatch/${targetUserId}`);
      return { targetUserId };
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'matching.errors.unmatch'));
    }
  },
);

export const blockUser = createAsyncThunk(
  'matching/blockUser',
  async (targetUserId: string, { rejectWithValue }) => {
    try {
      await api.post(`/profiles/${targetUserId}/block`);
      return { targetUserId };
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'matching.errors.block'));
    }
  },
);

export const reportUser = createAsyncThunk(
  'matching/reportUser',
  async (
    { targetUserId, reason, details }: { targetUserId: string; reason: string; details?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.post(`/reports/profiles/${targetUserId}`, { reason, details });
      return response.data;
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'matching.errors.report'));
    }
  },
);

const matchingSlice = createSlice({
  name: 'matching',
  initialState,
  reducers: {
    clearFeed(state) {
      state.feed = [];
      state.feedLoaded = false;
      state.feedError = null;
    },
    clearCelebration(state) {
      state.celebrationProfile = null;
    },
    closeQuotaModal(state) {
      state.showQuotaModal = false;
    },
    clearSwipeError(state) {
      state.swipeError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSwipeFeed.pending, (state) => {
        state.feedLoading = true;
        state.feedError = null;
      })
      .addCase(fetchSwipeFeed.fulfilled, (state, action) => {
        state.feedLoading = false;
        state.feedLoaded = true;
        state.feed = action.payload.profiles ?? [];
        state.quota = action.payload.quota ?? state.quota;
      })
      .addCase(fetchSwipeFeed.rejected, (state, action) => {
        state.feedLoading = false;
        state.feedError = String(action.payload || action.error.message);
      })
      .addCase(fetchQuota.pending, (state) => {
        state.quotaLoading = true;
        state.quotaError = null;
      })
      .addCase(fetchQuota.fulfilled, (state, action) => {
        state.quotaLoading = false;
        state.quota = action.payload;
      })
      .addCase(fetchQuota.rejected, (state, action) => {
        state.quotaLoading = false;
        state.quotaError = String(action.payload || action.error.message);
      })
      .addCase(fetchMatchState.pending, (state) => {
        state.matchesLoading = true;
        state.matchesError = null;
      })
      .addCase(fetchMatchState.fulfilled, (state, action) => {
        state.matchesLoading = false;
        state.matches = action.payload.matches;
        state.pending = action.payload.pending;
      })
      .addCase(fetchMatchState.rejected, (state, action) => {
        state.matchesLoading = false;
        state.matchesError = String(action.payload || action.error.message);
      })
      .addCase(swipeProfile.pending, (state) => {
        state.swipeLoading = true;
        state.swipeError = null;
      })
      .addCase(swipeProfile.fulfilled, (state, action) => {
        state.swipeLoading = false;
        state.quota = action.payload.quota;
        state.feed = state.feed.filter((p) => p.id !== action.payload.targetUserId);
        if (action.payload.match && action.payload.profile) {
          state.celebrationProfile = action.payload.profile;
        }
      })
      .addCase(swipeProfile.rejected, (state, action) => {
        state.swipeLoading = false;
        const key = String(action.payload || action.error.message);
        state.swipeError = key;
        if (key === 'matching.errors.quotaExceeded') {
          state.showQuotaModal = true;
        }
      })
      .addCase(withdrawPending.pending, (state, action) => {
        state.withdrawLoadingId = action.meta.arg;
        state.swipeError = null;
      })
      .addCase(withdrawPending.fulfilled, (state, action) => {
        state.withdrawLoadingId = null;
        state.pending = state.pending.filter(
          (row) => row.profile.id !== action.payload.targetUserId,
        );
      })
      .addCase(withdrawPending.rejected, (state, action) => {
        state.withdrawLoadingId = null;
        state.swipeError = String(action.payload || action.error.message);
      })
      .addCase(unmatchUser.fulfilled, (state, action) => {
        state.matches = state.matches.filter(
          (row) => row.matched_user_id !== action.payload.targetUserId,
        );
      })
      .addCase(unmatchUser.rejected, (state, action) => {
        state.swipeError = String(action.payload || action.error.message);
      })
      .addCase(blockUser.fulfilled, (state, action) => {
        state.matches = state.matches.filter(
          (row) => row.matched_user_id !== action.payload.targetUserId,
        );
      })
      .addCase(blockUser.rejected, (state, action) => {
        state.swipeError = String(action.payload || action.error.message);
      })
      .addCase(logout.fulfilled, resetForNewSession)
      .addCase(resetAuthState, resetForNewSession)
      .addCase(changePassword.fulfilled, resetForNewSession)
      .addCase(deleteAccount.fulfilled, resetForNewSession)
      .addCase(fetchCurrentUser.rejected, resetForNewSession);
  },
});

export const { clearFeed, clearCelebration, closeQuotaModal, clearSwipeError } =
  matchingSlice.actions;

export const selectMatchingState = (state: RootState) => state.matching;

export const selectMatching = selectMatchingState;

export const selectTopFeedProfile = createSelector(
  [selectMatchingState],
  (matching) => matching.feed[0] ?? null,
);

export default matchingSlice.reducer;
