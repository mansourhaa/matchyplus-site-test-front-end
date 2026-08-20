import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthCallback } from './oauth-callback';

const { pushMock, refreshMock, searchParamsRef } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams('code=abc123') },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  getApiErrorCode: (error: unknown) =>
    (error as { response?: { data?: { code?: string } } } | undefined)?.response?.data?.code,
}));

const oauthUser = {
  id: 'user-1',
  email: 'jane@example.com',
  phone: null,
  name: 'Jane Doe',
  auth_provider: 'google',
  email_verified: true,
  verified: false,
  onboarding_completed: true,
};

describe('OAuthCallback', () => {
  beforeEach(() => {
    // These tests assert French copy (product default for Tunisian QA).
    window.localStorage.setItem('matchy_locale', 'fr');
    vi.mocked(api.post).mockResolvedValue({
      data: { access_token: 'access-1', refresh_token: 'refresh-1', user: oauthUser },
    });
    vi.mocked(api.get).mockResolvedValue({ data: { user: oauthUser } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('exchanges the code and routes to the default destination when no next param is present', async () => {
    searchParamsRef.current = new URLSearchParams('code=abc123');

    renderWithAuthStore(<OAuthCallback />);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/oauth/exchange', { code: 'abc123' }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/home'));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('preserves a safe next param after a successful exchange', async () => {
    searchParamsRef.current = new URLSearchParams('code=abc123&next=%2Fmatches');

    renderWithAuthStore(<OAuthCallback />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/matches'));
  });

  it('shows an error and never calls the API when the provider reports an error', async () => {
    searchParamsRef.current = new URLSearchParams('error=access_denied');

    renderWithAuthStore(<OAuthCallback />);

    expect(
      await screen.findByText(
        'Connexion annulée. Vous pouvez réessayer ou utiliser une autre méthode.',
      ),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('maps oauth_invalid_state to a retry-friendly message', async () => {
    searchParamsRef.current = new URLSearchParams('error=oauth_invalid_state');

    renderWithAuthStore(<OAuthCallback />);

    expect(
      await screen.findByText(
        'La session de connexion a expiré. Revenez à la page de connexion et réessayez.',
      ),
    ).toBeInTheDocument();
  });

  it('shows an error when no code is present', async () => {
    searchParamsRef.current = new URLSearchParams();

    renderWithAuthStore(<OAuthCallback />);

    expect(await screen.findByText('Code de connexion manquant.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  // Regression: the redirect from the provider always looks like a success (?code=...) —
  // a banned/inactive account only fails one step later, at the code-exchange call. That
  // rejection used to be swallowed into a generic "try again" message regardless of the
  // real reason, which is actively misleading for a permanent block like a ban.
  it.each([
    ['account_banned', 'Ce compte a été banni.'],
    ['account_inactive', 'Ce compte a été désactivé.'],
  ])('shows a specific message when the exchange rejects with %s', async (code, expected) => {
    searchParamsRef.current = new URLSearchParams('code=abc123');
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true, response: { data: { code } } });

    renderWithAuthStore(<OAuthCallback />);

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
