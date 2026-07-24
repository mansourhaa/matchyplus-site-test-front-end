import { adminApi } from '@/lib/admin-api';
import type { RootState } from '@/lib/store';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type { AdminPlan, AdminPlanUpdate, AdminPlansState } from '../types';

const initialState: AdminPlansState = {
  plans: [],
  loading: false,
  saving: false,
  error: null,
  savedAt: null,
};

export const fetchAdminPlans = createAsyncThunk('adminPlans/fetch', async () => {
  const response = await adminApi.get('/admin/plans');
  return response.data.plans as AdminPlan[];
});

export const updateAdminPlan = createAsyncThunk(
  'adminPlans/update',
  async ({ id, changes }: { id: AdminPlan['id']; changes: AdminPlanUpdate }) => {
    const response = await adminApi.put(`/admin/plans/${id}`, changes);
    return response.data.plan as AdminPlan;
  },
);

const adminPlansSlice = createSlice({
  name: 'adminPlans',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(fetchAdminPlans.rejected, (state) => {
        state.loading = false;
        state.error = 'Impossible de charger les forfaits.';
      })
      .addCase(updateAdminPlan.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateAdminPlan.fulfilled, (state, action) => {
        state.saving = false;
        state.savedAt = new Date().toISOString();
        state.plans = state.plans.map((plan) =>
          plan.id === action.payload.id ? action.payload : plan,
        );
      })
      .addCase(updateAdminPlan.rejected, (state) => {
        state.saving = false;
        state.error = "Impossible d'enregistrer ce forfait.";
      });
  },
});

export const selectAdminPlansState = (state: RootState) => state.adminPlans;

export const selectAdminPlans = createSelector([selectAdminPlansState], (plans) => plans);

export default adminPlansSlice.reducer;
