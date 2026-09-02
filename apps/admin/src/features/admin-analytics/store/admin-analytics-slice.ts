import { adminApi, extractAdminErrorMessage } from '@/lib/admin-api';
import type { RootState } from '@/lib/store';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type { AdminAnalytics, AdminAnalyticsState } from '../types';

const initialState: AdminAnalyticsState = {
  analytics: null,
  loading: false,
  error: null,
};

export const fetchAdminAnalytics = createAsyncThunk(
  'adminAnalytics/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminApi.get('/admin/analytics');
      return response.data.analytics as AdminAnalytics;
    } catch (error) {
      return rejectWithValue(
        extractAdminErrorMessage(error, 'Impossible de charger les analytiques.'),
      );
    }
  },
);

const adminAnalyticsSlice = createSlice({
  name: 'adminAnalytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAdminAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? 'Impossible de charger les analytiques.';
      });
  },
});

export const selectAdminAnalyticsState = (state: RootState) => state.adminAnalytics;

export const selectAdminAnalytics = selectAdminAnalyticsState;

export default adminAnalyticsSlice.reducer;
