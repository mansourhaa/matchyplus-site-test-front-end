import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState, AuthUser } from '@/features/auth/types';
import identityVerificationReducer from '@/features/identity-verification/store/identity-verification-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountSettings } from './account-settings';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const baseUser: AuthUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: 'Jane Doe',
  auth_provider: 'phone',
  email_verified: false,
  verified: false,
  onboarding_completed: true,
};

function buildStore(user: AuthUser) {
  const authState: AuthState = {
    status: 'authenticated',
    loading: false,
    error: null,
    sessionChecked: true,
    sessionGeneration: 0,
    user,
  };
  return configureStore({
    reducer: { auth: authReducer, identityVerification: identityVerificationReducer },
    preloadedState: { auth: authState },
  });
}

function renderAccountSettings(user: AuthUser) {
  const store = buildStore(user);
  return { store, ...render(<Provider store={store}>{<AccountSettings />}</Provider>) };
}

describe('AccountSettings — identity verification', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the verified state when User.verified is already true', () => {
    renderAccountSettings({ ...baseUser, verified: true });

    expect(screen.getByText('Identité vérifiée')).toBeInTheDocument();
    expect(screen.getByText('Identité vérifiée ✓')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ouvrir la caméra/ })).not.toBeInTheDocument();
  });

  it('shows the camera capture card when identity is not yet verified', () => {
    renderAccountSettings(baseUser);

    expect(screen.getByText('Vérifier mon identité')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ouvrir la caméra/ })).toBeInTheDocument();
    expect(screen.queryByText('Identité vérifiée ✓')).not.toBeInTheDocument();
  });
});
