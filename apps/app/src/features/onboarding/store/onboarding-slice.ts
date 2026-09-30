import {
  changePassword,
  deleteAccount,
  logout,
  resetAuthState,
} from '@/features/auth/store/auth-slice';
import { api, getApiErrorCode } from '@/lib/api';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { OnboardingProfile, OnboardingProfilePatch } from '../types';

type OnboardingState = {
  loading: boolean;
  error: string | null;
  profile: OnboardingProfile | null;
};

const initialState: OnboardingState = {
  loading: false,
  error: null,
  profile: null,
};

// Same catch-and-rethrow-a-stable-code pattern as authSlice's loginPhone/registerPhone —
// without it, action.error.message on rejection is axios's generic "Request failed with
// status code ..." instead of the API's actual error code (e.g. onboarding_incomplete).
export const fetchOnboardingProfile = createAsyncThunk('onboarding/fetchProfile', async () => {
  try {
    const response = await api.get<OnboardingProfile>('/users/me/profile', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'onboarding_fetch_failed');
  }
});

export const updateOnboardingProfile = createAsyncThunk(
  'onboarding/updateProfile',
  async (patch: OnboardingProfilePatch) => {
    try {
      const response = await api.patch<OnboardingProfile>('/users/me/profile', patch);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorCode(error) ?? 'onboarding_update_failed');
    }
  },
);

export const completeOnboarding = createAsyncThunk('onboarding/complete', async () => {
  try {
    const response = await api.post<OnboardingProfile>('/users/me/profile/complete');
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorCode(error) ?? 'onboarding_complete_failed');
  }
});

// /inscription is reachable by an anonymous visitor now (identity also collects
// credentials for a fresh phone signup) — without this, a completed profile left over
// from a *previous* session (soft logout via client navigation, no full page reload)
// could bounce a new anonymous signup straight off identity, or pre-fill its fields.
// Deliberately NOT wired to fetchCurrentUser.rejected like notifications' equivalent
// reset: that bootstrap authcheck can still be in flight when a fresh visitor finishes
// phone signup, and a late (correctly stale) rejection must not wipe the profile that
// signup just started building — see the sessionGeneration guard in auth-slice.ts, which
// already prevents that same stale response from clearing the session itself.
function resetForNewSession(state: OnboardingState) {
  state.profile = null;
  state.loading = false;
  state.error = null;
}

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    patchOnboardingProfile: (state, action: PayloadAction<Partial<OnboardingProfile>>) => {
      if (state.profile) Object.assign(state.profile, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout.fulfilled, resetForNewSession)
      .addCase(resetAuthState, resetForNewSession)
      .addCase(changePassword.fulfilled, resetForNewSession)
      .addCase(deleteAccount.fulfilled, resetForNewSession)
      .addCase(fetchOnboardingProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchOnboardingProfile.fulfilled,
        (state, action: PayloadAction<OnboardingProfile>) => {
          state.loading = false;
          state.profile = action.payload;
        },
      )
      .addCase(fetchOnboardingProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load profile';
      })
      .addCase(updateOnboardingProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateOnboardingProfile.fulfilled,
        (state, action: PayloadAction<OnboardingProfile>) => {
          state.loading = false;
          state.profile = action.payload;
        },
      )
      .addCase(updateOnboardingProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save';
      })
      .addCase(completeOnboarding.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeOnboarding.fulfilled, (state, action: PayloadAction<OnboardingProfile>) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(completeOnboarding.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to complete onboarding';
      });
  },
});

export const { patchOnboardingProfile } = onboardingSlice.actions;
export const selectOnboarding = (state: { onboarding?: OnboardingState }) =>
  state.onboarding ?? initialState;

export default onboardingSlice.reducer;
