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
}));

const oauthUser = {
  id: 'user-1',
  email: 'jane@example.com',
  phone: null,
  name: 'Jane Doe',
  auth_provider: 'google',
  email_verified: true,
  onboarding_completed: true,
};

describe('OAuthCallback', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockResolvedValue({
      data: { access_token: 'access-1', refresh_token: 'refresh-1' },
    });
    vi.mocked(api.get).mockResolvedValue({ data: { user: oauthUser } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exchanges the code and routes to the default destination when no next param is present', async () => {
    searchParamsRef.current = new URLSearchParams('code=abc123');

    renderWithAuthStore(<OAuthCallback />);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/oauth/exchange', { code: 'abc123' }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('preserves a safe next param after a successful exchange', async () => {
    searchParamsRef.current = new URLSearchParams('code=abc123&next=%2Fprojects');

    renderWithAuthStore(<OAuthCallback />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/projects'));
  });

  it('shows an error and never calls the API when the provider reports an error', async () => {
    searchParamsRef.current = new URLSearchParams('error=access_denied');

    renderWithAuthStore(<OAuthCallback />);

    expect(
      await screen.findByText(
        'La connexion via ce fournisseur a échoué. Réessayez ou utilisez une autre méthode.',
      ),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows an error when no code is present', async () => {
    searchParamsRef.current = new URLSearchParams();

    renderWithAuthStore(<OAuthCallback />);

    expect(await screen.findByText('Code de connexion manquant.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
