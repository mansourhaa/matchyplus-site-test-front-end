import { adminApi } from '@/lib/admin-api';
import { ADMIN_AUTH_USER_KEY, clearAdminSession, persistAdminSession } from '@/lib/admin-auth';
import { api } from '@/lib/api';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type { AdminAuthState, AdminLoginInput, AdminPasswordChangeInput } from '../types';

const isClient = typeof window !== 'undefined';

const initialState: AdminAuthState = {
  loading: false,
  error: null,
  // Only the profile is restored: the session token is an HttpOnly cookie this code cannot
  // read, so "logged in" is tracked by the presence of the admin rather than of a token.
  admin:
    isClient && sessionStorage.getItem(ADMIN_AUTH_USER_KEY)
      ? JSON.parse(sessionStorage.getItem(ADMIN_AUTH_USER_KEY)!)
      : null,
  loginAt: null,
  passwordChangeLoading: false,
  passwordChangeError: null,
};

export const adminLogin = createAsyncThunk(
  'adminAuth/login',
  async ({ email, password }: AdminLoginInput, { rejectWithValue }) => {
    try {
      // `withCredentials` so the browser keeps the HttpOnly session cookie the API sets here.
      const response = await api.post(
        '/auth/admin/login',
        { email, password },
        { withCredentials: true },
      );
      return response.data;
    } catch {
      // The endpoint answers the same way for a bad password and for a valid non-admin
      // account, so there is nothing role-specific to surface here.
      return rejectWithValue('Identifiants incorrects. Vérifiez votre email et mot de passe.');
    }
  },
);

export const changeAdminPassword = createAsyncThunk(
  'adminAuth/changePassword',
  async ({ currentPassword, newPassword }: AdminPasswordChangeInput, { rejectWithValue }) => {
    try {
      // Authenticated admin route: goes through `adminApi` (credentialed, 401 → clear session).
      await adminApi.post('/admin/change-password', { currentPassword, newPassword });
    } catch {
      // The endpoint answers the same way for a wrong password as for any other refusal.
      return rejectWithValue('Mot de passe actuel incorrect.');
    }
  },
);

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    adminLogout(state) {
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
        (state, action: PayloadAction<{ user: AdminAuthState['admin'] }>) => {
          state.loading = false;
          state.admin = action.payload.user;
          state.loginAt = new Date().toISOString();
          if (action.payload.user) {
            persistAdminSession(action.payload.user);
          }
        },
      )
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Identifiants incorrects.';
      })
      .addCase(changeAdminPassword.pending, (state) => {
        state.passwordChangeLoading = true;
        state.passwordChangeError = null;
      })
      .addCase(changeAdminPassword.fulfilled, (state) => {
        state.passwordChangeLoading = false;
        state.passwordChangeError = null;
        state.admin = null;
        state.loginAt = null;
        clearAdminSession();
      })
      .addCase(changeAdminPassword.rejected, (state, action) => {
        state.passwordChangeLoading = false;
        state.passwordChangeError = (action.payload as string) || 'Mot de passe actuel incorrect.';
      });
  },
});

export const { adminLogout, clearAdminError } = adminAuthSlice.actions;

export const selectAdminAuthState = (state: RootState) => state.adminAuth;

export const selectAdminAuth = createSelector([selectAdminAuthState], (adminAuth) => ({
  ...adminAuth,
  isAuthenticated: !!adminAuth.admin,
}));

export default adminAuthSlice.reducer;
