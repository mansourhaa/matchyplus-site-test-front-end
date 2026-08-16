import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState, AuthUser } from '@/features/auth/types';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import identityVerificationReducer from '@/features/identity-verification/store/identity-verification-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  return {
    store,
    ...render(
      <Provider store={store}>
        <I18nProvider>
          <AccountSettings />
        </I18nProvider>
      </Provider>,
    ),
  };
}

describe('AccountSettings — identity verification', () => {
  beforeEach(() => {
    // These tests assert French copy (product default for Tunisian QA).
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('shows the verified state when User.verified is already true', () => {
    renderAccountSettings({ ...baseUser, verified: true });

    expect(screen.getByText('Identité vérifiée')).toBeInTheDocument();
    expect(screen.getByText('Identité vérifiée ✓')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ouvrir la caméra/ })).not.toBeInTheDocument();
  });

  // The camera waits for the latest-job lookup: offering a fresh capture while a
  // verification is still running server-side would queue a redundant second job.
  it('shows the camera capture card once the latest-attempt lookup reports nothing pending', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { job: null, identityVerified: false } });

    renderAccountSettings(baseUser);

    expect(screen.getByText('Vérifier mon identité')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Ouvrir la caméra/ })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/users/me/identity-verification');
    expect(screen.queryByText('Identité vérifiée ✓')).not.toBeInTheDocument();
  });

  it('resumes a verification still running server-side instead of offering the camera again', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        job: {
          id: 'job-1',
          type: 'VERIFY_IDENTITY',
          status: 'RUNNING',
          result: null,
          error: null,
          createdAt: '2026-08-08T19:49:58.000Z',
          updatedAt: '2026-08-08T19:49:58.000Z',
        },
        identityVerified: false,
      },
    });

    renderAccountSettings(baseUser);

    expect(await screen.findByText('Vérification en cours...')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Ouvrir la caméra/ })).not.toBeInTheDocument(),
    );
  });
});
