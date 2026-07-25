import { api } from '@/lib/api';
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

export const fetchOnboardingProfile = createAsyncThunk('onboarding/fetchProfile', async () => {
  const response = await api.get<OnboardingProfile>('/users/me/profile');
  return response.data;
});

export const updateOnboardingProfile = createAsyncThunk(
  'onboarding/updateProfile',
  async (patch: OnboardingProfilePatch) => {
    const response = await api.patch<OnboardingProfile>('/users/me/profile', patch);
    return response.data;
  },
);

export const completeOnboarding = createAsyncThunk('onboarding/complete', async () => {
  const response = await api.post<OnboardingProfile>('/users/me/profile/complete');
  return response.data;
});

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {},
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

export const selectOnboarding = (state: { onboarding: OnboardingState }) => state.onboarding;

export default onboardingSlice.reducer;
