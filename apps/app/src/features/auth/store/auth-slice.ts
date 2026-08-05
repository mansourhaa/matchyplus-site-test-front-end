import { api, getApiErrorCode } from '@/lib/api';
import { clearAuthSession, getCachedAuthUser, persistAuthUser } from '@/lib/auth';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type {
  AuthState,
  AuthUser,
  ChangePasswordInput,
  ConfirmPasswordResetInput,
  ConfirmPhoneLinkInput,
  DeleteAccountInput,
  ExchangeOAuthCodeInput,
  LoginPhoneInput,
  RegisterPhoneInput,
  RequestPasswordResetInput,
  RequestPhoneLinkInput,
  SendOtpInput,
  VerifyOtpInput,
} from '../types';

type SessionResponse = {
  user: AuthUser;
};

type VerifyOtpResponse = {
  verified: boolean;
  phone: string;
  signupToken: string;
};

const initialState: AuthState = {
  status: 'unknown',
  loading: false,
  error: null,
  user: getCachedAuthUser<AuthUser>(),
  sessionChecked: false,
  sessionGeneration: 0,
};

function currentGeneration(getState: () => unknown): number {
  return (getState() as { auth: AuthState }).auth.sessionGeneration;
}

export const sendOtp = createAsyncThunk('auth/sendOtp', async ({ phone }: SendOtpInput) => {
  const response = await api.post<{ message: string; phone: string }>('/auth/otp/send', {
    phone,
  });
  return response.data;
});

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phone, code }: VerifyOtpInput) => {
    const response = await api.post<VerifyOtpResponse>('/auth/otp/verify', { phone, code });
    return response.data;
  },
);

export const loginPhone = createAsyncThunk(
  'auth/loginPhone',
  async ({ phone, password }: LoginPhoneInput) => {
    try {
      const response = await api.post<SessionResponse>('/auth/login-phone', { phone, password });
      return response.data;
    } catch (error) {
      // Re-thrown as the error's own message so LoginForm can branch on the exact API
      // code (invalid_credentials / oauth_only_account / phone_not_verified) via
      // loginPhone.rejected's action.error.message, instead of axios's generic
      // "Request failed with status code ..." text.
      throw new Error(getApiErrorCode(error) ?? 'invalid_credentials');
    }
  },
);

export const registerPhone = createAsyncThunk(
  'auth/registerPhone',
  async ({ phone, password, name, signupToken }: RegisterPhoneInput) => {
    const response = await api.post<SessionResponse>('/auth/register-phone', {
      phone,
      password,
      name,
      signupToken,
    });
    return response.data;
  },
);

// Reset-flow loading/error is kept local to the screen that uses it (see LoginForm) rather
// than in this slice — it's a small, self-contained mini-flow, not shared app state.
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ phone }: RequestPasswordResetInput) => {
    const response = await api.post<{ message: string; phone: string }>(
      '/auth/password-reset/request',
      { phone },
    );
    return response.data;
  },
);

export const confirmPasswordReset = createAsyncThunk(
  'auth/confirmPasswordReset',
  async ({ phone, code, newPassword }: ConfirmPasswordResetInput) => {
    const response = await api.post<{ message: string }>('/auth/password-reset/confirm', {
      phone,
      code,
      newPassword,
    });
    return response.data;
  },
);

// useBootstrapSession fires this on every page load, unconditionally, before it's known
// whether the visitor even has a valid cookie yet — on /onboarding that request can still
// be in flight when a fresh visitor finishes phone signup. Captures the generation at
// dispatch time and carries it through both outcomes (rejectWithValue, since
// action.error.message can't carry extra data) so a late response can be recognized as
// stale and discarded instead of clobbering whatever session exists by the time it settles.
export const fetchCurrentUser = createAsyncThunk<
  SessionResponse & { generationAtStart: number },
  void,
  { rejectValue: { generationAtStart: number } }
>('auth/fetchCurrentUser', async (_, { getState, rejectWithValue }) => {
  const generationAtStart = currentGeneration(getState);
  try {
    const response = await api.get<SessionResponse>('/auth/authcheck');
    return { ...response.data, generationAtStart };
  } catch {
    return rejectWithValue({ generationAtStart });
  }
});

// Backend revokes all refresh tokens on a successful password change (real "force
// logout"), so we clear the local session too — the user needs to sign in again.
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }: ChangePasswordInput) => {
    const response = await api.post<{ message: string; forceLogout: boolean }>(
      '/auth/change-password',
      { currentPassword, newPassword },
    );
    return response.data;
  },
);

export const requestPhoneLink = createAsyncThunk(
  'auth/requestPhoneLink',
  async ({ phone }: RequestPhoneLinkInput) => {
    const response = await api.post<{ message: string; phone: string }>(
      '/auth/phone-link/request',
      { phone },
    );
    return response.data;
  },
);

export const confirmPhoneLink = createAsyncThunk(
  'auth/confirmPhoneLink',
  async ({ phone, code }: ConfirmPhoneLinkInput) => {
    const response = await api.post<{ message: string; phone: string }>(
      '/auth/phone-link/confirm',
      { phone, code },
    );
    return response.data;
  },
);

export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async ({ confirm, currentPassword, reason }: DeleteAccountInput) => {
    const response = await api.delete<{ message: string }>('/auth/account', {
      data: { confirm, currentPassword, reason },
    });
    return response.data;
  },
);

// The OAuth callback is a full-page redirect — the exchange response already carries the
// user (the API set both session cookies itself via Set-Cookie), so no separate
// /authcheck round-trip is needed here.
export const exchangeOAuthCode = createAsyncThunk(
  'auth/exchangeOAuthCode',
  async ({ code }: ExchangeOAuthCodeInput) => {
    const response = await api.post<SessionResponse>('/auth/oauth/exchange', { code });
    return response.data;
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  // No body: the refresh token to revoke travels as its own HttpOnly cookie. Best-effort —
  // logout always succeeds locally even if the backend call fails.
  await api.post('/auth/logout').catch(() => undefined);
});

function applySession(state: AuthState, user: AuthUser) {
  state.status = 'authenticated';
  state.user = user;
  // Any successful session-establishing action (login, register, OAuth exchange, or the
  // bootstrap authcheck) is just as valid a "we know this session is real" signal as
  // fetchCurrentUser settling — sessionChecked must not stay false (blocking realtime,
  // deep-linked onboarding steps, etc.) until an unrelated bootstrap request also
  // happens to resolve.
  state.sessionChecked = true;
  state.sessionGeneration += 1;
  persistAuthUser(user);
}

function clearSession(state: AuthState) {
  state.status = 'unauthenticated';
  state.user = null;
  state.sessionGeneration += 1;
  clearAuthSession();
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Dispatched by lib/api.ts (via lib/auth-events.ts, to avoid a circular import)
    // when a token refresh fails — clearAuthSession() alone only clears the cached user
    // in sessionStorage, it doesn't touch this in-memory Redux state (or its own
    // redux-persist copy), so the UI would otherwise keep rendering as authenticated.
    resetAuthState: (state) => {
      clearSession(state);
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send code';
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Invalid or expired code';
      })
      .addCase(loginPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginPhone.fulfilled, (state, action: PayloadAction<SessionResponse>) => {
        state.loading = false;
        applySession(state, action.payload.user);
      })
      .addCase(loginPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Invalid phone or password';
      })
      .addCase(registerPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerPhone.fulfilled, (state, action: PayloadAction<SessionResponse>) => {
        state.loading = false;
        applySession(state, action.payload.user);
      })
      .addCase(registerPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to register';
      })
      .addCase(
        fetchCurrentUser.fulfilled,
        (state, action: PayloadAction<SessionResponse & { generationAtStart: number }>) => {
          // A newer session (login/register/OAuth, or another authcheck) already applied
          // while this request was in flight — this response no longer reflects the
          // current session and must not overwrite it.
          if (action.payload.generationAtStart !== state.sessionGeneration) return;
          applySession(state, action.payload.user);
        },
      )
      .addCase(
        fetchCurrentUser.rejected,
        (state, action: PayloadAction<{ generationAtStart: number } | undefined>) => {
          // Same staleness guard as fulfilled — a late 401 reflecting the pre-signup
          // state must not log out a session established since this request started.
          if (!action.payload || action.payload.generationAtStart !== state.sessionGeneration) {
            return;
          }
          clearSession(state);
          state.sessionChecked = true;
        },
      )
      .addCase(logout.fulfilled, (state) => {
        clearSession(state);
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        clearSession(state);
      })
      .addCase(
        confirmPhoneLink.fulfilled,
        (state, action: PayloadAction<{ message: string; phone: string }>) => {
          if (state.user) {
            state.user.phone = action.payload.phone;
          }
        },
      )
      .addCase(deleteAccount.fulfilled, (state) => {
        clearSession(state);
      })
      .addCase(exchangeOAuthCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exchangeOAuthCode.fulfilled, (state, action: PayloadAction<SessionResponse>) => {
        state.loading = false;
        applySession(state, action.payload.user);
      })
      .addCase(exchangeOAuthCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'OAuth sign-in failed';
      });
  },
});

export const { resetAuthState } = authSlice.actions;

export const selectAuthState = (state: RootState) => state.auth;

export const selectAuth = createSelector([selectAuthState], (auth) => ({
  ...auth,
  isAuthenticated: auth.status === 'authenticated',
}));

export default authSlice.reducer;
