import authReducer from '@/features/auth/store/auth-slice';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import identityVerificationReducer, {
  resetIdentityVerification,
} from '@/features/identity-verification/store/identity-verification-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VerifyAccountScreen } from './verify-account-screen';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  };
});

function fakeStream() {
  const track = { stop: vi.fn() };
  return { getTracks: () => [track] } as unknown as MediaStream;
}

function buildStore(preloadedState?: Record<string, unknown>) {
  return configureStore({
    reducer: {
      auth: authReducer,
      identityVerification: identityVerificationReducer,
    },
    preloadedState: preloadedState as never,
  });
}

function renderScreen(store = buildStore()) {
  return render(
    <Provider store={store}>
      <I18nProvider>
        <VerifyAccountScreen />
      </I18nProvider>
    </Provider>,
  );
}

describe('VerifyAccountScreen (VER-001)', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    vi.mocked(api.get).mockResolvedValue({
      data: { job: null, identityVerified: false },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    });
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('renders initial state with open camera button', async () => {
    renderScreen();

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(
      /Protéger votre compte/i,
    );
    expect(screen.getByRole('button', { name: /Ouvrir la caméra/i })).toBeInTheDocument();
  });

  it('renders success state when already verified', async () => {
    const store = buildStore({
      auth: { user: { id: 'user-1', verified: true } },
      identityVerification: {
        restored: true,
        identityVerified: true,
        job: null,
        submitting: false,
        polling: false,
        error: null,
      },
    });

    renderScreen(store);

    expect(screen.getByText(/Votre compte est maintenant vérifié/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Terminer/i })).toBeInTheDocument();
  });

  it('shows error banner and allows retry when verification has failed', async () => {
    const store = buildStore({
      auth: { user: { id: 'user-1', verified: false } },
      identityVerification: {
        restored: true,
        identityVerified: false,
        job: {
          id: 'job-failed',
          status: 'FAILED',
          result: null,
        },
        submitting: false,
        polling: false,
        error: null,
      },
    });

    renderScreen(store);

    expect(screen.getByText(/Échec de la vérification/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Réessayer la vérification/i });
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn).not.toBeDisabled();
  });

  it('shows profile photo required message when API reports profile_photo_required', async () => {
    const store = buildStore({
      auth: { user: { id: 'user-1', verified: false } },
      identityVerification: {
        restored: true,
        identityVerified: false,
        job: null,
        submitting: false,
        polling: false,
        error: 'profile_photo_required',
      },
    });

    renderScreen(store);

    expect(screen.getByText(/Photo de profil requise/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Veuillez d'abord ajouter une photo à votre profil/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Réessayer la vérification/i })).toBeInTheDocument();
  });

  it('resets verification state and opens camera when clicking retry', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });

    const store = buildStore({
      auth: { user: { id: 'user-1', verified: false } },
      identityVerification: {
        restored: true,
        identityVerified: false,
        job: { id: 'job-1', status: 'FAILED' },
        submitting: false,
        polling: false,
        error: 'Échec',
      },
    });

    renderScreen(store);

    const retryBtn = screen.getByRole('button', { name: /Réessayer la vérification/i });
    fireEvent.click(retryBtn);

    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
    });
    // Verifies Redux job is cleared after clicking retry
    expect(store.getState().identityVerification.job).toBeNull();
    expect(store.getState().identityVerification.error).toBeNull();
  });
});
