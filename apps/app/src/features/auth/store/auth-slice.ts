import { api } from '@/lib/api';
import {
  AUTH_USER_KEY,
  clearAuthSession,
  getRefreshToken,
  persistAuthSession,
  setAccessToken,
} from '@/lib/auth';
import type { RootState } from '@/lib/store';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type {
  AuthState,
  AuthUser,
  ChangePasswordInput,
  ConfirmEmailVerificationInput,
  ConfirmPasswordResetInput,
  ConfirmPhoneLinkInput,
  DeleteAccountInput,
  ExchangeOAuthCodeInput,
  LoginInput,
  LoginPhoneInput,
  RegisterInput,
  RegisterPhoneInput,
  RequestEmailVerificationInput,
  RequestPasswordResetInput,
  RequestPhoneLinkInput,
  SendOtpInput,
  VerifyOtpInput,
} from '../types';

const isClient = typeof window !== 'undefined';

type TokenPairResponse = {
  access_token: string;
  refresh_token?: string;
  user: AuthUser;
};

const initialState: AuthState = {
  loading: false,
  error: null,
  accessToken: isClient ? sessionStorage.getItem('access_token') : null,
  refreshToken: isClient ? getRefreshToken() : null,
  user:
    isClient && sessionStorage.getItem(AUTH_USER_KEY)
      ? JSON.parse(sessionStorage.getItem(AUTH_USER_KEY)!)
      : null,
};

export const login = createAsyncThunk('auth/login', async ({ email, password }: LoginInput) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
});

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password }: RegisterInput) => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },
);

export const sendOtp = createAsyncThunk('auth/sendOtp', async ({ phone }: SendOtpInput) => {
  const response = await api.post<{ message: string; phone: string }>('/auth/otp/send', {
    phone,
  });
  return response.data;
});

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phone, code }: VerifyOtpInput) => {
    const response = await api.post<TokenPairResponse>('/auth/otp/verify', { phone, code });
    return response.data;
  },
);

export const loginPhone = createAsyncThunk(
  'auth/loginPhone',
  async ({ phone, password }: LoginPhoneInput) => {
    const response = await api.post<TokenPairResponse>('/auth/login-phone', { phone, password });
    return response.data;
  },
);

export const registerPhone = createAsyncThunk(
  'auth/registerPhone',
  async ({ phone, password, name, code }: RegisterPhoneInput) => {
    const response = await api.post<TokenPairResponse>('/auth/register-phone', {
      phone,
      password,
      name,
      code,
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

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async () => {
  const response = await api.get<{ user: AuthUser }>('/auth/authcheck');
  return response.data;
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

export const requestEmailVerification = createAsyncThunk(
  'auth/requestEmailVerification',
  async ({ email }: RequestEmailVerificationInput) => {
    const response = await api.post<{ message: string; email: string }>(
      '/auth/email-verification/request',
      { email },
    );
    return response.data;
  },
);

export const confirmEmailVerification = createAsyncThunk(
  'auth/confirmEmailVerification',
  async ({ code }: ConfirmEmailVerificationInput) => {
    const response = await api.post<{ message: string; email: string; emailVerified: boolean }>(
      '/auth/email-verification/confirm',
      { code },
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

// The OAuth callback is a full-page redirect, not a fetch — the exchange response has no
// user object, so we persist the access token immediately (so the follow-up /authcheck
// call authenticates via the request interceptor) and fold both into one payload shaped
// like every other login flow's TokenPairResponse.
export const exchangeOAuthCode = createAsyncThunk(
  'auth/exchangeOAuthCode',
  async ({ code }: ExchangeOAuthCodeInput) => {
    const tokenResponse = await api.post<{ access_token: string; refresh_token: string }>(
      '/auth/oauth/exchange',
      { code },
    );

    setAccessToken(tokenResponse.data.access_token);
    const userResponse = await api.get<{ user: AuthUser }>('/auth/authcheck');

    return {
      access_token: tokenResponse.data.access_token,
      refresh_token: tokenResponse.data.refresh_token,
      user: userResponse.data.user,
    };
  },
);

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const { refreshToken } = (getState() as RootState).auth;
  if (refreshToken) {
    // Best-effort: logout always succeeds locally even if the backend call fails.
    await api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => undefined);
  }
});

function applyTokenPair(state: AuthState, payload: TokenPairResponse) {
  state.accessToken = payload.access_token;
  state.refreshToken = payload.refresh_token ?? state.refreshToken;
  state.user = payload.user;
  persistAuthSession(payload.access_token, payload.user, payload.refresh_token);
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Dispatched by lib/api.ts (via lib/auth-events.ts, to avoid a circular import)
    // when a token refresh fails — clearAuthSession() alone only clears
    // sessionStorage/cookie, it doesn't touch this in-memory Redux state (or its own
    // redux-persist copy), so the UI would otherwise keep rendering as authenticated.
    resetAuthState: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.error = null;
      clearAuthSession();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        login.fulfilled,
        (state, action: PayloadAction<{ access_token: string; user: AuthState['user'] }>) => {
          state.loading = false;
          state.accessToken = action.payload.access_token;
          state.user = action.payload.user;
          if (action.payload.access_token && action.payload.user) {
            persistAuthSession(action.payload.access_token, action.payload.user);
          }
        },
      )
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to login';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to register';
      })
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
      .addCase(verifyOtp.fulfilled, (state, action: PayloadAction<TokenPairResponse>) => {
        state.loading = false;
        applyTokenPair(state, action.payload);
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Invalid or expired code';
      })
      .addCase(loginPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginPhone.fulfilled, (state, action: PayloadAction<TokenPairResponse>) => {
        state.loading = false;
        applyTokenPair(state, action.payload);
      })
      .addCase(loginPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Invalid phone or password';
      })
      .addCase(registerPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerPhone.fulfilled, (state, action: PayloadAction<TokenPairResponse>) => {
        state.loading = false;
        applyTokenPair(state, action.payload);
      })
      .addCase(registerPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to register';
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<{ user: AuthUser }>) => {
        state.user = action.payload.user;
        if (state.accessToken) {
          persistAuthSession(
            state.accessToken,
            action.payload.user,
            state.refreshToken ?? undefined,
          );
        }
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        clearAuthSession();
      })
      .addCase(logout.fulfilled, (state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.error = null;
        clearAuthSession();
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        clearAuthSession();
      })
      .addCase(
        confirmEmailVerification.fulfilled,
        (
          state,
          action: PayloadAction<{ message: string; email: string; emailVerified: boolean }>,
        ) => {
          if (state.user) {
            state.user.email = action.payload.email;
            state.user.email_verified = action.payload.emailVerified;
          }
        },
      )
      .addCase(
        confirmPhoneLink.fulfilled,
        (state, action: PayloadAction<{ message: string; phone: string }>) => {
          if (state.user) {
            state.user.phone = action.payload.phone;
          }
        },
      )
      .addCase(deleteAccount.fulfilled, (state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        clearAuthSession();
      })
      .addCase(exchangeOAuthCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exchangeOAuthCode.fulfilled, (state, action: PayloadAction<TokenPairResponse>) => {
        state.loading = false;
        applyTokenPair(state, action.payload);
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
  isAuthenticated: !!auth.accessToken,
}));

export default authSlice.reducer;
