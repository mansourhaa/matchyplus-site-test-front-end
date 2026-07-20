import {
  ADMIN_AUTH_TOKEN_KEY,
  ADMIN_AUTH_USER_KEY,
  clearAdminSession,
  persistAdminSession,
} from '@/lib/admin-auth';
import { api } from '@/lib/api';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type { AdminAuthState, AdminLoginInput } from '../types';

const isClient = typeof window !== 'undefined';

const initialState: AdminAuthState = {
  loading: false,
  error: null,
  accessToken: isClient ? sessionStorage.getItem(ADMIN_AUTH_TOKEN_KEY) : null,
  admin:
    isClient && sessionStorage.getItem(ADMIN_AUTH_USER_KEY)
      ? JSON.parse(sessionStorage.getItem(ADMIN_AUTH_USER_KEY)!)
      : null,
  loginAt: null,
};

export const adminLogin = createAsyncThunk(
  'adminAuth/login',
  async ({ email, password }: AdminLoginInput, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/admin/login', { email, password });
      return response.data;
    } catch {
      // The endpoint answers the same way for a bad password and for a valid non-admin
      // account, so there is nothing role-specific to surface here.
      return rejectWithValue('Identifiants incorrects. Vérifiez votre email et mot de passe.');
    }
  },
);

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    adminLogout(state) {
      state.accessToken = null;
      state.admin = null;
      state.error = null;
      state.loginAt = null;
      clearAdminSession();
    },
    clearAdminError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        adminLogin.fulfilled,
        (state, action: PayloadAction<{ access_token: string; user: AdminAuthState['admin'] }>) => {
          state.loading = false;
          state.accessToken = action.payload.access_token;
          state.admin = action.payload.user;
          state.loginAt = new Date().toISOString();
          if (action.payload.access_token && action.payload.user) {
            persistAdminSession(action.payload.access_token, action.payload.user);
          }
        },
      )
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Identifiants incorrects.';
      });
  },
});

export const { adminLogout, clearAdminError } = adminAuthSlice.actions;

export const selectAdminAuthState = (state: RootState) => state.adminAuth;

export const selectAdminAuth = createSelector([selectAdminAuthState], (adminAuth) => ({
  ...adminAuth,
  isAuthenticated: !!adminAuth.accessToken,
}));

export default adminAuthSlice.reducer;
