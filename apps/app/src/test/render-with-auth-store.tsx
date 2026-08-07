import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState } from '@/features/auth/types';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';

const DEFAULT_AUTH_STATE: AuthState = {
  status: 'unknown',
  loading: false,
  error: null,
  user: null,
  // Most callers are testing authenticated-behavior, not the rehydration race itself —
  // default to "checked" so passing status: 'authenticated' alone still behaves as a
  // validated session everywhere else this helper is used. Tests exercising the race
  // pass sessionChecked: false explicitly.
  sessionChecked: true,
  sessionGeneration: 0,
};

export function createAuthTestStore(authState: Partial<AuthState> = {}) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...DEFAULT_AUTH_STATE, ...authState } },
  });
}

export function renderWithAuthStore(ui: ReactElement, authState: Partial<AuthState> = {}) {
  const store = createAuthTestStore(authState);
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}
