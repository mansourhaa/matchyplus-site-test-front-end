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
export const selectOnboarding = (state: { onboarding: OnboardingState }) => state.onboarding;

export default onboardingSlice.reducer;
